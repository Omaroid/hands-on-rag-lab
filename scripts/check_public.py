"""Check public routes, favicon, security headers and API rejection without NVIDIA calls."""

import argparse
import concurrent.futures
import datetime
import hashlib
import json
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAX_RESPONSE = 40 * 1024 * 1024


def fetch(url: str, *, body: bytes | None = None) -> tuple[int, dict[str, str], bytes]:
    headers = {"User-Agent": "Source-public-verification/1.0"}
    if body is not None:
        parsed = urllib.parse.urlsplit(url)
        headers.update(
            {"Content-Type": "application/json", "Origin": f"{parsed.scheme}://{parsed.netloc}"}
        )
    request = urllib.request.Request(url, data=body, headers=headers)  # noqa: S310 — HTTPS origin validated in main
    try:
        response = urllib.request.urlopen(request, timeout=45)  # noqa: S310 — operator HTTPS target
    except urllib.error.HTTPError as error:
        response = error
    with response:
        data = response.read(MAX_RESPONSE + 1)
        if len(data) > MAX_RESPONSE:
            raise ValueError("Public response exceeded verification bounds")
        return response.code, {k.lower(): v for k, v in response.headers.items()}, data


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="https://hands-on-rag-lab.vercel.app")
    parser.add_argument("--compare-dist", action="store_true")
    parser.add_argument("--expect-generation-ready", action="store_true")
    args = parser.parse_args()
    parsed = urllib.parse.urlsplit(args.url)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        parser.error("Use an explicit HTTPS site URL without credentials")
    if parsed.path not in {"", "/"} or parsed.query or parsed.fragment:
        parser.error("Use the site origin only")
    base = args.url.rstrip("/")
    code, headers, html = fetch(base + "/")
    if code != 200 or b'id="root"' not in html:
        raise SystemExit("Public application HTML is unavailable")
    config = json.loads((ROOT / "vercel.json").read_text())
    expected = {h["key"].lower(): h["value"] for h in config["headers"][0]["headers"]}
    for name, value in expected.items():
        if headers.get(name) != value:
            raise SystemExit(f"Security header mismatch: {name}")
    routes = {}
    for route in ["/theory", "/architecture"]:
        status, _, content = fetch(base + route)
        if status != 200 or content != html:
            raise SystemExit(f"Application route mismatch: {route}")
        routes[route] = status
    icon_status, icon_headers, icon = fetch(base + "/favicon.svg")
    if (
        icon_status != 200
        or "image/svg+xml" not in icon_headers.get("content-type", "")
        or icon != (ROOT / "frontend/public/favicon.svg").read_bytes()
        or b'href="/favicon.svg"' not in html
    ):
        raise SystemExit("The public favicon does not match this repository")
    status_code, _, status_body = fetch(base + "/api/ai/status")
    readiness = json.loads(status_body) if status_code == 200 else {}
    if type(readiness.get("ready")) is not bool:
        raise SystemExit("API readiness response is invalid")
    if args.expect_generation_ready and not readiness["ready"]:
        raise SystemExit("Production generation configuration is not ready")
    # Missing consent/context is rejected before any provider invocation.
    invalid_code, _, _ = fetch(base + "/api/ai/answer", body=b'{"question":"test","consent":false}')
    if invalid_code != (422 if readiness["ready"] else 503):
        raise SystemExit("Invalid generation input was not rejected as expected")
    assets = []
    if args.compare_dist:
        dist = ROOT / "frontend/dist"
        if not dist.is_dir():
            raise SystemExit("Build the PDF application before comparing public assets")
        if html != (dist / "index.html").read_bytes():
            raise SystemExit("Public HTML differs from the local build")
        paths = [p for p in dist.rglob("*") if p.is_file() and not p.is_symlink()]

        def compare(path: Path) -> dict[str, str | int]:
            name = "/" + path.relative_to(dist).as_posix()
            status, _, data = fetch(base + name)
            actual = hashlib.sha256(data).hexdigest()
            if status != 200 or actual != hashlib.sha256(path.read_bytes()).hexdigest():
                raise ValueError(f"Public asset differs: {name}")
            return {"path": name, "bytes": len(data), "sha256": actual}

        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
            assets = list(pool.map(compare, paths))
    result = {
        "checked_at": datetime.datetime.now(datetime.UTC).isoformat(),
        "site": base,
        "routes": routes,
        "security_headers_match": True,
        "favicon": {"http": icon_status, "sha256": hashlib.sha256(icon).hexdigest()},
        "generation_ready": readiness["ready"],
        "invalid_request_http": invalid_code,
        "live_provider_calls": 0,
        "assets": assets,
    }
    output = ROOT / "work/public-smoke.json"
    output.parent.mkdir(exist_ok=True)
    output.write_text(json.dumps(result, indent=2) + "\n")
    print(f"Public smoke passed: routes, headers, favicon, API; {len(assets)} assets compared.")
    print("No NVIDIA request was launched. Report: work/public-smoke.json")


if __name__ == "__main__":
    main()
