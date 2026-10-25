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
