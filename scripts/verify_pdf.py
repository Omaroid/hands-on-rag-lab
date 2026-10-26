"""Reproduce the public PDF UI tests with real OCR/E5 and no provider credentials."""

import argparse
import http.client
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SUITES = ["pdf.spec.ts", "architecture.spec.ts", "learning.spec.ts", "theory.spec.ts"]


def run_pdf(port: int = 8765, *, build: bool = True) -> None:
    npm = shutil.which("npm")
    if npm is None:
        raise FileNotFoundError("Install Node.js/npm before verifying the PDF application")
    env = {
        key: value
        for key, value in os.environ.items()
        if not (
            key.endswith(("_TOKEN", "_API_KEY", "_SECRET"))
            or key.startswith(("QDRANT_", "NVIDIA_", "VERCEL_", "AI_GATEWAY_"))
        )
    }
    env.update(
        VITE_RUNTIME="browser",
        E2E_PDF="1",
        BASE_URL=f"http://localhost:{port}",
        E2E_REPORT="../work/pdf-verification.json",
    )
    if build:
        subprocess.run(  # noqa: S603 — trusted build script in this repository
            [npm, "run", "build", "--prefix", "frontend"], cwd=ROOT, env=env, check=True
        )
    for script in ["check_bundle.py", "fetch_pdf_model.py"]:
        subprocess.run(  # noqa: S603 — fixed repository scripts
            [sys.executable, str(ROOT / "scripts" / script)], cwd=ROOT, env=env, check=True
        )
    (ROOT / "work").mkdir(exist_ok=True)
    with (ROOT / "work/pdf-test-server.log").open("w") as log:
        server = subprocess.Popen(  # noqa: S603 — fixed local fixture server
            [
                sys.executable,
                str(ROOT / "scripts/serve_pdf_test.py"),
                "--model-dir",
                str(ROOT / "work/e5"),
                "--port",
                str(port),
            ],
            cwd=ROOT,
            env=env,
            stdout=log,
            stderr=log,
        )
        try:
            deadline = time.monotonic() + 30
            while True:
                if server.poll() is not None:
                    raise RuntimeError(
                        "PDF fixture server stopped; inspect work/pdf-test-server.log"
                    )
                connection = http.client.HTTPConnection("127.0.0.1", port, timeout=1)
                try:
                    connection.request("GET", "/")
                    if connection.getresponse().status == 200:
                        break
                except OSError:
                    pass
                finally:
                    connection.close()
                if time.monotonic() >= deadline:
                    raise TimeoutError("Local PDF fixture server did not become ready")
                time.sleep(0.1)
            subprocess.run(  # noqa: S603 — fixed suites; no shell or production credentials
                [
                    npm,
                    "run",
                    "test:e2e",
                    "--prefix",
                    "frontend",
                    "--",
                    *SUITES,
                    "--output=../work/pdf-test-results",
                ],
                cwd=ROOT,
                env=env,
                check=True,
            )
        finally:
            server.terminate()
            try:
                server.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server.kill()
                server.wait(timeout=5)
    print(
        "PDF verification passed: actual PDF/OCR/E5, UI generation mocks, no live provider calls."
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument(
        "--skip-build", action="store_true", help="Use an already verified PDF build"
    )
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535:
        parser.error("Use an unprivileged local test port")
    run_pdf(args.port, build=not args.skip_build)


if __name__ == "__main__":
    main()
