from pathlib import Path

import pytest
from lakehouse.models import Chunk
from lakehouse.retrieval import load_chunks
from pydantic import ValidationError

from scripts.ingest_delta_snapshot import clean_mdx


@pytest.fixture
def chunk_data():
    return load_chunks(Path("corpus/editorial.json"))[0].model_dump()


@pytest.mark.parametrize(
    "suffix",
    [
        "/docs/src/content/docs/delta-batch.mdx",
        "/docs/src/content/docs/delta-utility/index.mdx",
    ],
)
def test_allow_immutable_official_delta_citation(chunk_data, suffix):
    url = "https://github.com/delta-io/delta/blob/" + "a" * 40 + suffix
    data = chunk_data | {"url": url}
    assert Chunk.model_validate(data).url == url


@pytest.mark.parametrize(
    "url",
    [
        "https://github.com/attacker/delta/blob/" + "a" * 40 + "/docs/src/content/docs/index.md",
        "https://github.com/delta-io/delta/blob/main/docs/src/content/docs/index.md",
        "https://github.com/delta-io/delta/blob/"
        + "a" * 40
        + "/docs/src/content/docs/index.md?raw=1",
        "https://github.com/delta-io/delta/blob/" + "a" * 40 + "/README.md",
    ],
)
def test_reject_unreviewed_github_citation(chunk_data, url):
    data = chunk_data | {"url": url}
    with pytest.raises(ValidationError):
        Chunk.model_validate(data)


def test_mdx_is_text_and_code_is_preserved():
    title, text = clean_mdx(
        '---\ntitle: "Delta test"\n---\nimport { Tabs } from "untrusted";\n'
        "<Tabs>\n## Evidence\nSome evidence.\n```sql\nSELECT '<Tabs>';\n```\n</Tabs>"
    )
    assert title == "Delta test"
    assert "import " not in text
    assert text.startswith("## Evidence")
    assert "SELECT '<Tabs>';" in text
    assert not text.endswith("</Tabs>")
