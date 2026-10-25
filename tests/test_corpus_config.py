import json
from pathlib import Path

import pytest
from lakehouse import api


def test_explicit_corpus_and_missing_file_fail_closed(tmp_path, monkeypatch):
    for name in ("QDRANT_URL", "QDRANT_COLLECTION", "QDRANT_API_KEY", "QDRANT_WRITE_API_KEY"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("EMBEDDING_BACKEND", "local-hash")
    selected = tmp_path / "selected.json"
    data = json.loads(Path("corpus/editorial.json").read_text())[:1]
    selected.write_text(json.dumps(data))
    monkeypatch.setenv("LAKEHOUSE_CORPUS", str(selected))
    api.engine.cache_clear()
    try:
        assert len(api.engine().store.chunks) == 1
        api.engine().store.client.close()
        api.engine.cache_clear()
        selected.unlink()
        with pytest.raises(ValueError, match="missing"):
            api.engine()
    finally:
        api.engine.cache_clear()
