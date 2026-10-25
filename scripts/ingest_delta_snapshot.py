"""Prepare licensed Delta documentation from pinned Git objects, without executing MDX."""

import argparse
import hashlib
import json
import re
import shutil
import subprocess
from datetime import UTC, datetime
from pathlib import Path

from lakehouse.chunking import split_document
from lakehouse.retrieval import load_chunks
from lakehouse.semantic_chunking import rechunk

REVISION = "7c660debfc3ef2dab6006fa012b15a13cd5ffc69"
PREFIX = "docs/src/content/docs/"
PAGES = [
    "index.md",
    "quick-start.mdx",
    "delta-batch.mdx",
    "delta-update.mdx",
    "delta-utility/index.mdx",
    "delta-change-data-feed.mdx",
    "concurrency-control.mdx",
    "optimizations-oss/index.mdx",
    "delta-clustering.mdx",
    "delta-default-columns.mdx",
    "delta-deletion-vectors.mdx",
    "delta-column-mapping.mdx",
    "best-practices.mdx",
    "delta-row-tracking.mdx",
    "delta-drop-feature.mdx",
    "delta-uniform.mdx",
    "versioning.mdx",
    "table-properties.mdx",
    "delta-storage.mdx",
    "delta-type-widening.mdx",
]


def git(repository: Path, *args: str) -> bytes:
    executable = shutil.which("git")
    if executable is None:
        raise FileNotFoundError("Git is required to read pinned source objects")
    return subprocess.run(  # noqa: S603
        [executable, "-C", str(repository), *args], check=True, capture_output=True
    ).stdout


def clean_mdx(raw: str) -> tuple[str, str]:
    """Remove frontmatter/imports and display wrappers; preserve fenced code verbatim."""
    front = re.match(r"\A---\n(.*?)\n---\n", raw, re.S)
    if not front:
        raise ValueError("Expected reviewed document frontmatter")
    title = re.search(r"^title: (.+)$", front[1], re.M)
    if not title:
        raise ValueError("Document title missing")
    lines = []
    in_code = False
    for line in raw[front.end() :].splitlines():
        stripped = line.strip()
        if stripped.startswith("```"):
            in_code = not in_code
        if not in_code and (
            stripped.startswith("import ")
            or re.fullmatch(r"</?(Aside|Tabs|TabItem)(\s[^>]*)?>", stripped)
        ):
            continue
        lines.append(line)
    return title[1].strip("\"'"), "\n".join(lines).strip()


def main() -> None:
    from tokenizers import Tokenizer

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repository", type=Path, required=True)
    parser.add_argument("--model-dir", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path("work/delta-official-semantic.json"))
    parser.add_argument(
        "--manifest", type=Path, default=Path("evidence/delta-source-manifest.json")
    )
    args = parser.parse_args()
    origin = git(args.repository, "remote", "get-url", "origin").decode().strip()
    if origin != "https://github.com/delta-io/delta.git":
        raise ValueError("Expected official Delta repository origin")
    actual = git(args.repository, "rev-parse", "HEAD").decode().strip()
    if actual != REVISION:
        raise ValueError("Source revision differs from reviewed snapshot")
    # Git objects are used, so uncommitted working-tree changes cannot alter the source.
    license_text = git(args.repository, "show", f"{REVISION}:LICENSE.txt")
    if b"Apache License" not in license_text or b"Version 2.0" not in license_text:
        raise ValueError("Expected Apache-2.0 source license")
    notice = git(args.repository, "show", f"{REVISION}:NOTICE.txt")
    records = []
    chunks = []
    retrieved_at = datetime.now(UTC).isoformat()
    for name in PAGES:
        path = PREFIX + name
        raw = git(args.repository, "show", f"{REVISION}:{path}")
        if len(raw) > 1000000:
            raise ValueError("Source exceeds 1 MB bound")
        title, text = clean_mdx(raw.decode())
        url = f"https://github.com/delta-io/delta/blob/{REVISION}/{path}"
        chunks.extend(
            split_document(
                text,
                url=url,
                title=title,
                product="Delta Lake",
                retrieved_at=retrieved_at,
                language="en",
                provenance="official",
            )
        )
        records.append(
            {
                "path": path,
                "url": url,
                "title": title,
                "sha256": hashlib.sha256(raw).hexdigest(),
                "bytes": len(raw),
            }
        )
    tokenizer = Tokenizer.from_file(str(args.model_dir / "tokenizer.json"))
    semantic = rechunk(chunks, tokenizer)
    licenses = Path("corpus/licenses/delta")
    licenses.mkdir(parents=True, exist_ok=True)
    (licenses / "LICENSE.txt").write_bytes(license_text)
    (licenses / "NOTICE.txt").write_bytes(notice)
    (licenses / "MODIFICATIONS.txt").write_text(
        f"Source: https://github.com/delta-io/delta/tree/{REVISION}/docs\n"
        "Modified for retrieval: frontmatter, imports and MDX wrappers removed; "
        "headings split and passages rechunked with a 128-token budget and 16-token overlap.\n"
        "No MDX or documentation code was executed.\n"
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps([c.model_dump() for c in semantic], ensure_ascii=False, indent=2) + "\n"
    )
    # Read the actual saved corpus back through the same strict model as the indexer.
    assert len(load_chunks(args.output)) == len(semantic)
    args.manifest.parent.mkdir(parents=True, exist_ok=True)
    args.manifest.write_text(
        json.dumps(
            {
                "repository": origin,
                "revision": REVISION,
                "retrieved_at": retrieved_at,
                "license": "Apache-2.0",
                "license_sha256": hashlib.sha256(license_text).hexdigest(),
                "notice_sha256": hashlib.sha256(notice).hexdigest(),
                "documents": records,
                "chunks": len(semantic),
                "corpus_sha256": hashlib.sha256(args.output.read_bytes()).hexdigest(),
                "max_tokens": 128,
                "overlap_tokens": 16,
                "network_contacted": False,
                "website_terms_reviews_changed": False,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n"
    )
    print(
        json.dumps({"documents": len(records), "chunks": len(semantic), "output": str(args.output)})
    )


if __name__ == "__main__":
    main()
