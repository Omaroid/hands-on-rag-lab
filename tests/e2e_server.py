"""Local-only web fixture; production app and quota defaults are never modified."""

import os
from functools import lru_cache
from pathlib import Path

from lakehouse import api
from lakehouse.quotas import Limits, Quotas

if os.getenv("LAKEHOUSE_E2E_LOCAL") != "1":
    raise RuntimeError("This fixture must be launched by scripts/verify_web.py")


@lru_cache
def local_test_quotas() -> Quotas:
    # UI cases share one loopback address. Quota boundaries are tested separately in test_core.py.
    # Keep reservations active but avoid cross-case rate interference in this isolated process.
    return Quotas(
        Path(os.environ["QUOTA_DB"]),
        b"x" * 64,
        limits=Limits(per_minute=1000, per_day=10000, global_day=10000, global_month=10000),
    )


api.quotas = local_test_quotas
app = api.app
