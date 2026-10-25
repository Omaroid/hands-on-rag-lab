# Reprise — état vérifié le 25 octobre 2026

## Contraintes absolues

Coût obligatoire strictement 0 €. Aucun achat, upgrade, auto top-up, fallback facturable,
Azure/Kubernetes payant ni modification d'autres applications/bases. Aucun Supabase réutilisé.
Aucun secret dans Git, le chat ou le frontend. La CI privée reste désactivée.

## Dépôt et service

- `Omaroid/lakehouse-rag-lab`, `main`, privé.
- Compagnon public : https://lakehouse-rag-lab.vercel.app ; recherche dans le navigateur sur
  les 24 notes originales, hash lexical et réponses extractives.
- Backend sémantique vérifié : FastAPI, neuf nœuds LangGraph, ONNX CPU MiniLM multilingue,
  BM25/RRF et Qdrant Cloud Free dédié existant. Toujours extractif, aucun LLM distant.
- Endpoint Qdrant :
  `https://85462729-45d6-473d-b8aa-fc712b1b14c0.eu-west-1-0.aws.cloud.qdrant.io:443`.
- Collection `lakehouse_docs_multilingual_v1` : **1 034 points officiels**, 384 dimensions,
  cosinus ; index payload keyword `product` créé. Filtrer sans cet index échoue en mode strict.
- Les clés Qdrant et variables sont observées `ready`, politique réseau `enforced`.
  Les permissions supplémentaires d'exécution sont nécessaires dans ce sandbox pour le réseau
  et les tests TestClient ; le blocage AnyIO venait du sandbox. Ne pas changer les clés.

## Modèle et corpus

Le modèle FastEmbed 0.9.1 est `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`.
Poids ONNX quantifiés : `Qdrant/paraphrase-multilingual-MiniLM-L12-v2-onnx-Q`, révision
`faf4aa4225822f3bc6376869cb1164e8e3feedd0`. Cinq fichiers disponibles dans
`work/models/multilingual-minilm`, hors Git ; SHA-256 contrôlés par `scripts/verify_semantic.py`.
Limite réelle : 128 tokens, titre et tokens spéciaux inclus. Pas de téléchargement implicite.
L'API renvoie maintenant 422 pour une question dépassant cette limite.

Corpus officiel livré : `corpus/delta-official-semantic.json`, 20 documents du dépôt officiel
`delta-io/delta` à la révision `7c660debfc3ef2dab6006fa012b15a13cd5ffc69`.
Licence Apache-2.0, NOTICE et modifications dans `corpus/licenses/delta/`. Sources et empreintes
sont dans `evidence/delta-source-manifest.json`. Aucun code MDX/SQL n'a été exécuté.
Les citations pointent vers les fichiers exacts à cette révision. ADR 0006 explique ce choix.
Les revues des sites Databricks, Microsoft Learn et docs.delta.io demeurent pending ;
leur statut n'a pas été changé pour débloquer l'indexation. La revue Databricks reste différée.

## Commandes

Installer : `UV_CACHE_DIR=work/uv-cache uv sync --locked --group semantic`.
Lancer l'interface et l'API sur `http://localhost:8000` :

```bash
.venv/bin/python scripts/serve_semantic.py \
  --corpus corpus/delta-official-semantic.json \
  --model-dir work/models/multilingual-minilm --cloud --build
```

Le service retire `QDRANT_WRITE_API_KEY` de son environnement. Sans `--cloud`, Qdrant est local
en mémoire. `LAKEHOUSE_CORPUS` sélectionne le corpus ; un fichier explicite absent échoue.
Pour l'indexation admin, utiliser `scripts/index_qdrant.py` avec le backend multilingue,
le corpus officiel et la clé d'écriture ; une seconde passe a renvoyé 0 changement.
Pour régénérer le corpus, voir `scripts/ingest_delta_snapshot.py` et ADR 0006.

## Vérifications réellement réussies

- 64 tests Python ; Ruff, format, mypy, schémas des deux corpus.
- 42 cas × 4 stratégies avec vrais embeddings ; hybride Recall@4 = 0,9833, MRR = 0,9778.
  Ces mesures concernent le corpus éditorial synthétique, sans benchmark indépendant.
