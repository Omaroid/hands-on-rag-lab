"""Read-only AI Gateway credit diagnostic. Never generates, buys or changes budgets."""

import argparse
import json
import os
from decimal import Decimal, InvalidOperation
from typing import Any

import httpx

CREDITS_URL = "https://ai-gateway.vercel.sh/v1/credits"


def amount(value: Any) -> str:
    if isinstance(value, bool) or not isinstance(value, str | int | float):
        raise ValueError("Expected a credit amount")
    number = Decimal(str(value))
    if not number.is_finite() or number < 0:
        raise ValueError("Invalid credit amount")
    return str(number)


def readiness(
    *, connect: bool = False, transport: httpx.BaseTransport | None = None
) -> dict[str, Any]:
    key = os.getenv("AI_GATEWAY_API_KEY")
    report: dict[str, Any] = {
        "status": "configured_not_verified" if key else "configuration_missing",
        "missing": [] if key else ["AI_GATEWAY_API_KEY"],
        "network_contacted": False,
        "budget_modified": False,
        "generation_requests": 0,
        "credits_purchased": False,
        "free_credit_eligibility_verified": False,
        "auto_topup_disabled_verified": False,
        "zero_cash_spend_guarantee_verified": False,
    }
    if not key or not connect:
        return report
    report["network_contacted"] = True
    try:
        with httpx.Client(timeout=10, follow_redirects=False, transport=transport) as client:
            with client.stream(
                "GET", CREDITS_URL, headers={"Authorization": f"Bearer {key}"}
            ) as response:
                report["http_status"] = response.status_code
                if response.status_code != 200:
                    report["status"] = {
                        401: "authentication_failed",
                        403: "access_denied",
                        402: "account_verification_or_credits_required",
                        429: "rate_limited",
                    }.get(response.status_code, "unexpected_response")
                    return report
                body = bytearray()
                for block in response.iter_bytes():
                    body.extend(block)
                    if len(body) > 16384:
                        raise ValueError("Oversized credit response")
        data = json.loads(body)
        if not isinstance(data, dict):
            raise ValueError("Invalid credit response")
        # Official examples differ in their lifetime-spend field name. Never print raw data.
        balance = amount(data["balance"])
        used = amount(data["total_used"] if "total_used" in data else data["totalSpend"])
        report.update(status="balance_verified", balance_usd=balance, lifetime_usage_usd=used)
    except (ValueError, KeyError, InvalidOperation, TypeError):
        report["status"] = "invalid_credit_response"
    except Exception:
        # Error representations and response bodies can contain credentials. Do not expose them.
        report["status"] = "connection_failed"
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--connect", action="store_true", help="Read credit balance over HTTPS")
    report = readiness(connect=parser.parse_args().connect)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if report["status"] != "balance_verified":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
