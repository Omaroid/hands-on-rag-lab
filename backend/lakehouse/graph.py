import time
from typing import Any, TypedDict, cast

from langgraph.graph import END, START, StateGraph

from lakehouse.generation import ExtractiveGenerator, Generator, verify_citations
from lakehouse.models import Answer, Chunk, Citation, Hit, Question
from lakehouse.retrieval import Store, reciprocal_rank_fusion, rerank
from lakehouse.text import INJECTION, normalize, tokens

NODES = [
    "validate_input",
    "normalize_or_rewrite_query",
    "retrieve_documents",
    "hybrid_fusion",
    "rerank_documents",
    "grade_context",
    "generate_answer_or_refuse",
    "verify_citations",
    "format_response",
]
REFUSAL = (
    "Les sources disponibles ne permettent pas de répondre avec suffisammen"
    "t de preuves. Précisez le produit et le sujet, ou consultez la documen"
    "tation officielle."
)


class State(TypedDict, total=False):
    request: Question
    normalized: str
    dense: list[Hit]
    lexical: list[Hit]
    fused: list[Hit]
    reranked: list[Hit]
    context: list[Chunk]
    reason: str | None
    answer: str
    citations: list[Citation]
    stages: list[str]
    result: Answer
    started: float


class Engine:
    def __init__(self, store: Store, generator: Generator | None = None) -> None:
        self.store = store
        self.generator = generator or ExtractiveGenerator()
        builder = StateGraph(State)
        for name in NODES:
            builder.add_node(name, self._node(name))
        builder.add_edge(START, NODES[0])
        for a, b in zip(NODES, NODES[1:], strict=False):
            builder.add_edge(a, b)
        builder.add_edge(NODES[-1], END)
        self.graph = builder.compile()

    def _node(self, name: str) -> Any:
        method = getattr(self, name)

        def run(state: State) -> State:
            update: State = method(state)
            update["stages"] = [*state.get("stages", []), name]
            return update

        return run

    def validate_input(self, s: State) -> State:
        q = s["request"].question
        reason = "injection_detected" if INJECTION.search(q) else None
        if "http://" in q.lower() or "https://" in q.lower():
            reason = "user_url_not_allowed"
        return {"reason": reason}

    def normalize_or_rewrite_query(self, s: State) -> State:
        return {"normalized": normalize(s["request"].question)}

    def retrieve_documents(self, s: State) -> State:
        if s.get("reason"):
            return {"dense": [], "lexical": []}
        request = s["request"]
        dense = (
            self.store.dense(s["normalized"], request.products) if request.mode != "lexical" else []
        )
        lexical = (
            self.store.lexical(s["normalized"], request.products) if request.mode != "dense" else []
        )
        return {"dense": dense, "lexical": lexical}

    def hybrid_fusion(self, s: State) -> State:
        mode = s["request"].mode
        hits = (
            reciprocal_rank_fusion(s["dense"], s["lexical"])
            if mode.startswith("hybrid")
            else (s["lexical"] if mode == "lexical" else s["dense"])
        )
        return {"fused": hits}

    def rerank_documents(self, s: State) -> State:
        ranked = (
            rerank(s["normalized"], s["fused"])
            if s["request"].mode == "hybrid_rerank"
            else s["fused"]
        )
        return {"reranked": ranked}

    def grade_context(self, s: State) -> State:
        terms = set(tokens(s["normalized"]))
        valid = []
        for hit in s["reranked"]:
            overlap = terms & set(tokens(hit.chunk.title + " " + hit.chunk.text))
            if (
                not INJECTION.search(hit.chunk.text)
                and len(overlap) >= 2
                and len(overlap) / max(1, len(terms)) >= 0.45
            ):
                valid.append(hit.chunk)
        context = valid[: s["request"].top_k]
        # Bound actual model input, independent of caller top_k.
        bounded: list[Chunk] = []
        size = 0
        for chunk in context:
            if size + len(chunk.text) > 12000:
                break
            bounded.append(chunk)
            size += len(chunk.text)
        return {
            "context": bounded,
            "reason": s.get("reason") or (None if bounded else "insufficient_evidence"),
        }

    def generate_answer_or_refuse(self, s: State) -> State:
        if s.get("reason"):
            return {"answer": REFUSAL, "citations": []}
        answer, citations = self.generator.generate(s["normalized"], s["context"])
        if not citations:
            return {"answer": REFUSAL, "citations": [], "reason": "insufficient_evidence"}
        return {"answer": answer, "citations": citations}

    def verify_citations(self, s: State) -> State:
        if not s.get("reason") and not verify_citations(s["answer"], s["citations"], s["context"]):
            return {"reason": "invalid_citations", "answer": REFUSAL, "citations": []}
        return {}

    def format_response(self, s: State) -> State:
        return {
            "result": Answer(
                question_normalized=s["normalized"],
                mode=s["request"].mode,
                answer=s["answer"],
                refused=bool(s.get("reason")),
                reason=s.get("reason"),
                citations=s["citations"],
                dense=s["dense"],
                lexical=s["lexical"],
                fused=s["fused"],
                reranked=s["reranked"],
                context=s["context"],
                stages=[*s["stages"], "format_response"],
                latency_ms=round((time.perf_counter() - s["started"]) * 1000, 2),
                generation=self.generator.name,
                embedding=self.store.embedder.name,
            )
        }

    def answer(self, request: Question) -> Answer:
        return cast(
            Answer,
            self.graph.invoke({"request": request, "started": time.perf_counter(), "stages": []})[
                "result"
            ],
        )
