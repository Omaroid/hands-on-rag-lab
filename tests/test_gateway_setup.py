import json

import httpx
import pytest
from lakehouse.gateway_setup import CREDITS_URL, readiness


def test_missing_key_never_opens_network(monkeypatch):
    monkeypatch.delenv("AI_GATEWAY_API_KEY", raising=False)

    def handler(_):
        pytest.fail("Missing credentials must not trigger a request")

    result = readiness(connect=True, transport=httpx.MockTransport(handler))
    assert result["status"] == "configuration_missing"
    assert not result["network_contacted"]


@pytest.mark.parametrize("spend_field", ["total_used", "totalSpend"])
def test_read_balance_does_not_attest_free_plan_or_modify_budget(monkeypatch, spend_field):
    monkeypatch.setenv("AI_GATEWAY_API_KEY", "test-credential-not-a-real-key")
    requests = []

    def handler(request):
        requests.append(request)
        assert request.method == "GET" and str(request.url) == CREDITS_URL
        assert request.headers["Authorization"] == "Bearer test-credential-not-a-real-key"
        return httpx.Response(200, json={"balance": "5.00", spend_field: "0.00"})

    result = readiness(connect=True, transport=httpx.MockTransport(handler))
    assert result["status"] == "balance_verified"
    assert result["balance_usd"] == "5.00"
    assert not result["zero_cash_spend_guarantee_verified"]
    assert not result["free_credit_eligibility_verified"]
    assert not result["budget_modified"]
    assert len(requests) == 1


@pytest.mark.parametrize("status", [302, 401, 403, 429, 500])
def test_errors_do_not_expose_credentials_or_follow_redirects(monkeypatch, status):
    secret = "test-credential-not-a-real-key"
    monkeypatch.setenv("AI_GATEWAY_API_KEY", secret)
    requests = []

    def handler(request):
        requests.append(request)
        return httpx.Response(status, text=secret, headers={"Location": "https://untrusted.test"})

    result = readiness(connect=True, transport=httpx.MockTransport(handler))
    assert secret not in json.dumps(result)
    assert len(requests) == 1
    assert result["http_status"] == status
    assert result["status"] != "balance_verified"


@pytest.mark.parametrize("balance", ["NaN", "Infinity", "-1", True, {}, None])
def test_invalid_credit_amount_fails_closed(monkeypatch, balance):
    monkeypatch.setenv("AI_GATEWAY_API_KEY", "test-credential-not-a-real-key")
    result = readiness(
        connect=True,
        transport=httpx.MockTransport(
            lambda _: httpx.Response(200, json={"balance": balance, "total_used": "0"})
        ),
    )
    assert result["status"] == "invalid_credit_response"


def test_transport_exception_is_sanitized(monkeypatch):
    secret = "test-credential-not-a-real-key"
    monkeypatch.setenv("AI_GATEWAY_API_KEY", secret)

    def handler(_):
        raise RuntimeError(secret)

    result = readiness(connect=True, transport=httpx.MockTransport(handler))
    assert result["status"] == "connection_failed"
    assert secret not in json.dumps(result)
