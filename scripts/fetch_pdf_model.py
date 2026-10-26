"""Fetch only the pinned PDF search encoder, verifying committed lengths and SHA-256."""

import hashlib
import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REVISION = "761b726dd34fb83930e26aab4e9ac3899aa1fa78"


def main() -> None:
    manifest = json.loads((ROOT / "evidence/pdf-model-manifest.json").read_text())
    base = ROOT / "work/e5"
    for entry in manifest:
        target = base / entry["file"]
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest() == entry["sha256"]:
            continue
        url = (
            "https://huggingface.co/Xenova/multilingual-e5-small/resolve/"
            f"{REVISION}/{entry['file']}"
        )
        temporary = target.with_suffix(target.suffix + ".partial")
        digest = hashlib.sha256()
        count = 0
        try:
            with (
                urllib.request.urlopen(url, timeout=90) as response,  # noqa: S310 — fixed HTTPS model URL
                temporary.open("wb") as output,
            ):
                while part := response.read(1024 * 1024):
                    count += len(part)
                    if count > entry["bytes"]:
                        raise ValueError("Model file larger than the pinned manifest")
                    digest.update(part)
                    output.write(part)
            if count != entry["bytes"] or digest.hexdigest() != entry["sha256"]:
                raise ValueError("Model checksum mismatch")
            temporary.replace(target)
            print(f"Verified {entry['file']}: {count} bytes")
        finally:
            temporary.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
