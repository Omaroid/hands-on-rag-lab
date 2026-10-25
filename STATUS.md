# État vérifiable — 25 octobre 2026

**Le baseline est fonctionnel ; le projet cible complet n'est pas déclaré terminé.**
Aucune ressource payante ni modification d'une application existante.

| Phase | Réalisé et vérifié | À comprendre | Risque/écart restant |
|---|---|---|---|
| 0 | Environnement, Python/Node/uv, versions de registres, plan Hobby, docs Vercel/LangGraph consultées | Gratuité = décisions de service + gardes applicatives | Réseau bloque les sources et le catalogue des modèles |
| 1 | Baseline Python exécuté ; chunking, hash, cosinus, top K, extraction, citations | Le hash lexical n'est pas un embedding neuronal | Sémantique et LLM non activés |
| 2 | Qdrant local réel, BM25, RRF, filtres, idempotence testée ; CLI d'ingestion bornée | Indexer et répondre sont deux responsabilités | Corpus officiel non ingéré, cluster Free dédié fourni ; accès non configurés |
| 3 | Neuf nœuds LangGraph, FastAPI/Pydantic, NDJSON, refus et citations testés | Diffusion après contrôle des preuves | Extraction, pas synthèse LLM ; API serverless fermée |
| 4 | Interface responsive, Explorer et comparaison ; 6 parcours desktop/mobile et axe réussis | Lire scores, passages et provenance | Compagnon public distinct du backend local |
| 5 | Quotas atomiques, HMAC, contrôles HTTP/SSRF, audits, secretlint, scan bundle | Un compteur par worker ne garantit pas un budget global | Pas de CAPTCHA ni compteur cloud distribué |
| 6 | 42 cas × 4 modes exécutés et enregistrés avec MLflow local | Le reranking peut dégrader le recall | Jeu synthétique proche du corpus ; pas d'évaluation LLM |
| 7 | Lockfiles, CI versionnée, builds frontend/backend ; Docker construit et démarré en non-root | Configurer une CI n'est pas l'exécuter sur GitHub | Compagnon Vercel READY ; backend cloud non publié |
| 8 | MCP stdio read-only testé ; guides, ADR et capture desktop fournis | Expliquer les limites fait partie du portfolio | Finalisation dépend des sources/poids/modèle et accès cloud |

## Publication

Compagnon interactif : https://lakehouse-rag-lab.vercel.app (production READY).
45 tests Python passent (dont 11 pour le raccordement cloud) ; les 6 parcours navigateur
par mode d’exécution du baseline ont été vérifiés précédemment.
Les assets publiés sont identiques au build testé ; le réseau empêche le test navigateur distant.
Le dépôt GitHub existant reste privé ; la CI ne réserve aucun runner dans ce cas.

## Blocage courant

L'utilisateur a indiqué qu'il allait ajouter les domaines requis dans la configuration réseau.
Le dernier contrôle de l'environnement indique encore une liste personnalisée vide ; les GET
vers docs.databricks.com et ai-gateway.vercel.sh sont refusés par le proxy. Cette restriction
n'a pas été contournée. Les paquets et sources GitHub officiels restent accessibles.

Une fois cet accès rétabli, reprendre dans l'ordre : revue robots/termes, corpus 20–50 pages,
embeddings réels évalués, index Free isolé, vérification du catalogue et du compte fournisseur,
quotas durables, génération cloud puis tests de bout en bout. Ne pas enlever les gardes pour
faire passer ces critères de fin sans les avoir satisfaits.

## Reprise — raccordement Qdrant

Le propriétaire a confirmé un cluster Free dédié et communiqué son endpoint (non secret).
La connexion n'a pas été testée : les secrets et le domaine ne sont pas encore observés comme
configurés. Un diagnostic CLI en lecture seule et 11 tests supplémentaires sont disponibles ;
le guide docs/CLOUD_SETUP.md contient les variables et domaines exacts. Aucune collection cloud
n'a été créée ni remplie avec les vecteurs de hash du baseline.

Dernier contrôle après publication de la configuration : révision 8 appliquée, politique réseau
restreinte, liste personnalisée vide et aucun secret/variable lié au runtime. Les GET Qdrant,
robots Databricks et catalogue AI Gateway restent refusés par le proxy. La connexion cloud
reste non vérifiée ; voir evidence/cloud-readiness.json.


## Dernière reprise — résultats qui remplacent les anciens blocages réseau

