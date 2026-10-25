import re
from typing import Literal
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, field_validator

Product = Literal["Databricks", "Unity Catalog", "Delta Lake", "Azure", "Gouvernance"]
Mode = Literal["lexical", "dense", "hybrid", "hybrid_rerank"]


class Question(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    question: str = Field(min_length=8, max_length=1200)
    mode: Mode = "hybrid"
    products: list[Product] = Field(default_factory=list, max_length=5)
    top_k: int = Field(default=4, ge=1, le=6)


class Chunk(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    document_id: str
    title: str
    url: str
    product: Product
    section: list[str]
    retrieved_at: str | None
    content_hash: str
    language: str
    position: int
    text: str = Field(max_length=16000)
    provenance: Literal["editorial", "official"] = "editorial"

    @field_validator("url")
    @classmethod
    def safe_citation_url(cls, value: str) -> str:
        parsed = urlparse(value)
        allowed = {"docs.databricks.com", "learn.microsoft.com", "docs.delta.io"}
        pinned_delta = parsed.hostname == "github.com" and re.fullmatch(
            r"/delta-io/delta/blob/[0-9a-f]{40}/docs/src/content/docs/[a-z0-9/-]+\.mdx?",
            parsed.path,
        )
        if parsed.scheme != "https" or (parsed.hostname not in allowed and not pinned_delta):
            raise ValueError("Citation must use an official HTTPS host")
        if parsed.username or parsed.password or parsed.port not in (None, 443):
            raise ValueError("Unsafe citation authority")
        if pinned_delta and (parsed.query or parsed.fragment):
            raise ValueError("Pinned source citations cannot contain query or fragment")
        return value


class Hit(BaseModel):
    chunk: Chunk
    score: float
    rank: int
    dense_score: float | None = None
    lexical_score: float | None = None
    rerank_score: float | None = None


class Citation(BaseModel):
    id: str
    title: str
    url: str
    quote: str
    provenance: str


class Answer(BaseModel):
    question_normalized: str
    mode: Mode
    answer: str
    refused: bool
    reason: str | None
    citations: list[Citation]
    dense: list[Hit]
    lexical: list[Hit]
    fused: list[Hit]
    reranked: list[Hit]
    context: list[Chunk]
    stages: list[str]
    latency_ms: float
    generation: str
    embedding: str
    input_tokens: int | None = None
    output_tokens: int | None = None
    cost_eur: float = 0
    cache_hit: bool = False
