"Optional multilingual embeddings; model files must be provisioned explicitly offline."

import os
from pathlib import Path

from lakehouse.retrieval import Embedder, HashEmbedder

# Verified in FastEmbed 0.9.1 supported-model metadata, not invented from memory.
MULTILINGUAL_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"


class EmbeddingInputTooLong(ValueError):
    """A valid HTTP question can still exceed this embedding model's token budget."""


class MultilingualEmbedder:
    name = MULTILINGUAL_MODEL
    dimensions = 384

    def __init__(self, model_directory: Path) -> None:
        from fastembed import TextEmbedding
        from tokenizers import Tokenizer

        if not model_directory.is_dir():
            raise ValueError("Model directory missing; automatic downloads are disabled")
        # Count with the same local tokenizer, without its saved truncation/padding.
        self.tokenizer = Tokenizer.from_file(str(model_directory / "tokenizer.json"))
        self.tokenizer.no_truncation()
        self.tokenizer.no_padding()
        # The upstream sentence-transformer limit is 128, even if ONNX allows more.
        self.model = TextEmbedding(
            model_name=self.name,
            specific_model_path=str(model_directory),
            local_files_only=True,
            threads=2,
            providers=["CPUExecutionProvider"],
        )

    def embed(self, texts: list[str], *, query: bool = False) -> list[list[float]]:
        # Validate the complete batch before any inference, including special tokens.
        if any(len(self.tokenizer.encode(text).ids) > 128 for text in texts):
            raise EmbeddingInputTooLong("This model requires <=128 tokens; rechunk before indexing")
        return [vector.tolist() for vector in self.model.embed(texts)]


def configured_embedder() -> Embedder:
    backend = os.getenv("EMBEDDING_BACKEND", "local-hash")
    if backend == "local-hash":
        return HashEmbedder()
    if backend == "multilingual-minilm":
        return MultilingualEmbedder(Path(os.environ["EMBEDDING_MODEL_DIR"]))
    raise ValueError("Unknown embedding backend; refusing silent fallback")
