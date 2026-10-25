"""Read-only cloud preflight. Never provisions clusters or prints credentials."""

import argparse
import json
import os
from contextlib import closing
from typing import Any, Protocol
from urllib.parse import urlparse

from qdrant_client import QdrantClient, models
from qdrant_client.http.exceptions import UnexpectedResponse


class CollectionReader(Protocol):
    def get_collection(self, collection_name: str) -> models.CollectionInfo: ...


def cloud_endpoint(url: str) -> str:
    """Only an explicit Qdrant Cloud data-plane endpoint may receive a database key."""
    parsed = urlparse(url)
    try:
        valid_port = parsed.port in (None, 443, 6333)
    except ValueError:
        valid_port = False
    if (
        parsed.scheme != "https"
        or not parsed.hostname
        or not parsed.hostname.endswith(".cloud.qdrant.io")
        or parsed.username
        or parsed.password
        or not valid_port
        or parsed.path not in ("", "/")
        or parsed.query
        or parsed.fragment
    ):
        raise ValueError("Use the HTTPS cluster endpoint from the Qdrant Cloud dashboard")
    return url.rstrip("/")


def inspect_collection(
    client: CollectionReader, collection: str, expected_dimensions: int
) -> dict[str, Any]:
    """GET only. Does not list unrelated collections or try a write to test permissions."""
    info = client.get_collection(collection)
    vector = info.config.params.vectors
    if not isinstance(vector, models.VectorParams):
        return {"status": "incompatible", "reason": "unnamed_dense_vector_required"}
    compatible = vector.size == expected_dimensions and vector.distance == models.Distance.COSINE
    return {
        "status": "ready" if compatible else "incompatible",
        "dimensions": vector.size,
        "distance": vector.distance.value,
        "points": info.points_count,
        "embedding_identity": "not_verified_by_dimensions_alone",
        "read_access": "verified",
        "read_only_permission": "must_be_confirmed_in_dashboard",
    }


def readiness(*, connect: bool = False) -> dict[str, Any]:
    url = os.getenv("QDRANT_URL", "")
    collection = os.getenv("QDRANT_COLLECTION", "lakehouse_rag_lab_v1")
    read_key = os.getenv("QDRANT_API_KEY", "")
    write_key = os.getenv("QDRANT_WRITE_API_KEY", "")
    required = {"QDRANT_URL": url, "QDRANT_API_KEY": read_key}
    missing = [name for name, value in required.items() if not value]
    report: dict[str, Any] = {
        "status": "configuration_missing" if missing else "configured_not_tested",
        "missing": missing,
        "read_key_present": bool(read_key),
        "indexing_key_present": bool(write_key),
        "free_plan_operator_confirmed": os.getenv("QDRANT_PLAN_CONFIRMED_FREE") == "true",
        "billing_verified_by_api": False,
        "network_contacted": False,
        "mutations": False,
    }
    if not collection.startswith("lakehouse_"):
        return {
            **report,
            "status": "invalid_configuration",
            "reason": "dedicated_collection_required",
        }
    if url:
        try:
            url = cloud_endpoint(url)
        except ValueError:
            return {
                **report,
                "status": "invalid_configuration",
                "reason": "invalid_cluster_endpoint",
            }
    if missing or not connect:
        return report
    report["network_contacted"] = True
    try:
        # No auto-indexing, no inference, no list-collections call, no write-key usage.
        with closing(
            QdrantClient(url=url, api_key=read_key, timeout=10, check_compatibility=False)
        ) as client:
            report["collection"] = inspect_collection(client, collection, 384)
            report["status"] = report["collection"]["status"]
    except UnexpectedResponse as exc:
        report["status"] = {
            401: "authentication_failed",
            403: "read_permission_denied",
            404: "collection_missing",
            429: "quota_or_rate_limit",
        }.get(exc.status_code or 0, "service_unavailable")
    except Exception:
        # Exception strings can include URLs, headers, or remote response bodies.
        report["status"] = "connection_failed"
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--connect", action="store_true", help="Perform one bounded read-only probe"
    )
    args = parser.parse_args()
    report = readiness(connect=args.connect)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if report["status"] != "ready":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
