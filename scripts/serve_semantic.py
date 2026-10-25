"""Launch the semantic API locally, with an explicit corpus and no cloud writes."""

import argparse
import os
import shutil
import subprocess
from pathlib import Path

from lakehouse.retrieval import load_chunks


def main() -> None:
    from tokenizers import Tokenizer

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--corpus", type=Path, required=True)
    parser.add_argument("--model-dir", type=Path, required=True)
    parser.add_argument(
        "--cloud", action="store_true", help="Use the configured Free Qdrant index read-only"
    )
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument(
        "--build", action="store_true", help="Build the frontend backend edition first"
    )
    args = parser.parse_args()
    chunks = load_chunks(args.corpus)
    tokenizer = Tokenizer.from_file(str(args.model_dir / "tokenizer.json"))
    tokenizer.no_truncation()
    tokenizer.no_padding()
    if not chunks or any(len(tokenizer.encode(c.title + " " + c.text).ids) > 128 for c in chunks):
        raise ValueError("Require a nonempty corpus rechunked for the model")
    env = os.environ.copy()
    env.pop("QDRANT_WRITE_API_KEY", None)
    if args.cloud:
        if env.get("QDRANT_PLAN_CONFIRMED_FREE") != "true":
            raise ValueError("Free cluster confirmation is required")
        if not env.get("QDRANT_COLLECTION", "").startswith("lakehouse_docs_multilingual_"):
            raise ValueError("Require the dedicated semantic collection")
        if not env.get("QDRANT_URL", "").startswith("https://") or not env.get("QDRANT_API_KEY"):
            raise ValueError("Require HTTPS Qdrant endpoint and read-only service key")
        if any(c.provenance != "official" for c in chunks):
            raise ValueError("Cloud index requires the reviewed official corpus")
    else:
        for key in ("QDRANT_URL", "QDRANT_API_KEY", "QDRANT_COLLECTION"):
            env.pop(key, None)
    env["EMBEDDING_BACKEND"] = "multilingual-minilm"
    env["EMBEDDING_MODEL_DIR"] = str(args.model_dir.resolve())
    env["LAKEHOUSE_CORPUS"] = str(args.corpus.resolve())
    env["APP_ORIGIN"] = f"http://localhost:{args.port}"
    if args.build:
        npm = shutil.which("npm")
        if npm is None:
            raise FileNotFoundError("Install Node/npm first")
        env["VITE_RUNTIME"] = "backend"
        subprocess.run([npm, "run", "build", "--prefix", "frontend"], env=env, check=True)  # noqa: S603
    # Preload and check the actual store before accepting HTTP requests.
    os.environ.update(env)
    for key in ("QDRANT_WRITE_API_KEY",):
        os.environ.pop(key, None)
    if not args.cloud:
        for key in ("QDRANT_URL", "QDRANT_API_KEY", "QDRANT_COLLECTION"):
            os.environ.pop(key, None)
    from lakehouse.api import engine

    store = engine().store
    if args.cloud:
        count = store.client.count(store.collection, exact=True).count
        if count != len(chunks):
            raise ValueError("Cloud index count differs from the configured corpus")
    print(f"Semantic API ready at http://localhost:{args.port}; cloud writes disabled", flush=True)
    import uvicorn

    uvicorn.run(
        "lakehouse.api:app", host="127.0.0.1", port=args.port, access_log=False, proxy_headers=False
    )


if __name__ == "__main__":
    main()
