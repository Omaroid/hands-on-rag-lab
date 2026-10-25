import math
import os
from collections import Counter
from pathlib import Path
from typing import Protocol

from qdrant_client import QdrantClient, models

from lakehouse.models import Chunk, Hit, Product
from lakehouse.text import hash_embedding, tokens


class Embedder(Protocol):
    name: str
    dimensions: int

    def embed(self, texts: list[str], *, query: bool = False) -> list[list[float]]: ...


class HashEmbedder:
    name = "local-hash-384 (baseline non sémantique)"
    dimensions = 384

    def embed(self, texts: list[str], *, query: bool = False) -> list[list[float]]:
        return [hash_embedding(text, self.dimensions) for text in texts]


class Store:
    """Real Qdrant vectors + explicit BM25. Remote writes are ingestion-only."""

    def __init__(
        self,
        chunks: list[Chunk],
        embedder: Embedder | None = None,
        client: QdrantClient | None = None,
        collection: str = "lakehouse_local_v1",
        initialize: bool = True,
    ) -> None:
        self.chunks = chunks
        self.embedder = embedder or HashEmbedder()
        self.client = client or QdrantClient(":memory:")
        self.collection = collection
        if initialize:
            if not self.client.collection_exists(collection):
                self.client.create_collection(
                    collection_name=collection,
                    vectors_config=models.VectorParams(
                        size=self.embedder.dimensions, distance=models.Distance.COSINE
                    ),
                )
            self.upsert_changed(chunks)
        self.docs = [Counter(tokens(c.title + " " + c.text)) for c in chunks]
        self.lengths = [sum(d.values()) for d in self.docs]
        self.avglen = sum(self.lengths) / max(1, len(self.lengths))
        self.df: Counter[str] = Counter()
        for doc in self.docs:
            self.df.update(doc.keys())

    def upsert_changed(self, chunks: list[Chunk]) -> int:
        ids = [c.id for c in chunks]
        existing = self.client.retrieve(self.collection, ids=ids, with_payload=True) if ids else []
        hashes = {str(p.id): (p.payload or {}).get("content_hash") for p in existing}
        changed = [c for c in chunks if hashes.get(c.id) != c.content_hash]
        if changed:
            vectors = self.embedder.embed([c.title + " " + c.text for c in changed])
            self.client.upsert(
                self.collection,
                points=[
                    models.PointStruct(id=c.id, vector=v, payload=c.model_dump())
                    for c, v in zip(changed, vectors, strict=True)
                ],
            )
        return len(changed)

    def dense(self, question: str, products: list[Product], k: int = 12) -> list[Hit]:
        product_filter = (
            models.Filter(
                must=[
                    models.FieldCondition(
                        key="product", match=models.MatchAny(any=[str(p) for p in products])
                    )
                ]
            )
            if products
            else None
        )
        result = self.client.query_points(
            collection_name=self.collection,
            query=self.embedder.embed([question], query=True)[0],
            query_filter=product_filter,
            limit=k,
            with_payload=True,
        )
        return [
            Hit(
                chunk=Chunk.model_validate(p.payload),
                score=p.score,
                rank=i + 1,
                dense_score=p.score,
            )
            for i, p in enumerate(result.points)
            if p.score > 0.05
        ]

    def lexical(self, question: str, products: list[Product], k: int = 12) -> list[Hit]:
        terms = set(tokens(question))
        scores: list[tuple[float, Chunk]] = []
        for chunk, doc, length in zip(self.chunks, self.docs, self.lengths, strict=True):
            if products and chunk.product not in products:
                continue
            score = 0.0
            for term in terms:
                freq = doc[term]
                if freq:
                    idf = math.log(
                        1 + (len(self.chunks) - self.df[term] + 0.5) / (self.df[term] + 0.5)
                    )
                    score += (
                        idf
                        * freq
                        * 2.5
                        / (freq + 1.5 * (0.25 + 0.75 * length / max(self.avglen, 1)))
                    )
            if score > 0:
                scores.append((score, chunk))
        scores.sort(key=lambda pair: (-pair[0], pair[1].id))
        return [
            Hit(chunk=c, score=s, rank=i + 1, lexical_score=s)
            for i, (s, c) in enumerate(scores[:k])
        ]


def reciprocal_rank_fusion(dense: list[Hit], lexical: list[Hit], constant: int = 60) -> list[Hit]:
    if constant < 1:
        raise ValueError("RRF constant must be positive")
    hits: dict[str, Hit] = {}
    for result in [dense, lexical]:
        for hit in result:
            key = hit.chunk.id
            if key not in hits:
                hits[key] = hit.model_copy(update={"score": 0.0})
            merged = hits[key]
            merged.score += 1 / (constant + hit.rank)
            if hit.dense_score is not None:
                merged.dense_score = hit.dense_score
            if hit.lexical_score is not None:
                merged.lexical_score = hit.lexical_score
    ordered = sorted(hits.values(), key=lambda h: (-h.score, h.chunk.id))
    return [h.model_copy(update={"rank": i + 1}) for i, h in enumerate(ordered)]


def rerank(question: str, hits: list[Hit]) -> list[Hit]:
    """Free deterministic coverage reranker, not a neural cross encoder."""
    terms = set(tokens(question))
    ranked = []
    for hit in hits:
        words = set(tokens(hit.chunk.text))
        coverage = len(terms & words) / max(1, len(terms))
        title_coverage = len(terms & set(tokens(hit.chunk.title))) / max(1, len(terms))
        ranked.append(hit.model_copy(update={"rerank_score": coverage + 0.2 * title_coverage}))
    ranked.sort(key=lambda h: (-(h.rerank_score or 0), -h.score, h.chunk.id))
    return [h.model_copy(update={"rank": i + 1}) for i, h in enumerate(ranked)]


def load_chunks(path: Path) -> list[Chunk]:
    import json

    data = json.loads(path.read_text())
    return [Chunk.model_validate(c) for c in data]


def build_store(chunks: list[Chunk]) -> Store:
    from lakehouse.embeddings import MULTILINGUAL_MODEL, configured_embedder

    embedder = configured_embedder()
    url = os.getenv("QDRANT_URL")
    if url:
        collection = os.environ["QDRANT_COLLECTION"]
        if (
            collection.startswith("lakehouse_docs_multilingual_")
            and embedder.name != MULTILINGUAL_MODEL
        ):
            raise ValueError("Semantic collections require the matching multilingual embedder")
        # No startup writes to remote collection; use a read-only cloud API key.
        client = QdrantClient(url=url, api_key=os.getenv("QDRANT_API_KEY"), timeout=5)
        return Store(
            chunks,
            embedder=embedder,
            client=client,
            collection=collection,
            initialize=False,
        )
    return Store(chunks, embedder=embedder)
