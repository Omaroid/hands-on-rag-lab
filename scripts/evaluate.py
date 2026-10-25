"Real measured retrieval metrics, no LLM-as-judge or claims of official-source accuracy."

import argparse
import json
import statistics
from pathlib import Path

from lakehouse.generation import verify_citations
from lakehouse.graph import Engine
from lakehouse.models import Mode, Question
from lakehouse.retrieval import Store, load_chunks


def evaluate(mode: Mode, k: int = 4) -> tuple[dict[str, float], list[dict[str, object]]]:
    corpus_path = Path("corpus/official.json")
    engine = Engine(
        Store(load_chunks(corpus_path if corpus_path.exists() else Path("corpus/editorial.json")))
    )
    cases = json.loads(Path("config/evaluation.json").read_text())
    recalls, precisions, reciprocal, found = [], [], [], []
    rows = []
    citation_ok, citation_total, refusals_ok, refusals_total = 0, 0, 0, 0
    latencies = []
    for case in cases:
        result = engine.answer(Question(question=case["question"], mode=mode, top_k=k))
        titles = [h.chunk.title for h in result.reranked[:k]]
        relevant = set(case["relevant_titles"])
        if relevant:
            intersection = set(titles) & relevant
            recalls.append(len(intersection) / len(relevant))
            precisions.append(len(intersection) / k)
            reciprocal.append(next((1 / (i + 1) for i, t in enumerate(titles) if t in relevant), 0))
            found.append(float(bool(intersection)))
        if result.citations:
            citation_total += 1
            citation_ok += int(verify_citations(result.answer, result.citations, result.context))
        if case["should_refuse"]:
            refusals_total += 1
            refusals_ok += int(result.refused)
        latencies.append(result.latency_ms)
        rows.append(
            {
                "id": case["id"],
                "question": case["question"],
                "expected_refusal": case["should_refuse"],
                "refused": result.refused,
                "retrieved": titles,
                "relevant": sorted(relevant),
                "citations": len(result.citations),
                "latency_ms": result.latency_ms,
            }
        )
    metrics = {
        "recall_at_4": statistics.mean(recalls),
        "precision_at_4": statistics.mean(precisions),
        "mrr": statistics.mean(reciprocal),
        "hit_at_4": statistics.mean(found),
        "citation_exact_support": citation_ok / max(citation_total, 1),
        "correct_refusal_rate": refusals_ok / max(refusals_total, 1),
        "answerability_accuracy": statistics.mean(
            float(r["expected_refusal"] == r["refused"]) for r in rows
        ),
        "latency_p50_ms": statistics.median(latencies),
        "latency_p95_ms": sorted(latencies)[int(0.95 * (len(latencies) - 1))],
        "mandatory_cost_eur": 0.0,
        "cases": float(len(cases)),
    }
    return metrics, rows


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mlflow", action="store_true")
    args = parser.parse_args()
    report = {}
    for mode in ["lexical", "dense", "hybrid", "hybrid_rerank"]:
        metrics, rows = evaluate(mode)  # type: ignore[arg-type]
        report[mode] = {"metrics": metrics, "cases": rows}
        if args.mlflow:
            import mlflow

            mlflow.set_tracking_uri(Path("work/mlruns").resolve().as_uri())
            mlflow.set_experiment("Lakehouse RAG Lab — editorial baseline")
            with mlflow.start_run(run_name=mode):
                mlflow.log_params(
                    {
                        "mode": mode,
                        "top_k": 4,
                        "embedding": "local-hash-384",
                        "corpus": "editorial",
                        "generation": "extractive",
                    }
                )
                mlflow.log_metrics(metrics)
        print(mode, json.dumps(metrics, ensure_ascii=False))
    Path("evidence/evaluation.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    )


if __name__ == "__main__":
    main()
