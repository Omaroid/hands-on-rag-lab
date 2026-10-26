"Fail build if credential-like values or server-only configuration enter browser assets."

import re
from pathlib import Path

PATTERNS = [
    r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
    r"\bnvapi-[A-Za-z0-9_\-]{20,}",
    r"\b(?:sk_live_|sk-proj-|ghp_|github_pat_)[A-Za-z0-9_\-]{15,}",
    (
        "\\b(?:NVIDIA_API_KEY|AI_GATEWAY_API_KEY|QDRANT_API_KEY|ANONYMIZATION_SECRET)\\s*[:=]\\s*"
        "[\"\\'][^\"\\']{12,}"
    ),
]
files = list(Path("frontend/dist").rglob("*"))
if not files:
    raise SystemExit("Frontend bundle missing")
for path in files:
    if path.is_file():
        content = path.read_text(errors="replace")
        if any(re.search(pattern, content) for pattern in PATTERNS):
            raise SystemExit(f"Suspected credential in {path.name}; value withheld")
print("Browser bundle: no matching credential signatures")
