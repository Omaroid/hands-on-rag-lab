import json
from pathlib import Path

from lakehouse.models import Chunk, Question

for file in ["corpus/editorial.json"]:
    chunks = [Chunk.model_validate(c) for c in json.loads(Path(file).read_text())]
    assert len({c.id for c in chunks}) == len(chunks)
expected = json.loads(Path("config/question.schema.json").read_text())
assert Question.model_json_schema() == expected, (
    "Regenerate schema only after reviewing the API change"
)
print("Corpus and API schemas valid")
