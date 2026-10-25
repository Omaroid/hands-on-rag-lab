# Runbook

## Démarrer et diagnostiquer

1. `uv sync --frozen --group evaluation`, `npm ci --prefix frontend`, `npm run build --prefix frontend`.
2. Démarrer uvicorn comme dans README. `/api/health` doit répondre sans exposer de configuration sensible.
3. Tester une question Delta/ACID puis une question météo. Inspecter la provenance avant le contenu.
4. Pour Docker, générer le secret local puis `docker compose up --build` ; vérifier l'init d'index.

## 429

Quota minute/jour/mois atteint. Attendre la fenêtre suivante. Ne pas changer un plafond pour
masquer l'incident et ne jamais activer un service payant comme fallback. Le `Retry-After`
minute est indicatif ; un quota jour/mois exige une attente plus longue.

## 503

Vérifier si le service est sur Vercel : l'API est volontairement fermée sans quotas durables.
Sinon vérifier l'accès au fichier SQLite et au Qdrant configuré, sans imprimer les secrets.
Un compteur corrompu ne doit pas être remplacé par un compteur mémoire permissif.

## Refus ou mauvais retrieval

Inspecter les filtres, la question normalisée, les scores et les passages. Retirer un filtre
inadapté. Un mot absent du corpus n'est pas une panne. Ne pas abaisser la pertinence pour
forcer une réponse. Comparer BM25 et hybride avant de changer un seuil.

## Ingestion

Relire robots et conditions de chaque hôte et consigner la revue dans config/source-reviews.json
avec preuve conservée. Valider les URLs du manifeste. Lancer l'ingestion bornée ; conserver
l'ancien corpus si une page échoue. Réindexer uniquement les hashes modifiés. Utiliser `--prune`
uniquement sur la collection dédiée, puis refaire évaluation et tests.

## Secrets ou incident

Arrêter le service concerné, révoquer la clé dans sa console, déterminer l'exposition, corriger,
refaire les scans et reconstruire. Ne jamais envoyer les clés ou questions d'utilisateurs dans
les logs, issues ou captures. Ne modifier aucune application tierce pour réparer ce projet.

## Mise à jour

Modifier les versions avec uv/npm, revoir lockfiles et changelogs officiels, lancer CI et audits.
Le déploiement statique n'a pas besoin de secrets. Une nouvelle dimension ou un nouveau modèle
exige une collection versionnée et un réindexage ; éviter de mélanger deux espaces vectoriels.
