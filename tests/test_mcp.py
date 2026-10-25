import asyncio

from lakehouse.mcp_server import server


def test_mcp_read_only_schema():
    tools = asyncio.run(server.list_tools())
    assert {tool.name for tool in tools} == {
        "search_lakehouse_docs",
        "answer_lakehouse_question",
        "list_document_sources",
    }
    for tool in tools:
        assert tool.annotations.read_only_hint is True
        assert tool.annotations.open_world_hint is False
        assert tool.annotations.destructive_hint is False
        assert tool.input_schema.get("type") == "object"
    search = next(t for t in tools if t.name == "search_lakehouse_docs")
    assert search.input_schema["properties"]["question"]["maxLength"] == 1200
    assert search.input_schema["properties"]["top_k"]["maximum"] == 6
