# ADR 0002 — Hash lexical et génération extractive explicites

Statut : accepté pour l'apprentissage initial.

Contexte : il faut un baseline reproductible sans clé ni poids à télécharger implicitement.

Décision : hash de termes normalisé, BM25 visible, Qdrant réel, RRF et rerank lexical gratuit.
La réponse est constituée de citations exactes vérifiées. Un adaptateur Embedder permet de
remplacer le hash ; Generator permet une extension, mais aucun LLM ne se cache derrière l'étiquette.

Conséquence : faible généralisation aux paraphrases, pas de synthèse générative. Le frontend
et les métriques annoncent ces limites. Le modèle FastEmbed optionnel demande des poids
locaux et un rechunking adapté ; il n'est pas déclaré validé sans inférence réelle.
