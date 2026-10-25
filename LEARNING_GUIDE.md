# Guide pour reconstruire et présenter le projet

Commencer par la [visite composant par composant](docs/learning/00-project-tour.md),
avec les schémas et la distinction entre code présent et validations restantes.

## Parcours

1. Lire `docs/learning/01-embeddings.md`, puis lancer `uv run python -m lakehouse.baseline`.
2. Changer une phrase de corpus/baseline.md, observer le chunk, le vecteur et le score.
3. Lire chunking.py ; modifier 650/75 dans une expérience et expliquer le compromis.
4. Lire retrieval.py : BM25, Qdrant, RRF et reranking restent visibles, sans wrapper LangChain.
5. Lire graph.py et dessiner ses neuf nœuds. Repérer les chemins de refus.
6. Démarrer l'interface, comparer les quatre modes et lire un passage retenu/rejeté.
7. Lire security/quotas et tenter une citation forgée dans les tests, jamais sur un vrai service tiers.
8. Exécuter les 42 cas et lire la différence entre Recall@K et qualité de réponse.
9. Lancer Docker puis découvrir les outils MCP stdio. Expliquer pourquoi aucun outil n'écrit.
10. Lire STATUS.md et expliquer honnêtement ce qui reste avant le RAG cloud complet.

## Démonstration en cinq minutes

Commencer par l'objectif (rendre le retrieval inspectable). Poser une question Delta ACID,
montrer une citation et sa provenance éditoriale. Ouvrir l'Explorer : les scores BM25 et cosinus
n'ont pas la même échelle ; RRF utilise leurs rangs. Comparer les modes et constater que le
reranking n'est pas toujours meilleur. Poser une question météo : le système refuse.

Montrer le baseline Python, puis le graphe. Expliquer que LangGraph orchestre et que Qdrant
cherche les vecteurs ; aucun des deux ne garantit la vérité. Montrer COST.md : le chemin actif
ne sait pas appeler un fournisseur payant et l'API serverless échoue fermée sans compteur durable.
Terminer sur les étapes restantes : sources officielles vérifiées, embeddings réels et LLM avec
coupure fournisseur validée. Ne pas présenter le compagnon navigateur comme une stack cloud.

## Questions d'entretien

- Pourquoi un hash n'est-il pas un embedding sémantique ? Il représente des termes, pas le sens
  appris d'un corpus ; ses collisions et son lexique limitent les paraphrases.
- Pourquoi Qdrant si le corpus est petit ? Pour apprendre un vrai contrat vectoriel, ses filtres
  et l'indexation, tout en gardant un baseline sans infrastructure externe.
- Pourquoi pas un agent autonome ? La tâche est documentaire ; un graphe borné suffit et retire
  l'exécution de code, le fetch arbitraire et les écritures du périmètre d'attaque.
- Pourquoi refuser ? Sans passages pertinents, une réponse plausible ne serait pas sourcée.
- Pourquoi la version publique calcule-t-elle localement ? Pour une démo gratuite immédiate
  sans prétendre résoudre des quotas distribués avec un compteur par fonction.
- Qu'apporte un LLM plus tard ? Reformulation et synthèse ; il faudra alors évaluer l'entailment,
  la granularité des citations et les tokens, au-delà de l'exactitude extractive.
