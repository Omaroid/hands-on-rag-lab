# ADR 0001 — Séparer le compagnon public et le moteur backend

Statut : accepté pour le baseline, 25 octobre 2026.

Contexte : gratuité stricte, absence de stockage de quotas distribué vérifié et accès réseau
limité aux services. Un compteur par fonction ne garantit pas un plafond global.

Décision : publier un compagnon statique avec calcul navigateur, conserver le moteur
FastAPI/Qdrant/LangGraph local, refuser les appels API en serverless tant qu'un compteur
atomique durable gratuit n'est pas intégré. Aucun appel LLM payant n'existe dans le chemin actif.

Conséquence : démonstration interactive disponible, mais cible RAG cloud complète explicitement
non atteinte. Tester les deux exécutions séparément. Revoir cette décision après validation
des sources, des modèles gratuits et de la persistance des quotas.
