"""Offline CLI only. No ingestion route is exposed on the public application."""

import argparse
import ipaddress
import json
import socket
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

import httpx
from lxml import html

from lakehouse.chunking import DEFAULT_CHUNK_CONFIG, ChunkConfig, split_document
from lakehouse.models import Chunk
from lakehouse.text import digest

HOSTS = frozenset({"docs.databricks.com", "learn.microsoft.com", "docs.delta.io"})


def validate_url(url: str) -> str:
    parsed = urlparse(url)
    if (
        parsed.scheme != "https"
        or parsed.hostname not in HOSTS
        or parsed.username
        or parsed.password
    ):
        raise ValueError("URL outside explicit HTTPS allowlist")
    if parsed.port not in (None, 443) or parsed.query or parsed.fragment:
        raise ValueError("Ports, query strings and fragments are forbidden")
    if parsed.hostname == "learn.microsoft.com" and not parsed.path.startswith(
        "/en-us/azure/databricks/"
    ):
        raise ValueError("Only Azure Databricks documentation is allowed on Microsoft Learn")
    return parsed.hostname


def validate_dns(host: str) -> None:
    # Defense in depth against a malicious resolver. Proxy destination policy remains authoritative.
    addresses = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
    if not addresses or any(not ipaddress.ip_address(a[4][0]).is_global for a in addresses):
        raise ValueError("Private or non-global destination refused")


def fetch(client: httpx.Client, url: str, max_bytes: int, *, check_source: bool = True) -> str:
    host = validate_url(url) if check_source else urlparse(url).hostname
    if host not in HOSTS:
        raise ValueError("Host outside allowlist")
    validate_dns(host)
    with client.stream("GET", url, follow_redirects=False) as response:
        response.raise_for_status()
        if 300 <= response.status_code < 400:
            raise ValueError("Redirect refused; explicitly review and configure final source URL")
        data = bytearray()
        for block in response.iter_bytes():
            data.extend(block)
            if len(data) > max_bytes:
                raise ValueError("Source exceeds maximum byte limit")
        return data.decode("utf-8", errors="strict")


def html_to_markdown(raw: str) -> tuple[str, str]:
    tree = html.fromstring(raw)
    for bad in tree.xpath('//script|//style|//nav|//footer|//header|//*[@aria-hidden="true"]'):
        bad.drop_tree()
    main = tree.xpath("//main|//article")
    scope = main[0] if main else tree
    title = " ".join(tree.xpath("//title/text()")) or "Documentation"
    blocks = []
    for element in scope.xpath(".//h1|.//h2|.//h3|.//h4|.//p|.//pre|.//ul|.//ol|.//table"):
        # Only outermost matching block to avoid duplicating list/table paragraphs.
        if any(a.tag in {"pre", "ul", "ol", "table"} for a in element.iterancestors()):
            continue
        text = element.text_content().strip()
        if not text:
            continue
        if element.tag.startswith("h") and element.tag[1:].isdigit():
            text = "#" * int(element.tag[1:]) + " " + text
        elif element.tag == "pre":
            text = "```\n" + text + "\n```"
        elif element.tag == "table":
            text = "\n".join(
                " | ".join(c.text_content().strip() for c in row.xpath("./th|./td"))
                for row in element.xpath(".//tr")
            )
        blocks.append(text)
    return title, "\n\n".join(blocks)


def ingest(
    config_path: Path,
    review_path: Path,
    output: Path,
    chunk_config: ChunkConfig = DEFAULT_CHUNK_CONFIG,
) -> dict[str, Any]:
    config = json.loads(config_path.read_text())
    review = json.loads(review_path.read_text())
    sources = config["sources"]
    if len(sources) > min(config["max_pages"], 50):
        raise ValueError("Too many sources")
    now = datetime.now(UTC)
    previous = (
        [Chunk.model_validate(c) for c in json.loads(output.read_text())] if output.exists() else []
    )
    before = {c.id: c for c in previous}
    result: list[Chunk] = []
    robot_cache: dict[str, RobotFileParser] = {}
    agent = config["user_agent"]
    changed = 0
    with httpx.Client(timeout=httpx.Timeout(15), headers={"User-Agent": agent}) as client:
        for source in sources:
            url = source["url"]
            host = validate_url(url)
            approval = review.get(host, {})
            # A boolean alone isn't proof of terms review: require immutable evidence hash and date.
            if (
                approval.get("status") != "approved"
                or not approval.get("terms_url")
                or not approval.get("evidence_sha256")
            ):
                raise ValueError(f"Terms not reviewed for {host}; ingestion fails closed")
            reviewed = datetime.fromisoformat(approval["reviewed_at"])
            if (now - reviewed).total_seconds() > 30 * 86400 or reviewed > now:
                raise ValueError("Terms review expired or future-dated")
            if host not in robot_cache:
                raw = fetch(client, f"https://{host}/robots.txt", 1000000, check_source=False)
                parser = RobotFileParser()
                parser.parse(raw.splitlines())
                robot_cache[host] = parser
            parser = robot_cache[host]
            if not parser.can_fetch(agent, url):
                raise ValueError(f"robots.txt disallows {url}")
            time.sleep(max(2, config["delay_seconds"], parser.crawl_delay(agent) or 0))
            raw = fetch(client, url, config["max_bytes"])
            title, markdown = html_to_markdown(raw)
            if len(markdown) < 100:
                raise ValueError("Empty or unreadable source")
            chunks = split_document(
                markdown,
                url=url,
                title=title,
                product=source["product"],
                retrieved_at=now.isoformat(),
                language="en",
                provenance="official",
                config=chunk_config,
            )
            for chunk in chunks:
                old = before.get(chunk.id)
                if old and old.content_hash == chunk.content_hash:
                    chunk.retrieved_at = old.retrieved_at
                else:
                    changed += 1
                result.append(chunk)
    # Atomic corpus replacement only after ALL reviews and fetches succeeded.
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_suffix(".tmp")
    temporary.write_text(
        json.dumps([c.model_dump() for c in result], ensure_ascii=False, indent=2) + "\n"
    )
    temporary.replace(output)
    return {
        "documents": len(sources),
        "chunks": len(result),
        "changed": changed,
        "deleted": len(set(before) - {c.id for c in result}),
        "manifest_sha256": digest(output.read_text()),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sources", type=Path, default=Path("config/sources.json"))
    parser.add_argument("--reviews", type=Path, default=Path("config/source-reviews.json"))
    parser.add_argument("--output", type=Path, default=Path("corpus/official.json"))
    parser.add_argument("--tokens", type=int, default=650)
    parser.add_argument("--overlap", type=int, default=75)
    args = parser.parse_args()
    print(
        json.dumps(
            ingest(args.sources, args.reviews, args.output, ChunkConfig(args.tokens, args.overlap)),
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
