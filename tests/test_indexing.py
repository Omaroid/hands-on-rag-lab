"""The admin CLI must reject unsafe semantic writes before creating a client."""

import sys
from pathlib import Path
from unittest.mock import MagicMock

import pytest
from qdrant_client import models

from scripts import index_qdrant


def test_cloud_product_filter_index_is_created_idempotently():
    client = MagicMock()
    client.get_collection.return_value.payload_schema = {}
    index_qdrant.ensure_product_index(client, "lakehouse_docs_multilingual_v1")
    client.create_payload_index.assert_called_once_with(
        "lakehouse_docs_multilingual_v1",
        field_name="product",
        field_schema=models.PayloadSchemaType.KEYWORD,
        wait=True,
    )
    client.create_payload_index.reset_mock()
    client.get_collection.return_value.payload_schema = {
        "product": models.PayloadIndexInfo(data_type=models.PayloadSchemaType.KEYWORD, points=1)
    }
    index_qdrant.ensure_product_index(client, "lakehouse_docs_multilingual_v1")
    client.create_payload_index.assert_not_called()


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
