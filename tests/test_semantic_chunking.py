import json
from pathlib import Path

import pytest
from lakehouse.models import Chunk
from lakehouse.semantic_chunking import rechunk
from lakehouse.text import digest


def tokenizer():
    package = pytest.importorskip("tokenizers")
    result = package.Tokenizer(
        package.models.WordLevel({"[UNK]": 0, "[CLS]": 1, "[SEP]": 2}, unk_token="[UNK]")
    )
    result.pre_tokenizer = package.pre_tokenizers.Whitespace()
    result.post_processor = package.processors.TemplateProcessing(
        single="[CLS] $A [SEP]", special_tokens=[("[CLS]", 1), ("[SEP]", 2)]
    )
    result.enable_truncation(8)
    return result


def chunk(text, **updates):
    data = json.loads(Path("corpus/editorial.json").read_text())[0]
    data.update(text=text, content_hash=digest(text), title="Unicode é 日本語", **updates)
    return Chunk.model_validate(data)


def test_rechunk_is_exact_bounded_deterministic_and_preserves_provenance():
    source = chunk("".join(f"é 日本語 transaction{i}! " for i in range(100)))
    counter = tokenizer()
    original = counter.to_str()
    pieces = rechunk([source], counter, max_tokens=24, overlap_tokens=3)
    assert counter.to_str() == original
    counter.no_truncation()
    assert len(pieces) > 1
    assert pieces == rechunk([source], counter, max_tokens=24, overlap_tokens=3)
    assert len({c.id for c in pieces}) == len(pieces)
    for piece in pieces:
        assert piece.text in source.text
        assert piece.content_hash == digest(piece.text)
        assert piece.url == source.url
        assert piece.provenance == source.provenance
        assert len(counter.encode(piece.title + " " + piece.text).ids) <= 24
    # Reconstruct with overlaps by offsets in the unmodified source, including all whitespace.
    cursor = 0
    for piece in pieces:
        start = source.text.find(piece.text)
        assert 0 <= start <= cursor
        cursor = max(cursor, start + len(piece.text))
    assert cursor == len(source.text)


def test_no_overlap_retains_all_characters_and_section_positions():
    first = chunk("identifier_without_spaces_é日本語" * 30)
    second = first.model_copy(update={"id": "second", "text": "more text " * 30})
    pieces = rechunk([first, second], tokenizer(), max_tokens=16, overlap_tokens=0)
    assert "".join(p.text for p in pieces) == first.text + second.text
    assert [p.position for p in pieces] == list(range(len(pieces)))


def test_title_exhaustion_and_invalid_budget_fail_closed():
    source = chunk("text")
    with pytest.raises(ValueError, match="Title"):
        rechunk(
            [source.model_copy(update={"title": "word " * 30})],
            tokenizer(),
            max_tokens=16,
            overlap_tokens=3,
        )
    with pytest.raises(ValueError):
        rechunk([source], tokenizer(), max_tokens=128, overlap_tokens=64)
