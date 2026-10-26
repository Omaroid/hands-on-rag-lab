"""Serve the PDF build under its real CSP, with an explicit real-model fixture cache."""

import argparse
import hashlib
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model-dir", type=Path, required=True)
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    model = args.model_dir.resolve()
    manifest = json.loads((ROOT / "evidence/pdf-model-manifest.json").read_text())
    for item in manifest:
        data = (model / item["file"]).read_bytes()
        if hashlib.sha256(data).hexdigest() != item["sha256"]:
            raise ValueError("Model fixture checksum mismatch")
    config = json.loads((ROOT / "vercel.json").read_text())
    csp = config["headers"][0]["headers"][0]["value"]

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *values: object, **kwargs: object) -> None:
            super().__init__(*values, directory=str(ROOT / "frontend/dist"), **kwargs)

        def translate_path(self, path: str) -> str:
            name = unquote(urlsplit(path).path)
            if name in {"/architecture", "/theory"}:
                return str(ROOT / "frontend/dist/index.html")
            prefix = "/_test-model/"
            if name.startswith(prefix):
                target = (model / name[len(prefix) :]).resolve()
                if not target.is_relative_to(model):
                    return str(model / "not-found")
                return str(target)
            return super().translate_path(path)

        def end_headers(self) -> None:
            self.send_header("Content-Security-Policy", csp)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("X-Content-Type-Options", "nosniff")
            super().end_headers()

        def log_message(self, _format: str, *values: object) -> None:
            pass

    print(f"PDF test server: http://localhost:{args.port}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", args.port), Handler).serve_forever()


if __name__ == "__main__":
    main()
