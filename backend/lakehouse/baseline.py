"Run: PYTHONPATH=backend python -m lakehouse.baseline. No LangGraph abstraction."

from pathlib import Path

from lakehouse.chunking import split_document
from lakehouse.generation import SYSTEM_INSTRUCTIONS, ExtractiveGenerator, verify_citations
from lakehouse.text import cosine, hash_embedding


def main() -> None:
    # 1. Load a local document; no arbitrary remote fetch.
    text = Path("corpus/baseline.md").read_text()
    # 2. Deterministic section-aware chunking.
    chunks = split_document(
        text,
        url="https://docs.delta.io/latest/index.html",
        title="Delta Lake — note pédagogique",
        product="Delta Lake",
        retrieved_at=None,
    )
    question = "Comment Delta Lake apporte des transactions ACID ?"
    # 3. Explicit feature embeddings. Hash baseline is not semantic.
    vectors = [hash_embedding(c.text) for c in chunks]
    query = hash_embedding(question)
    # 4. Cosine similarity. 5. Top K.
    ranked = sorted(zip(chunks, vectors, strict=True), key=lambda cv: -cosine(query, cv[1]))[:3]
    # 6. Context. 7. Instructions, question, context remain separate.
    context = [c for c, _ in ranked]
    prompt = {
        "system": SYSTEM_INSTRUCTIONS,
        "question": question,
        "untrusted_context": [{"id": c.id, "text": c.text} for c in context],
    }
    # 8. Extractive answer. 9. Deterministic quotation checks.
    answer, citations = ExtractiveGenerator().generate(prompt["question"], context)  # type: ignore[arg-type]
    if not verify_citations(answer, citations, context):
        raise RuntimeError("Unsupported citation")
    print(answer)
    print("\nSources:", ", ".join(c.url for c in citations))


if __name__ == "__main__":
    main()
