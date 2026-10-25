"""Offline rechunking with the exact tokenizer; titles count toward the model budget."""

from collections import defaultdict
from typing import TYPE_CHECKING
from uuid import NAMESPACE_URL, uuid5

from lakehouse.models import Chunk
from lakehouse.text import digest

if TYPE_CHECKING:
    from tokenizers import Tokenizer


def rechunk(
    chunks: list[Chunk], tokenizer: "Tokenizer", *, max_tokens: int = 128, overlap_tokens: int = 16
) -> list[Chunk]:
    if not 8 <= max_tokens <= 128 or not 0 <= overlap_tokens < max_tokens // 2:
        raise ValueError("Require 8..128 tokens and overlap smaller than half the budget")
    # A clone keeps the caller's tokenizer settings intact.
    from tokenizers import Tokenizer

    counter = Tokenizer.from_str(tokenizer.to_str())
    counter.no_truncation()
    counter.no_padding()
    positions: defaultdict[tuple[str, tuple[str, ...]], int] = defaultdict(int)
    result = []
    for chunk in chunks:
        prefix = chunk.title + " "
        if len(counter.encode(prefix).ids) >= max_tokens:
            raise ValueError("Title exhausts the model token budget")
        start = 0
        part = 0
        while start < len(chunk.text):
            low, high = 1, len(chunk.text) - start
            fitting = 0
            while low <= high:
                middle = (low + high) // 2
                if (
                    len(counter.encode(prefix + chunk.text[start : start + middle]).ids)
                    <= max_tokens
                ):
                    fitting = middle
                    low = middle + 1
                else:
                    high = middle - 1
            if not fitting:
                raise ValueError("A text fragment cannot fit alongside its title")
            end = start + fitting
            # Prefer a nearby word boundary while preserving every character.
            boundary = chunk.text.rfind(" ", start + fitting // 2, end)
            if end < len(chunk.text) and boundary > start:
                end = boundary + 1
            text = chunk.text[start:end]
            # Token counts need not be monotonic for arbitrary text/tokenizers.
            while len(counter.encode(prefix + text).ids) > max_tokens and text:
                end -= 1
                text = chunk.text[start:end]
            if not text:
                raise ValueError("A text fragment cannot fit alongside its title")
            key = (chunk.document_id, tuple(chunk.section))
            identifier = f"{chunk.id}:tokens:{max_tokens}:{overlap_tokens}:{part}"
            result.append(
                chunk.model_copy(
                    update={
                        "id": str(uuid5(NAMESPACE_URL, identifier)),
                        "text": text,
                        "content_hash": digest(text),
                        "position": positions[key],
                    }
                )
            )
            positions[key] += 1
            part += 1
            if end == len(chunk.text):
                break
            offsets = counter.encode(text, add_special_tokens=False).offsets
            overlap_start = (
                offsets[-overlap_tokens][0]
                if overlap_tokens and len(offsets) > overlap_tokens
                else len(text)
            )
            start = start + overlap_start if overlap_start > 0 else end
    return result
