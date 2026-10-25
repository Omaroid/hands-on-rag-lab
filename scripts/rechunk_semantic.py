"""Prepare bounded semantic chunks locally. Does not download, embed or contact Qdrant."""

import argparse
import json
from pathlib import Path

from lakehouse.retrieval import load_chunks
from lakehouse.semantic_chunking import rechunk


def main() -> None:
    from tokenizers import Tokenizer

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--corpus", type=Path, required=True)
    parser.add_argument("--model-dir", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--tokens", type=int, default=128)
    parser.add_argument("--overlap", type=int, default=16)
    args = parser.parse_args()
    if args.output.resolve() == args.corpus.resolve():
        raise ValueError("Keep the source corpus intact; use a separate output file")
    tokenizer = Tokenizer.from_file(str(args.model_dir / "tokenizer.json"))
    chunks = rechunk(
        load_chunks(args.corpus), tokenizer, max_tokens=args.tokens, overlap_tokens=args.overlap
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix(args.output.suffix + ".tmp")
    temporary.write_text(
        json.dumps([c.model_dump() for c in chunks], ensure_ascii=False, indent=2) + "\n"
    )
    temporary.replace(args.output)
    print(
        json.dumps(
            {
                "chunks": len(chunks),
                "max_tokens_including_title": args.tokens,
                "overlap_tokens": args.overlap,
                "network_contacted": False,
                "provenance": sorted({c.provenance for c in chunks}),
            }
        )
    )


if __name__ == "__main__":
    main()
