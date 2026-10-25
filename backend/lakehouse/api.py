import asyncio
import json
import os
import secrets
import sqlite3
from collections import OrderedDict
from functools import lru_cache
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from starlette.concurrency import run_in_threadpool

from lakehouse.graph import Engine
from lakehouse.models import Answer, Question
from lakehouse.quotas import QuotaExceeded, Quotas
from lakehouse.retrieval import build_store, load_chunks
from lakehouse.text import digest, normalize

ROOT = Path(os.getenv("LAKEHOUSE_ROOT", str(Path.cwd())))
ORIGIN = os.getenv("APP_ORIGIN", "http://localhost:8000")
app = FastAPI(title="Lakehouse RAG Lab", docs_url=None, redoc_url=None, openapi_url=None)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[ORIGIN],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
CACHE: OrderedDict[str, Answer] = OrderedDict()
MAX_BODY = 8192
SECURITY_HEADERS = {
    "Content-Security-Policy": (
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self"
        "' data:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'"
        "; base-uri 'self'; form-action 'self'"
    ),
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Cache-Control": "no-store",
}


@lru_cache
def engine() -> Engine:
    path = ROOT / "corpus" / "official.json"
    return Engine(
        build_store(load_chunks(path if path.exists() else ROOT / "corpus/editorial.json"))
    )


@lru_cache
def quotas() -> Quotas:
    if os.getenv("PUBLIC_SERVERLESS", "false").lower() == "true" or os.getenv("VERCEL"):
        raise RuntimeError(
            "Durable atomic quotas are required for serverless; local counters are unsafe."
        )
    secret = os.getenv("ANONYMIZATION_SECRET")
    return Quotas(
        Path(os.getenv("QUOTA_DB", str(ROOT / "work/quotas.sqlite"))),
        secret.encode() if secret else secrets.token_bytes(32),
    )


@app.middleware("http")
async def protections(request: Request, call_next: Any) -> Any:
    if request.method == "POST":
        if request.headers.get("origin") not in (None, ORIGIN):
            return JSONResponse(
                {"detail": "Origine non autorisée"}, status_code=403, headers=SECURITY_HEADERS
            )
        if request.headers.get("sec-fetch-site") == "cross-site":
            return JSONResponse(
                {"detail": "Cross-site request refused"}, status_code=403, headers=SECURITY_HEADERS
            )
        if not request.headers.get("content-type", "").startswith("application/json"):
            return JSONResponse(
                {"detail": "JSON requis"}, status_code=415, headers=SECURITY_HEADERS
            )
        # Count actual bytes, even without Content-Length. Stop before parsing or model calls.
        total, parts = 0, []
        async for part in request.stream():
            total += len(part)
            if total > MAX_BODY:
                return JSONResponse(
                    {"detail": "Requête trop volumineuse"},
                    status_code=413,
                    headers=SECURITY_HEADERS,
                )
            parts.append(part)
        request._body = b"".join(parts)
    response = await call_next(request)
    response.headers.update(SECURITY_HEADERS)
    return response


@app.exception_handler(Exception)
async def unexpected(_: Request, exc: Exception) -> JSONResponse:
    # Deliberately do not log exception repr, question, IP or credentials.
    return JSONResponse(
        {"detail": "Service temporairement indisponible"}, status_code=503, headers=SECURITY_HEADERS
    )


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "remote_generation": False,
        "public_queries": not bool(os.getenv("VERCEL")),
        "mandatory_cost_eur": 0,
    }


@app.get("/api/sources")
def sources() -> list[dict[str, Any]]:
    return [
        dict(
            title=c.title,
            url=c.url,
            product=c.product,
            provenance=c.provenance,
            retrieved_at=c.retrieved_at,
        )
        for c in engine().store.chunks
    ]


def reserve(request: Request) -> None:
    try:
        # Do not trust arbitrary X-Forwarded-For on a local/self-hosted deployment.
        quotas().reserve(request.client.host if request.client else "unknown")
    except QuotaExceeded as exc:
        raise HTTPException(429, str(exc), headers={"Retry-After": "60"}) from None
    except (RuntimeError, sqlite3.Error, OSError):
        raise HTTPException(
            503, "Requêtes désactivées : contrôle global des quotas indisponible."
        ) from None


async def answer_cached(question: Question) -> Answer:
    key = digest(question.model_dump_json())
    if key in CACHE:
        CACHE.move_to_end(key)
        return CACHE[key].model_copy(
            update={"cache_hit": True, "question_normalized": normalize(question.question)}
        )
    try:
        result = await asyncio.wait_for(run_in_threadpool(engine().answer, question), timeout=15)
    except TimeoutError:
        raise HTTPException(504, "Délai de recherche dépassé") from None
    CACHE[key] = result.model_copy(update={"question_normalized": ""})
    if len(CACHE) > 64:
        CACHE.popitem(last=False)
    return result


@app.post("/api/answer", response_model=Answer)
async def answer(question: Question, request: Request) -> Answer:
    reserve(request)
    return await answer_cached(question)


@app.post("/api/stream")
async def stream(question: Question, request: Request) -> StreamingResponse:
    reserve(request)
    # Verify evidence BEFORE emitting any answer text. NDJSON is incrementally decoded by UI.
    result = await answer_cached(question)

    async def events() -> Any:
        yield json.dumps({"type": "meta", "stages": result.stages}) + "\n"
        for start in range(0, len(result.answer), 72):
            if await request.is_disconnected():
                return
            yield (
                json.dumps(
                    {"type": "delta", "text": result.answer[start : start + 72]}, ensure_ascii=False
                )
                + "\n"
            )
            await asyncio.sleep(0)
        yield json.dumps({"type": "done", "result": result.model_dump()}, ensure_ascii=False) + "\n"

    return StreamingResponse(
        events(), media_type="application/x-ndjson", headers={"X-Accel-Buffering": "no"}
    )


@app.post("/api/compare")
async def compare(question: Question, request: Request) -> list[Answer]:
    reserve(request)
    return [
        await answer_cached(question.model_copy(update={"mode": mode}))
        for mode in ("lexical", "dense", "hybrid", "hybrid_rerank")
    ]


DIST = ROOT / "frontend" / "dist"
if DIST.exists():
    app.mount("/", StaticFiles(directory=DIST, html=True), name="frontend")
