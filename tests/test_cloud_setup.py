import json
from contextlib import closing

import pytest
from lakehouse.cloud_setup import cloud_endpoint, inspect_collection, readiness
from qdrant_client import QdrantClient, models
from qdrant_client.http.exceptions import UnexpectedResponse


@pytest.mark.parametrize(
    "url",
    [
        "http://demo.eu.aws.cloud.qdrant.io",
        "https://cloud.qdrant.io",
        "https://demo.eu.aws.cloud.qdrant.io.evil.org",
        "https://key@demo.eu.aws.cloud.qdrant.io",
        "https://demo.eu.aws.cloud.qdrant.io/?api-key=secret",
        "https://demo.eu.aws.cloud.qdrant.io/collections/other",
        "https://demo.eu.aws.cloud.qdrant.io:99999",
        "https://127.0.0.1:6333",
    ],
)
def test_credential_destination_is_restricted(url):
    with pytest.raises(ValueError):
        cloud_endpoint(url)


def test_readiness_redacts_keys_and_does_not_connect(monkeypatch):
    monkeypatch.setenv("QDRANT_URL", "https://demo.eu.aws.cloud.qdrant.io:6333")
    monkeypatch.setenv("QDRANT_API_KEY", "read-value-not-for-output")
    monkeypatch.setenv("QDRANT_WRITE_API_KEY", "write-value-not-for-output")
    monkeypatch.setenv("QDRANT_COLLECTION", "lakehouse_test")
    report = readiness()
    output = json.dumps(report)
    assert report["status"] == "configured_not_tested"
    assert report["network_contacted"] is False
    assert report["billing_verified_by_api"] is False
    assert "read-value-not-for-output" not in output
    assert "write-value-not-for-output" not in output


def test_read_only_collection_inspection():
    with closing(QdrantClient(":memory:")) as client:
        client.create_collection(
            "lakehouse_test",
            vectors_config=models.VectorParams(size=384, distance=models.Distance.COSINE),
        )
        report = inspect_collection(client, "lakehouse_test", 384)
        assert report["status"] == "ready"
        assert report["points"] == 0
        assert report["read_only_permission"] == "must_be_confirmed_in_dashboard"
        assert inspect_collection(client, "lakehouse_test", 768)["status"] == "incompatible"


def test_connect_auth_failure_has_no_remote_response_content(monkeypatch):
    monkeypatch.setenv("QDRANT_URL", "https://demo.eu.aws.cloud.qdrant.io")
    monkeypatch.setenv("QDRANT_API_KEY", "private-read-value")

    class FailedClient:
        def __init__(self, **kwargs):
            pass

        def get_collection(self, collection_name):
            raise UnexpectedResponse(403, "Forbidden", b"private-read-value", {})

        def close(self):
            pass

    monkeypatch.setattr("lakehouse.cloud_setup.QdrantClient", FailedClient)
    report = readiness(connect=True)
    assert report["status"] == "read_permission_denied"
    assert "private-read-value" not in json.dumps(report)
    assert report["mutations"] is False
