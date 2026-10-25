import concurrent.futures
import sqlite3
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from lakehouse.api import app, quotas
from lakehouse.embeddings import EmbeddingInputTooLong
from lakehouse.quotas import Limits, QuotaExceeded, Quotas


def test_semantic_token_overflow_returns_actionable_validation_error(client, monkeypatch):
    def answer(_):
        raise EmbeddingInputTooLong("internal model token bound")

    monkeypatch.setattr("lakehouse.api.engine", lambda: SimpleNamespace(answer=answer))
    response = client.post("/api/answer", json={"question": "table " * 150})
    assert response.status_code == 422
    assert "128 tokens" in response.json()["detail"]


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("QUOTA_DB", str(tmp_path / "quota.db"))
    monkeypatch.setenv("ANONYMIZATION_SECRET", "x" * 64)
    monkeypatch.delenv("VERCEL", raising=False)
    monkeypatch.delenv("PUBLIC_SERVERLESS", raising=False)
    quotas.cache_clear()
    yield TestClient(app, raise_server_exceptions=False)
    quotas.cache_clear()


def test_atomic_quota_and_privacy(tmp_path):
    q = Quotas(tmp_path / "quota.db", b"x" * 64, Limits(3, 10, 100, 1000))

    def attempt(_):
        try:
            q.reserve("192.0.2.10", now=1760000000)
            return True
        except QuotaExceeded:
            return False

    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
        assert sum(pool.map(attempt, range(12))) == 3
    assert b"192.0.2.10" not in (tmp_path / "quota.db").read_bytes()
    with sqlite3.connect(tmp_path / "quota.db") as db:
        assert db.execute("SELECT MAX(value) FROM counters").fetchone()[0] == 3


def test_global_and_period_rollover(tmp_path):
    q = Quotas(tmp_path / "quota.db", b"x" * 64, Limits(100, 100, 2, 3))
    q.reserve("a", now=1760000000)
    q.reserve("b", now=1760000000)
    with pytest.raises(QuotaExceeded):
        q.reserve("c", now=1760000000)
    q.reserve("a", now=1760000000 + 86400)
    with pytest.raises(QuotaExceeded):
        q.reserve("a", now=1760000000 + 2 * 86400)


def test_headers_and_strict_body(client):
    r = client.get("/api/health")
    for name in [
        "content-security-policy",
        "strict-transport-security",
        "x-content-type-options",
        "referrer-policy",
        "permissions-policy",
        "x-frame-options",
    ]:
        assert name in r.headers
    assert client.post("/api/answer", json={"question": "small"}).status_code == 422
    assert (
        client.post(
            "/api/answer", content="a" * 9000, headers={"Content-Type": "application/json"}
        ).status_code
        == 413
    )
    assert (
        client.post("/api/answer", content="x", headers={"Content-Type": "text/plain"}).status_code
        == 415
    )
    assert (
        client.post(
            "/api/answer",
            json={"question": "a valid long question"},
            headers={"Origin": "https://evil.org"},
        ).status_code
        == 403
    )


def test_stream_citations_and_no_secret(client):
    r = client.post(
        "/api/stream", json={"question": "Comment Delta Lake fournit des transactions ACID ?"}
    )
    assert r.status_code == 200
    lines = [__import__("json").loads(line) for line in r.text.splitlines()]
    assert lines[0]["type"] == "meta"
    assert lines[-1]["type"] == "done"
    result = lines[-1]["result"]
    assert not result["refused"]
    assert "".join(e["text"] for e in lines if e["type"] == "delta") == result["answer"]
    assert "ANONYMIZATION_SECRET" not in r.text and "SYSTEM_INSTRUCTIONS" not in r.text


def test_quota_failure_is_closed(client, monkeypatch):
    monkeypatch.setenv("PUBLIC_SERVERLESS", "true")
    quotas.cache_clear()
    assert (
        client.post(
            "/api/answer", json={"question": "Comment Delta Lake fournit des transactions ACID ?"}
        ).status_code
        == 503
    )


def test_rate_limit(client):
    for _ in range(6):
        assert (
            client.post(
                "/api/answer",
                json={"question": "Comment Delta Lake fournit des transactions ACID ?"},
            ).status_code
            == 200
        )
    assert (
        client.post(
            "/api/answer", json={"question": "Comment Delta Lake fournit des transactions ACID ?"}
        ).status_code
        == 429
    )
