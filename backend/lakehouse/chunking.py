import re
from dataclasses import dataclass
from typing import Literal
from uuid import NAMESPACE_URL, uuid5

from lakehouse.models import Chunk, Product
from lakehouse.text import digest


@dataclass(frozen=True)
class ChunkConfig:
    target_tokens: int = 650
    overlap_tokens: int = 75

    def __post_init__(self) -> None:
        if not 64 <= self.target_tokens <= 1000:
            raise ValueError("target_tokens must be 64..1000")
        if not 0 <= self.overlap_tokens < self.target_tokens // 2:
            raise ValueError("overlap must be smaller than half the chunk")


DEFAULT_CHUNK_CONFIG = ChunkConfig()


def split_document(
    text: str,
    *,
    url: str,
    title: str,
    product: Product,
    retrieved_at: str | None,
    language: str = "fr",
    provenance: Literal["editorial", "official"] = "editorial",
    config: ChunkConfig = DEFAULT_CHUNK_CONFIG,
) -> list[Chunk]:
    """Preserve headings and fenced code. Tokens here are conservative character/3 estimates.

    Oversized code blocks are split only if necessary. Section-local ordinals make IDs
    independent of unrelated sections; a content hash drives incremental embeddings.
    """
    sections: list[tuple[list[str], str]] = []
    headings: list[str] = []
    body: list[str] = []
    in_code = False
    for line in text.splitlines():
        if line.startswith("```"):
            in_code = not in_code
        heading = re.match(r"^(#{1,6})\s+(.+)$", line) if not in_code else None
        if heading:
            if body:
                sections.append((headings[:], "\n".join(body).strip()))
                body = []
            depth = len(heading[1])
            headings = headings[: depth - 1] + [heading[2]]
        else:
            body.append(line)
    if body:
        sections.append((headings[:], "\n".join(body).strip()))
    chunks: list[Chunk] = []
    doc_id = str(uuid5(NAMESPACE_URL, url))
    for path, content in sections:
        # Paragraph boundaries include lists and tables as blocks; fenced code remains one block.
        blocks = re.findall(r"```[\s\S]*?```|(?:(?!```)[\s\S])+?(?=\n\s*\n|```|$)", content)
        buf = ""
        local_position = 0
        pieces: list[str] = []
        for block in blocks:
            block = block.strip()
            if not block:
                continue
            while len(block) > config.target_tokens * 3:
                cut = block.rfind(" ", 0, config.target_tokens * 3)
                cut = cut if cut > 0 else config.target_tokens * 3
                pieces.append(block[:cut])
                block = block[max(0, cut - config.overlap_tokens * 3) :]
            if buf and len(buf + block) > config.target_tokens * 3:
                pieces.append(buf)
                buf = buf[-config.overlap_tokens * 3 :] if config.overlap_tokens else ""
            buf = (buf + "\n\n" + block).strip()
        if buf:
            pieces.append(buf)
        for piece in pieces:
            if not piece.strip():
                continue
            section_key = "/".join(path)
            chunk_id = str(uuid5(NAMESPACE_URL, f"{url}#{section_key}:{local_position}"))
            chunks.append(
                Chunk(
                    id=chunk_id,
                    document_id=doc_id,
                    title=title,
                    url=url,
                    product=product,
                    section=path,
                    retrieved_at=retrieved_at,
                    content_hash=digest(piece),
                    language=language,
                    position=local_position,
                    text=piece,
                    provenance=provenance,
                )
            )
            local_position += 1
    return chunks
