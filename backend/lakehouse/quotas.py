import hashlib
import hmac
import sqlite3
import threading
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path


class QuotaExceeded(Exception):
    pass


@dataclass(frozen=True)
class Limits:
    per_minute: int = 6
    per_day: int = 40
    global_day: int = 300
    global_month: int = 3000


DEFAULT_LIMITS = Limits()


class Quotas:
    """SQLite atomic reservations: suitable for ONE durable host, never serverless /tmp.

    No raw IP or question is written. Identifiers expire daily and old counters are deleted.
    """

    def __init__(self, path: Path, secret: bytes, limits: Limits = DEFAULT_LIMITS) -> None:
        if len(secret) < 32:
            raise ValueError("anonymization secret must contain at least 32 bytes")
        path.parent.mkdir(parents=True, exist_ok=True)
        self.path, self.secret, self.limits = path, secret, limits
        self.lock = threading.Lock()
        with sqlite3.connect(path) as db:
            db.execute(
                "CREATE TABLE IF NOT EXISTS counters (key TEXT PRIMARY KEY, value INTEG"
                "ER NOT NULL, expires REAL NOT NULL)"
            )

    def reserve(self, address: str, now: float | None = None) -> None:
        now = time.time() if now is None else now
        stamp = datetime.fromtimestamp(now, UTC)
        day, month = stamp.strftime("%Y-%m-%d"), stamp.strftime("%Y-%m")
        anon = hmac.new(self.secret, (day + address).encode(), hashlib.sha256).hexdigest()
        periods = [
            (f"minute:{int(now // 60)}:{anon}", self.limits.per_minute, now + 120),
            (f"day:{day}:{anon}", self.limits.per_day, now + 172800),
            (f"global_day:{day}", self.limits.global_day, now + 172800),
            (f"global_month:{month}", self.limits.global_month, now + 5356800),
        ]
        with self.lock, sqlite3.connect(self.path, timeout=2) as db:
            db.execute("BEGIN IMMEDIATE")
            db.execute("DELETE FROM counters WHERE expires < ?", (now,))
            for key, limit, _ in periods:
                row = db.execute("SELECT value FROM counters WHERE key=?", (key,)).fetchone()
                if row and row[0] >= limit:
                    db.rollback()
                    raise QuotaExceeded("Quota gratuit atteint. Réessayez plus tard.")
            for key, _, expires in periods:
                db.execute(
                    "INSERT INTO counters VALUES (?, 1, ?) "
                    "ON CONFLICT(key) DO UPDATE SET value=value+1",
                    (key, expires),
                )
            db.commit()
