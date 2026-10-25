# syntax=docker/dockerfile:1
FROM node:24.19.0-bookworm-slim AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm ci --strict-ssl=true
COPY frontend/ ./
RUN npm run build

FROM ghcr.io/astral-sh/uv:0.12.23 AS uv
FROM python:3.12.14-slim-bookworm AS backend
COPY --from=uv /uv /usr/local/bin/uv
WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
COPY pyproject.toml uv.lock ./
COPY backend/ backend/
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export SSL_CERT_FILE=/run/secrets/proxy_ca; fi; \
    uv sync --frozen --no-dev --no-editable
FROM python:3.12.14-slim-bookworm AS runtime
WORKDIR /app
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 LAKEHOUSE_ROOT=/app
COPY --chown=10001:10001 --from=backend /app/.venv/ .venv/
COPY --chown=10001:10001 app.py ./
COPY --chown=10001:10001 corpus/ corpus/
COPY --chown=10001:10001 config/ config/
COPY --chown=10001:10001 scripts/index_qdrant.py scripts/index_qdrant.py
COPY --chown=10001:10001 --from=web /web/dist/ frontend/dist/
RUN groupadd --gid 10001 lab && useradd --uid 10001 --gid lab --no-create-home lab \
    && mkdir /app/work && chown lab:lab /app/work
USER 10001:10001
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD ["/app/.venv/bin/python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health',timeout=2)"]
CMD ["/app/.venv/bin/uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log", "--no-proxy-headers"]
