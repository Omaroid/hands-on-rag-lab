# 6. FastAPI et LangGraph

FastAPI expose le contrat HTTP et Pydantic vérifie les types et bornes. `extra=forbid` rejette
les champs inattendus. Une réponse 422 distingue une entrée invalide d'un refus documentaire.

LangGraph orchestre un état partagé, des nœuds et des transitions. Les nœuds sont des fonctions
Python ordinaires. Le graphe est compilé puis invoqué ; il n'a pas besoin d'être un agent
avec des outils. Le baseline sans graphe reste dans baseline.py pour que chaque opération
soit compréhensible avant son orchestration.

Suivre validate_input, normalization, retrieval, fusion, rerank, pertinence, réponse/refus,
citations et format. Les refus continuent dans le pipeline sans appel de génération inutile.
Le streaming NDJSON transmet des deltas seulement après validation des preuves : une réponse
non vérifiée ne doit pas fuiter simplement parce que le transport est rapide.