- 8 questions FR/EN sur le corpus officiel en local puis en cloud : réponses citées exactes.
- Tous les payloads distants sont identiques au corpus ; 3 vecteurs recalculés ont un cosinus
  proche de 1 avec les vecteurs distants. Voir `evidence/cloud-semantic-integration.json`.
- 12 parcours navigateur baseline + 6 parcours backend sémantique cloud desktop/mobile,
  avec axe, filtres, comparaison, sources réelles et provenance. Les tests cloud ont trouvé
  le défaut d'index payload, corrigé et retesté.
- L'intégration HTTP du modèle réel couvre réponse, NDJSON, injection, origine et fermeture
  serverless. Le dernier Docker du baseline reste historique, pas reconstruit dans cette reprise.

## Ce qui reste nécessaire pour une API publique et un LLM

La garde serverless reste fermée car aucun compteur atomique durable gratuit n'est raccordé.
Aucune intégration Upstash n'est installée dans l'équipe Vercel ; les bases existantes restent
hors périmètre. Une exploration documentaire confirme aussi des écritures Blob conditionnelles
par ETag, mais aucune ressource Blob, implémentation de quotas ou garantie de coût n'a été
créée/déclarée validée sur cette piste.

Le catalogue AI Gateway est lisible et annonce des modèles à prix nul. Cela ne vérifie ni
l'éligibilité du compte, ni les coupures et fallbacks du compte exact. Aucun accès LLM n'est
configuré dans l'environnement observé. Ne pas appeler de modèle ni demander une clé en chat.
Le compte Vercel utilisateur est Hobby ; aucun changement de plan n'a été effectué.

Poursuivre les quotas durables et les garanties fournisseur avant de déployer la vraie API
publique. Ne pas supprimer la garde ni annoncer la génération distante comme réalisée.


## Dernière publication

Les changements ont été poussés sur main ; le compagnon a été redéployé à partir du commit
`afea23a6a4301c1047ff37a2b11fce3bea572c6f`, déploiement
`dpl_ALgAGxsJCQBgu4PrFXH2mCJ2chio`, production READY. HTTP et assets vérifiés identiques au
build navigateur testé. Le navigateur distant du sandbox refuse la CA du proxy ; aucune
vérification TLS n'a été désactivée. Les tests locaux réels totalisent 18 parcours réussis,
dont 6 sur le chemin Qdrant Cloud. La synthèse actuelle est `evidence/integration-current.json`.


## Dernier contrôle budget gratuit

Voir `evidence/budget-validation.json` et la dernière section de COST.md. Compte utilisateur
Hobby confirmé ; solde AI Gateway gratuit et auto top-up non vérifiés. Le CLI 65.2.0 annonce
un budget minimum de 1 USD et les budgets Gateway sont souples (pas une garantie de facture
0 €). Aucun budget fournisseur n'a été modifié. Le CLI n'a pas d'identifiants existants et
le connecteur ne propose pas l'opération budget. Ne pas inventer un budget 0 activé, ni
relever le plafond pour débloquer. Aucun appel génératif, achat ou changement de plan.


## Reprise suivante — diagnostic de crédits prêt, secret non injecté

Le propriétaire demande de conserver le budget existant de 5 USD, sans le reconfigurer.
Il indique avoir enregistré la nouvelle clé dans les secrets de cette tâche. Le runtime
observé à la révision 11 est toutefois toujours lié à la configuration publiée
`057bbfbd-5978-40d3-b706-70276f47f466~cecfgver_6ade6e3982ec819e8215c67d00a946d8`,
qui ne lie que les deux secrets Qdrant ; `AI_GATEWAY_API_KEY` est absent du processus.
Le projet Vercel dédié ne contient aucune variable non plus. Ne pas rechercher la valeur
dans les fichiers ou réutiliser la clé précédemment publiée en chat.

`python -m lakehouse.gateway_setup --connect` est maintenant prêt : GET borné du solde,
aucun appel génératif, aucune modification de budget, aucun achat. La lecture du solde ne
prouve pas la gratuité des crédits ni l'état de l'auto top-up. Quinze tests couvrent la clé
manquante, les erreurs, les redirections, les montants invalides et l'absence de fuite.
Voir `evidence/gateway-readiness-current.json` et la fin de docs/CLOUD_SETUP.md pour le
raccordement du nouveau secret dans une nouvelle version de configuration.
