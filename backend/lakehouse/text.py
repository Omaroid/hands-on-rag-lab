import hashlib
import math
import re
import unicodedata
from collections import Counter

STOP = set(
    (
        "a an the is are of to in for and or what how does do on with be as et "
        "de du des le la les un une est sont que qui quoi comment pour dans au "
        "aux en quelle quels quel peut il elle this that explain expliquer"
    ).split()
)
ALIASES = {
    "gouvernance": "governance",
    "cout": "cost",
    "couts": "cost",
    "coute": "cost",
    "securite": "security",
    "droits": "permissions",
    "catalogue": "catalog",
    "ligne": "row",
    "lignes": "row",
    "colonnes": "column",
    "donnees": "data",
    "historique": "history",
    "version": "version",
    "optimisation": "optimization",
    "fichiers": "files",
    "stockage": "storage",
    "schema": "schema",
    "transaction": "acid",
    "transactions": "acid",
    "suppression": "delete",
    "supprimer": "delete",
    "partage": "sharing",
    "qualite": "quality",
    "qualité": "quality",
    "medaillon": "medallion",
    "couches": "layers",
    "identite": "identity",
    "permissions": "permissions",
    "acces": "access",
    "masquage": "mask",
    "table": "table",
    "tables": "table",
    "lineage": "lineage",
    "tracabilite": "lineage",
    "autoloader": "autoloader",
}
INJECTION = re.compile(
    (
        "ignore\\s+(all\\s+|previous\\s+|the\\s+|toutes?\\s+|les\\s+)*instructions|ig"
        "nore\\s+previous|oublie.{0,25}instructions|system\\s*prompt|prompt\\s*sys"
        "t[eè]me|reveal.{0,20}(secret|key)|r[eé]v[eè]le.{0,20}(secret|cl[eé])|y"
        "ou are now|tu es maintenant|\\[INST\\]|<\\|im_start\\|>|exfiltrat"
    ),
    re.I,
)


def normalize(text: str) -> str:
    return " ".join(unicodedata.normalize("NFKC", text).strip().split())


def tokens(text: str) -> list[str]:
    plain = "".join(
        c for c in unicodedata.normalize("NFKD", text.lower()) if not unicodedata.combining(c)
    )
    words = re.findall(r"[a-z0-9]+", plain)
    return [ALIASES.get(w, w) for w in words if w not in STOP and len(w) > 1]


def digest(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def hash_embedding(text: str, dimensions: int = 384) -> list[float]:
    """Pedagogical feature hashing, NOT a pretrained semantic embedding."""
    vector = [0.0] * dimensions
    for word, count in Counter(tokens(text)).items():
        value = int(digest(word), 16)
        vector[value % dimensions] += count * (1 if (value >> 16) % 2 else -1)
    length = math.sqrt(sum(x * x for x in vector)) or 1
    return [x / length for x in vector]


def cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b, strict=True))
    norm = math.sqrt(sum(x * x for x in a) * sum(y * y for y in b))
    return dot / norm if norm else 0
