# ADR 0005 — Mesurer le baseline sans annoncer une fidélité LLM

Statut : accepté.

Contexte : une réponse extractive et un corpus synthétique produisent des mesures faciles à
surinterpréter. Une citation exacte ne démontre pas un entailment de synthèse.

Décision : 42 cas annotés, métriques par mode, citations contrôlées comme extraits exacts,
tokens LLM null et coût d'appels nul. MLflow reste local ; pas de collecte des questions privées.

Conséquence : les résultats détectent des régressions du baseline. Ils ne prédisent pas les
performances d'un modèle distant ou d'un corpus officiel différent. Les évaluations futures
exigent un jeu tenu à part et des jugements humains indépendants.
