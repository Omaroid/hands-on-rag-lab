import json
from datetime import UTC, datetime
from pathlib import Path

import pytest
from lakehouse.ingestion import ingest
from lakehouse.models import Chunk
from lakehouse.text import digest


def test_ingestion_snapshot_incremental_and_failure_closed(tmp_path, monkeypatch):
    url = "https://docs.delta.io/latest/introduction.html"
    config = tmp_path / "sources.json"
    config.write_text(
        json.dumps(
            {
                "sources": [{"url": url, "product": "Delta Lake"}],
                "max_pages": 20,
                "max_bytes": 100000,
                "delay_seconds": 2,
                "user_agent": "LakehouseRAGLab/0.1",
            }
        )
    )
    reviews = tmp_path / "review.json"
    reviews.write_text(
        json.dumps(
            {
                "docs.delta.io": {
                    "status": "approved",
                    "terms_url": "https://docs.delta.io/",
                    "evidence_sha256": digest("fixture review"),
                    "reviewed_at": datetime.now(UTC).isoformat(),
                }
            }
        )
    )
    output = tmp_path / "official.json"
    source = {
        "text": "<title>Delta fixture</title><main><h1>Transactions</h1><p>"
        + "Delta Lake provides ACID transactions with a transaction log. " * 8
        + "</p></main>"
    }

    def fake_fetch(_client, target, _max_bytes, **_kwargs):
        return "User-agent: *\nAllow: /" if target.endswith("robots.txt") else source["text"]

    monkeypatch.setattr("lakehouse.ingestion.fetch", fake_fetch)
    monkeypatch.setattr("lakehouse.ingestion.time.sleep", lambda _: None)
    first = ingest(config, reviews, output)
    first_data = output.read_bytes()
    assert first["changed"] > 0
    assert all(Chunk.model_validate(c).provenance == "official" for c in json.loads(first_data))
    assert ingest(config, reviews, output)["changed"] == 0
    source["text"] = source["text"].replace("ACID transactions", "ACID transactional guarantees")
    assert ingest(config, reviews, output)["changed"] > 0
    preserved = output.read_bytes()
    reviews.write_text("{}")
    with pytest.raises(ValueError, match="Terms not reviewed"):
        ingest(config, reviews, output)
    assert output.read_bytes() == preserved


@pytest.mark.parametrize(
    "url", ["javascript:alert(1)", "https://evil.org/", "https://user@docs.delta.io/"]
)
def test_malicious_citation_metadata_rejected(url):
    from pydantic import ValidationError

    data = json.loads(Path("corpus/editorial.json").read_text())[0]
    data["url"] = url
    with pytest.raises(ValidationError):
        Chunk.model_validate(data)