- `main` récupérée au commit de départ `59161a9` dans une copie propre.
- Politique réseau observée `enforced` ; variables et secrets Qdrant `ready`.
- Diagnostic officiel : HTTP 403 sur 6333 ; `collection_missing` sur **443 explicite**.
  La collection reste à créer après validation du corpus et du modèle. Aucune écriture.
- Robots des trois sources et catalogue AI Gateway : HTTP 200 ; revues de droits et
  éligibilité gratuite du compte encore nécessaires.
- 45 tests Python réussis (variables Qdrant retirées du processus de test pour rester
  en local), Ruff et mypy réussis. Ces résultats ne couvrent pas un déploiement cible complet.
- Aucun appel LLM, achat, ressource supplémentaire ni changement de plan ; coût obligatoire 0 €.

Action opérateur : définir `QDRANT_URL` avec `:443` dans la configuration cloud et l'appliquer.
Ne pas changer les clés sur la seule base du refus sur 6333. Les gardes d'ingestion et
serverless restent actives tant que les validations du projet cible ne sont pas terminées.


## Avancement après correction du port 443

- Configuration opérateur appliquée et diagnostic officiel relancé sans override :
  `collection_missing`, aucune écriture.
- Liste de 22 sources mise à jour : 19 URLs redirigeaient ; l'introduction Delta était
  introuvable et pointe maintenant vers l'accueil documentaire vérifié. Destinations
  contrôlées HTTP 200, preuve dans `evidence/source-url-review.json`.
- FastEmbed 0.9.1 installé en local. Métadonnées amont vérifiées : MiniLM multilingue,
  Apache-2.0, 384 dimensions, limite Sentence Transformers 128 tokens.
- Contrôle du tokenizer corrigé : comptage exact, tokens spéciaux inclus, sans troncature
  ni inférence pour un lot trop long. Trois tests de régression passent.
- CLI d'indexation protégée : la collection `lakehouse_docs_multilingual_*` refuse le hash
  et le corpus éditorial avant d'ouvrir un client distant. Deux tests ciblés passent.
- Poids et inférence non validés : le téléchargement du tokenizer redirige vers
  `us.aws.cdn.hf.co`, refusé par le proxy. Pas de modèle actif ni d'index créé.
- Revues des sources toujours pending, avec motifs actualisés dans la configuration.
  `www.databricks.com` est nécessaire pour lire les conditions liées depuis les pages.
- Catalogue AI Gateway disponible, mais éligibilité du compte et coupure à 0 € non
  vérifiées. Génération distante et API serverless restent fermées.

Les prochains travaux sont le test réel des poids/tokenizer, un chunking tenant compte du
titre et du budget de 128 tokens, l'évaluation FR/EN, puis une ingestion dont les droits sont
établis. Les 650 tokens estimés du baseline ne conviennent pas à ce petit modèle.


## Vérification intégrée du baseline — dernière exécution

- 54 tests Python réussis ; builds React/TypeScript backend et navigateur réussis.
- 6 parcours Playwright desktop/mobile réussis pour chacun des deux runtimes (12 au total),
  avec Chromium réel, vérification axe et absence de débordement.
- Corrigé un défaut de configuration des tests : origine 127.0.0.1 différente du localhost
  autorisé par l'API. La protection des origines reste stricte.
- `scripts/verify_web.py` démarre les serveurs locaux et un compteur de quotas neuf, retire
  les accès cloud des processus de test et arrête les serveurs à la fin. Les limites restent
  celles de l'application. Le workflow CI utilise désormais ce lanceur ; CI distante non exécutée.
- Site public et assets HTTP 200 ; JS/CSS identiques au build navigateur testé, en-têtes présents.
- Docker reconstruit puis démarré sans réseau ; UID 10001, réponse citée et injection refusée.
- 42 cas × 4 stratégies réévalués, quatre runs MLflow locaux exportés. Ces mesures concernent
  le hash lexical et les notes éditoriales, pas le futur modèle sémantique.
- Scan du bundle et secretlint réussis. Audits des dépendances enregistrés séparément.
- Diagnostic Qdrant sans override : collection_missing, mutations=false.

Preuves : `evidence/integration-current.json`, rapports Playwright, `evidence/evaluation.json`
et `evidence/mlflow-current.json`. L'ajout réseau demandé pour les poids n'est toujours pas
observé à la révision 11. Le corpus officiel, l'inférence et le backend cloud complet ne sont
pas validés. Coût obligatoire conservé à 0 €.
