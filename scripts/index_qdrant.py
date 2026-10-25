"""Admin ingestion command only; never import from a public request handler."""

import argparse
import os
from pathlib import Path
from urllib.parse import urlparse

from lakehouse.embeddings import configured_embedder
from lakehouse.retrieval import Store, load_chunks
from qdrant_client import QdrantClient, models


def ensure_product_index(client: QdrantClient, collection: str) -> None:
    # Cloud Free strict mode refuses filtered searches without a keyword payload index.
    schema = client.get_collection(collection).payload_schema
    if "product" not in schema:
        client.create_payload_index(
            collection,
            field_name="product",
            field_schema=models.PayloadSchemaType.KEYWORD,
            wait=True,
        )
    elif schema["product"].data_type != models.PayloadSchemaType.KEYWORD:
        raise ValueError("Product filter requires a keyword payload index")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--corpus", type=Path, default=Path("corpus/official.json"))
    parser.add_argument(
        "--prune", action="store_true", help="Delete stale IDs in this dedicated collection"
    )
    args = parser.parse_args()
    url = os.getenv("QDRANT_URL", "http://localhost:6333")
    parsed = urlparse(url)
    if parsed.hostname not in {"localhost", "127.0.0.1", "qdrant"}:
        if parsed.scheme != "https" or os.getenv("QDRANT_PLAN_CONFIRMED_FREE") != "true":
            raise RuntimeError(
                "Confirm isolated Free Tier cluster in the dashboard before remote writes"
            )
    collection = os.getenv("QDRANT_COLLECTION", "lakehouse_rag_lab_v1")
    if not collection.startswith("lakehouse_"):
        raise ValueError("Only dedicated lakehouse_ collections may be modified")
    if collection.startswith("lakehouse_docs_multilingual_"):
        if os.getenv("EMBEDDING_BACKEND") != "multilingual-minilm":
            raise ValueError("Semantic collections require EMBEDDING_BACKEND=multilingual-minilm")
    chunks = load_chunks(args.corpus)
    if collection.startswith("lakehouse_docs_multilingual_") and (
        not chunks or any(chunk.provenance != "official" for chunk in chunks)
    ):
        raise ValueError("Semantic collections require a nonempty reviewed official corpus")
    embedder = configured_embedder()
    client = QdrantClient(url=url, api_key=os.getenv("QDRANT_WRITE_API_KEY"), timeout=10)
    store = Store(
        chunks,
        client=client,
        embedder=embedder,
        collection=collection,
        initialize=False,
    )
    if not client.collection_exists(collection):
        client.create_collection(
            collection,
            vectors_config=models.VectorParams(
                size=store.embedder.dimensions, distance=models.Distance.COSINE
            ),
        )
    ensure_product_index(client, collection)
    changed = store.upsert_changed(chunks)
    removed = 0
    if args.prune:
        allowed = {c.id for c in chunks}
        offset = None
        while True:
            points, offset = client.scroll(collection, limit=100, offset=offset, with_payload=False)
            stale = [p.id for p in points if str(p.id) not in allowed]
            if stale:
                client.delete(collection, points_selector=models.PointIdsList(points=stale))
                removed += len(stale)
            if offset is None:
                break
    print(f"{changed} chunks embedded/upserted; {removed} stale chunks removed")


if __name__ == "__main__":
    main()
