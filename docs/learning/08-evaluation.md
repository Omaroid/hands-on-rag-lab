# 8. Évaluer le retrieval et la réponse

Recall@K = documents pertinents retrouvés / documents pertinents annotés. Precision@K =
pertinents retrouvés / K. MRR moyenne `1/rang du premier pertinent`. Hit@K indique la présence
d'au moins un bon document. Une réponse correcte peut masquer un mauvais retrieval sur une
question facile : mesurer les deux séparément.

La génération doit être évaluée pour fidélité au contexte, exactitude des citations, pertinence
et refus approprié. L'extraction exacte rend un contrôle mécanique possible ; elle ne prouve
pas l'exactitude d'une synthèse future. Ajouter les cas sans réponse évite d'optimiser uniquement
pour la propension à répondre.

MLflow suit les paramètres et métriques des expériences locales. Il n'est pas nécessaire de
déployer un serveur pour comparer des modes. Les 42 cas livrés sont synthétiques et proches
des notes : ils servent à détecter les régressions, pas à annoncer une précision générale.
