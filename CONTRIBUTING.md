# Contribuer

Le parcours public est une application PDF React/TypeScript avec une API Node. Le laboratoire Python est optionnel et possède son propre périmètre de tests. Commencez par le [README](README.md) et la [politique de sécurité](SECURITY.md).

## Préparer un changement

1. Créer une branche depuis `main`.
2. Garder le changement ciblé et préserver les contrats API, les citations et le consentement.
3. Installer avec les lockfiles et les scripts de dépendances désactivés.
4. Vérifier le comportement réel et ouvrir une pull request expliquant problème, changement, preuves et limites.

Ne joindre aucun secret ou PDF privé aux fichiers, issues, captures ou artefacts. Les fixtures PDF du dépôt sont synthétiques. Un changement de clé se fait dans le gestionnaire de secrets du service, pas dans Git.

## Application PDF et API Node

```bash
npm ci --ignore-scripts
npm ci --ignore-scripts --prefix frontend
npm run test:server
VITE_RUNTIME=browser npm run build --prefix frontend
python3 scripts/check_bundle.py
npm exec --prefix frontend -- playwright install chromium
python3 scripts/verify_pdf.py --skip-build
```

Le script de vérification utilise un serveur local isolé et retire les identifiants fournisseurs de son environnement. Il télécharge le modèle public épinglé si nécessaire et vérifie ses empreintes. Il teste PDF/OCR/E5 réellement ; les réponses de génération sont simulées dans les tests d’interface.

## Sécurité avant publication

```bash
python3 scripts/check_secrets.py
git ls-files -z | xargs -0 frontend/node_modules/.bin/secretlint
npm audit
npm audit --prefix frontend
```

Le scanner d’historique est fixé par version et SHA-256, nécessite Linux x86_64 et rédige un rapport local masqué dans `work/`. N’ajoutez pas d’exclusion large : chaque exception doit être justifiée et précise. Aucun secret de production n’est requis en CI.

## Laboratoire Python optionnel

Prérequis : Python 3.12 et uv 0.12.23.

```bash
uv sync --frozen --group evaluation --group semantic
uv run ruff format --check backend tests scripts app.py
uv run ruff check backend tests scripts app.py
uv run mypy backend
uv run python scripts/check_schema.py
uv run --group semantic pytest -q
uv run --group evaluation python scripts/evaluate.py --mlflow
uv run --frozen --all-groups pip-audit
uv build --no-sources
uv run python scripts/verify_web.py --runtime backend
```

La dernière commande reconstruit et vérifie l’interface historique avec le backend local. Elle ne doit pas contacter Qdrant Cloud ni NVIDIA. Son serveur de fixture isole les réservations locales et augmente uniquement les limites de test pour éviter les interférences entre scénarios ; les limites du backend restent couvertes par les tests unitaires. `scripts/verify_web.py --runtime both` vérifie ensuite aussi l’application PDF actuelle.

## Relire et fusionner

Vérifier les checks du **dernier commit** de la PR. Ne pas annoncer une CI GitHub réussie sur la seule base de tests locaux. Pour un changement UI, contrôler français/anglais, clavier, mobile, contraste et réduction des animations. Pour un changement de recherche, vérifier refus, provenance, scores et sélection du contexte.

Une fusion dans `main` déclenche le déploiement Git Vercel. Les tests Node sont rejoués dans le build de production. Vérifier ensuite le site avec `scripts/check_public.py`. Les réglages GitHub de protection de branche restent distincts de la workflow versionnée.
