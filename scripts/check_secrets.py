"""Scan all reachable Git history with a checksum-pinned, redacting Gitleaks binary."""

import hashlib
import json
import platform
import subprocess
import tarfile
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = "8.24.3"
ARCHIVE_SHA256 = "9991e0b2903da4c8f6122b5c3186448b927a5da4deef1fe45271c3793f4ee29c"


def main() -> None:
    if platform.system() != "Linux" or platform.machine() not in {"x86_64", "AMD64"}:
        raise SystemExit(
            "This pinned scanner requires Linux x86_64; run the CI job on other hosts."
        )
    directory = ROOT / "work/security-tools"
    directory.mkdir(parents=True, exist_ok=True)
    archive = directory / f"gitleaks_{VERSION}_linux_x64.tar.gz"
    if not archive.exists() or hashlib.sha256(archive.read_bytes()).hexdigest() != ARCHIVE_SHA256:
        url = f"https://github.com/gitleaks/gitleaks/releases/download/v{VERSION}/{archive.name}"
        with urllib.request.urlopen(url, timeout=60) as response:  # noqa: S310 — fixed HTTPS origin
            data = response.read(32 * 1024 * 1024)
        if hashlib.sha256(data).hexdigest() != ARCHIVE_SHA256:
            raise SystemExit("Scanner archive checksum mismatch; refusing execution.")
        archive.write_bytes(data)
    with tarfile.open(archive) as source:
        member = source.getmember("gitleaks")
        if not member.isfile():
            raise SystemExit("Unexpected scanner archive member.")
        source.extract(member, path=directory, filter="data")
    binary = directory / "gitleaks"
    binary.chmod(0o755)
    report = ROOT / "work/secret-scan-redacted.json"
    result = subprocess.run(  # noqa: S603 — fixed executable verified above, fixed scan arguments
        [
            str(binary),
            "git",
            "--log-opts=--all",
            "--redact=100",
            "--report-format=json",
            f"--report-path={report}",
            "--no-banner",
        ],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode:
        # Never echo matches or the scanner's captured output into CI logs.
        raise SystemExit(f"History secret scan failed. Inspect the redacted local report: {report}")
    findings = json.loads(report.read_text()) if report.exists() else []
    if findings:
        raise SystemExit("History scanner reported findings; publication is blocked.")
    print("Git history: no unreviewed credential findings (default rules + NVIDIA rule).")
    print("Four exact historical fingerprints are reviewed synthetic values/public checksums.")


if __name__ == "__main__":
    main()
