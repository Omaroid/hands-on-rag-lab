"""Verify token limits before inference, including special tokens and Unicode."""

import sys
from types import SimpleNamespace

import pytest
from lakehouse.embeddings import MultilingualEmbedder


def make_embedder(tmp_path, monkeypatch):
    tokenizers = pytest.importorskip("tokenizers")
    tokenizer = tokenizers.Tokenizer(
        tokenizers.models.WordLevel(
            {"[UNK]": 0, "[CLS]": 1, "[SEP]": 2, "longword": 3}, unk_token="[UNK]"
        )
    )
    tokenizer.pre_tokenizer = tokenizers.pre_tokenizers.Whitespace()
    tokenizer.post_processor = tokenizers.processors.TemplateProcessing(
        single="[CLS] $A [SEP]", special_tokens=[("[CLS]", 1), ("[SEP]", 2)]
    )
    tokenizer.enable_truncation(128)
    tokenizer.save(str(tmp_path / "tokenizer.json"))
    calls = []

    class Vector:
        def tolist(self):
            return [0.0] * 384

    def infer(texts):
        calls.append(texts)
        return [Vector() for _ in texts]

    monkeypatch.setitem(
        sys.modules,
        "fastembed",
        SimpleNamespace(TextEmbedding=lambda **_: SimpleNamespace(embed=infer)),
    )
    return MultilingualEmbedder(tmp_path), calls


def test_reject_token_overflow_before_any_inference(tmp_path, monkeypatch):
    embedder, calls = make_embedder(tmp_path, monkeypatch)
    with pytest.raises(ValueError, match="128"):
        embedder.embed(["longword", "é " * 127])
    assert calls == []


def test_accept_long_text_that_fits_actual_token_budget(tmp_path, monkeypatch):
    embedder, calls = make_embedder(tmp_path, monkeypatch)
    text = "longword " * 100
    assert len(embedder.embed([text])[0]) == 384
    assert calls == [[text]]


def test_special_tokens_count_toward_limit(tmp_path, monkeypatch):
    embedder, calls = make_embedder(tmp_path, monkeypatch)
    assert len(embedder.embed(["longword " * 126])) == 1
    with pytest.raises(ValueError, match="128"):
        embedder.embed(["longword " * 127], query=True)
    assert len(calls) == 1
