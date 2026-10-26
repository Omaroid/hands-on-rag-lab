"""Build and verify both web runtimes against isolated local test servers."""

import argparse
import os
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]


def run_runtime(runtime: str, port: int) -> None:
    # Test-only process configuration: never connect these tests to the user's cloud database.
    npm = shutil.which("npm")
    if npm is None:
        raise FileNotFoundError("Install Node.js/npm before running browser verification")
    env = os.environ.copy()
    for name in (
        "QDRANT_URL",
        "QDRANT_API_KEY",
        "QDRANT_WRITE_API_KEY",
        "QDRANT_COLLECTION",
        "EMBEDDING_MODEL_DIR",
        "VERCEL",
        "PUBLIC_SERVERLESS",
        "LAKEHOUSE_ROOT",
        "BASE_URL",
        "VITE_RUNTIME",
        "NVIDIA_API_KEY",
        "NVIDIA_INFERENCE_ENABLED",
        "AI_GATEWAY_API_KEY",
    ):
        env.pop(name, None)
    env["EMBEDDING_BACKEND"] = "local-hash"
    env["LAKEHOUSE_E2E_LOCAL"] = "1"
    env["VITE_RUNTIME"] = runtime
    origin = f"http://localhost:{port}"
    env["APP_ORIGIN"] = origin
    env["BASE_URL"] = origin
    env["E2E_REPORT"] = f"../evidence/playwright-{runtime}.json"
    env["PYTHONPATH"] = str(ROOT / "backend")
    subprocess.run([npm, "run", "build", "--prefix", "frontend"], cwd=ROOT, env=env, check=True)  # noqa: S603
    subprocess.run([sys.executable, "scripts/check_bundle.py"], cwd=ROOT, env=env, check=True)  # noqa: S603
    (ROOT / "work").mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=f"e2e-{runtime}-", dir=ROOT / "work") as temporary:
        env["QUOTA_DB"] = str(Path(temporary) / "quotas.sqlite")
        with (ROOT / "work" / f"e2e-{runtime}-server.log").open("w") as log:
            command = [
                sys.executable,
                "-m",
                "uvicorn",
                "e2e_server:app",
                "--app-dir",
                str(ROOT / "tests"),
                "--host",
                "127.0.0.1",
                "--port",
                str(port),
                "--no-access-log",
                "--no-proxy-headers",
            ]
            server = subprocess.Popen(command, cwd=ROOT, env=env, stdout=log, stderr=log)  # noqa: S603
            try:
                # Localhost probes only. Cloud traffic still uses the inherited proxy elsewhere.
                with httpx.Client(trust_env=False, timeout=1) as client:
                    deadline = time.monotonic() + 20
                    while True:
                        if server.poll() is not None:
                            raise RuntimeError(
                                f"{runtime} test server stopped; see local server log"
                            )
                        try:
                            response = client.get(f"http://127.0.0.1:{port}/api/health")
                            if response.status_code == 200:
                                break
                        except httpx.HTTPError:
                            pass
                        if time.monotonic() >= deadline:
                            raise TimeoutError(f"{runtime} test server did not become ready")
                        time.sleep(0.1)
                subprocess.run(  # noqa: S603
                    [npm, "run", "test:e2e", "--prefix", "frontend", "--", "app.spec.ts"],
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


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--runtime", choices=["backend", "browser", "both"], default="both")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    runtimes = ["backend", "browser"] if args.runtime == "both" else [args.runtime]
    for index, runtime in enumerate(runtimes):
        if runtime == "browser":
            from verify_pdf import run_pdf

            run_pdf(args.port + index)
        else:
            run_runtime(runtime, args.port + index)
    print("All requested local web runtimes passed.")


if __name__ == "__main__":
    main()
