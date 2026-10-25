"""The admin CLI must reject unsafe semantic writes before creating a client."""

import sys
from pathlib import Path

import pytest

from scripts import index_qdrant


def test_semantic_collection_rejects_hash_backend_before_remote_access(monkeypatch):
    monkeypatch.setattr(sys, "argv", ["index_qdrant", "--corpus", "corpus/editorial.json"])
    monkeypatch.setenv("QDRANT_URL", "https://dedicated.eu.aws.cloud.qdrant.io:443")
    monkeypatch.setenv("QDRANT_COLLECTION", "lakehouse_docs_multilingual_v1")
    monkeypatch.setenv("QDRANT_PLAN_CONFIRMED_FREE", "true")
    monkeypatch.setenv("EMBEDDING_BACKEND", "local-hash")
    called = []
    monkeypatch.setattr(index_qdrant, "QdrantClient", lambda **kwargs: called.append(kwargs))
    with pytest.raises(ValueError, match="multilingual-minilm"):
        index_qdrant.main()
    assert not called


def test_semantic_collection_rejects_editorial_corpus_before_loading_model(monkeypatch):
    monkeypatch.setattr(sys, "argv", ["index_qdrant", "--corpus", "corpus/editorial.json"])
    monkeypatch.setenv("QDRANT_URL", "https://dedicated.eu.aws.cloud.qdrant.io:443")
    monkeypatch.setenv("QDRANT_COLLECTION", "lakehouse_docs_multilingual_v1")
    monkeypatch.setenv("QDRANT_PLAN_CONFIRMED_FREE", "true")
    monkeypatch.setenv("EMBEDDING_BACKEND", "multilingual-minilm")
    monkeypatch.delenv("EMBEDDING_MODEL_DIR", raising=False)
    assert Path("corpus/editorial.json").exists()
    with pytest.raises(ValueError, match="official"):
        index_qdrant.main()


def test_cloud_store_rejects_hash_queries_against_semantic_collection(monkeypatch):
    from lakehouse import retrieval

    monkeypatch.setenv("QDRANT_URL", "https://dedicated.eu.aws.cloud.qdrant.io:443")
    monkeypatch.setenv("QDRANT_COLLECTION", "lakehouse_docs_multilingual_v1")
    monkeypatch.setenv("EMBEDDING_BACKEND", "local-hash")
    clients = []
    monkeypatch.setattr(retrieval, "QdrantClient", lambda **kwargs: clients.append(kwargs))
    with pytest.raises(ValueError, match="matching multilingual"):
        retrieval.build_store([])
    assert not clients
