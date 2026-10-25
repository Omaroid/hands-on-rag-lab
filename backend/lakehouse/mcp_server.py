"Read-only stdio MCP. Run locally; deliberately not a public unmetered HTTP endpoint."

from typing import Annotated, Any

from mcp.server.mcpserver import MCPServer
from mcp.types import ToolAnnotations
from pydantic import Field

from lakehouse.api import engine
from lakehouse.models import Question

server = MCPServer(
    "Lakehouse RAG Lab", instructions="Read-only evidence retrieval. No URL fetching."
)
READ_ONLY = ToolAnnotations(
    read_only_hint=True, destructive_hint=False, idempotent_hint=True, open_world_hint=False
)
QuestionText = Annotated[str, Field(min_length=8, max_length=1200, strict=True)]


@server.tool(annotations=READ_ONLY)
def search_lakehouse_docs(
    question: QuestionText, top_k: Annotated[int, Field(ge=1, le=6, strict=True)] = 4
) -> list[dict[str, Any]]:
    """Search the fixed local corpus. No fetch or write operation."""
    from lakehouse.retrieval import reciprocal_rank_fusion

    store = engine().store
    results = reciprocal_rank_fusion(store.dense(question, []), store.lexical(question, []))
    return [hit.model_dump() for hit in results[:top_k]]


@server.tool(annotations=READ_ONLY)
def answer_lakehouse_question(question: QuestionText) -> dict[str, Any]:
    """Return an extractive answer or an explicit evidence refusal."""
    return engine().answer(Question(question=question)).model_dump()


@server.tool(annotations=READ_ONLY)
def list_document_sources() -> list[dict[str, Any]]:
    """List only the configured sources; never enumerate files or user input URLs."""
    return [
        {"title": c.title, "url": c.url, "provenance": c.provenance} for c in engine().store.chunks
    ]


if __name__ == "__main__":
    server.run(transport="stdio")
