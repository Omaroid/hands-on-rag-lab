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


## Reprise du budget Gateway — contrôle du 25 octobre 2026

Instruction actuelle : régler le budget pertinent à 5 USD, sans achat, auto-recharge,
ajout de moyen de paiement ni changement de plan ; coût obligatoire 0 €.
Cette instruction remplace la consigne historique de ne pas reconfigurer le budget.

Réalisé : main récupéré à `f4701e6`, résumé lu. Aucune modification locale préexistante
observée dans cette session ; les trois changements signalés n'étaient pas présents.
Les deux variables VERCEL_TOKEN et AI_GATEWAY_API_KEY sont présentes, sans affichage
ni sauvegarde de leurs valeurs. La configuration réellement attachée, révision 2,
lie ces secrets aux domaines appropriés. Les observations sont actuelles, mais leurs
états de préparation et celui de la politique sont `unknown`, donc pas déclarés `ready`.
L'accès réel via le proxy à api.vercel.com fonctionne au niveau HTTP, sans prouver
une autorisation de gestion. GET Gateway /v1/credits : HTTP 200, solde 0 USD,
usage cumulé 0 USD. Guide AI Gateway et référence spend-observability lus ; aide
actuelle du CLI 65.2.0 consultée pour budgets set/list et api-keys inspect.

Bloqué : GET Vercel /v2/user → 404 User not found ; /v2/teams → 403 ;
/v5/user/tokens/current → 404 Token not found ; /ai-gateway/directory/keys → 403 ;
/ai-gateway/budgets/list → 404 AI Gateway Budget not found. Ce dernier résultat
ne démontre pas l'absence de budget dans l'équipe propriétaire inconnue.
L'équipe de la clé n'est pas identifiée et n'est pas assimilée à celle du connecteur.
Aucun budget inspecté avec succès, modifié ou relu : **5 USD reste non vérifié**.
Il faut rétablir l'autorisation de gestion du jeton via le mécanisme sécurisé de
configuration de tâche, puis identifier l'équipe de la clé et son budget avant toute écriture.
Ne jamais fournir un secret en chat.

L'éligibilité gratuite du compte exact et l'auto top-up désactivé restent inconnus.
La référence AI Gateway indique qu'un moyen de paiement valide est requis pour débloquer
les crédits gratuits ; aucune carte n'a été ajoutée et aucune éligibilité n'est déduite
du seul solde. Budget souple : une requête peut franchir la limite, propagation différée,
BYOK hors compteur. Il ne garantit ni plafond strict de 5 USD ni facture 0 €.
Aucun appel génératif, achat, recharge, ajout de paiement, changement de plan ou
modification d'autre projet. La garde serverless reste fermée faute de compteur atomique
durable gratuit. Preuve actuelle : `evidence/gateway-readiness-current.json`.


## Interface guidée — modifications locales du 25 octobre 2026

Présentation « Lakehouse Knowledge », mentions de budget et marqueurs LAB/v0.1 retirés
 de l'interface. Parcours interactif question/pistes/preuves/réponse, explications des
filtres et stratégies, lecture des classements et conseils en cas de refus. Les nombres
proviennent des résultats réels ; aucune progression de pipeline simulée. Provenance
éditoriale/officielle et fonctionnement extractif conservés. Aucun backend ni garde modifié.
Validation : build TypeScript/Vite réussi, 8 tests Playwright desktop/mobile réussis,
contrôle axe et absence de débordement, captures du rendu inspectées. Rapports temporaires
sous work/. Publication effectuée, voir ci-dessous.


## Publication de l’interface guidée

Tous les changements ont été poussés sur main. Interface déployée en production depuis
`57a7b02bc1973c1ad891bbfdb28c12890f675955`, déploiement
`dpl_22BfV94vw6QEReEHigbDi6AA6cLt`, READY, domaine
https://lakehouse-rag-lab.vercel.app. HTTP 200 ; JS et CSS identiques au build testé.
Les 8 tests Playwright passent aussi sur le domaine public, desktop et mobile,
avec parcours guidé, citations, refus, filtres, comparaison, architecture, axe et débordement.
Aucune génération distante ni modification de la garde serverless. Les blocages Gateway
restent ceux documentés ci-dessus. Preuve : evidence/publication-current.json.


## Demande d’activation IA — nouveau contrôle

La configuration attachée est maintenant observée à la révision 5 : secrets Gateway et
Vercel ready, politique réseau enforced. Cela ne résout pas l’autorisation effective :
GET /v2/user renvoie toujours 404 User not found, /v2/teams 403 ; GET Gateway /v1/credits
renvoie 200, balance 0 et total_used 0. Aucune génération lancée, garde serverless fermée.
Le site publié reste extractif. Choix demandé entre poursuivre Gateway sous les contraintes
existantes et intégrer un modèle exécuté sur l’appareil du visiteur ; cette seconde voie
nécessite de vérifier téléchargement, licence, mémoire, compatibilité et qualité FR.


## IA exécutée dans le navigateur

Le propriétaire a choisi une génération sur l’appareil du visiteur. Intégration Qwen3 0,6B
ONNX q4, révision épinglée, Transformers.js 4.3.1, WASM dans un worker à un thread.
Activation explicite après annonce d’environ 950 Mo, progression, arrêt/déchargement,
timeouts, contexte borné et 160 nouveaux tokens. Aucun Gateway, clé frontend ou backend
serverless activé. La recherche extractive reste indépendante et disponible en cas d’échec.
Les réponses générées sont distinctes des passages sources, sans garantie d’exactitude.
Le candidat précédent Qwen2.5 0,5B a été écarté après deux réponses françaises inadéquates.
Voir docs/BROWSER_AI.md pour l’utilisation, la provenance, la licence et les limites.

Validation IA locale : poids réels chargés, génération Qwen3 terminée en français dans
Chromium sous la CSP de production. La phrase produite reste imprécise (« système
d’accompagnement des transactions »), ce n’est pas une réponse factuellement validée.
Le modèle compact n’a pas de garantie de qualité ; références et avertissement sont visibles.
Le cache navigateur du sandbox a refusé les poids, sans empêcher l’inférence : ne pas promettre
le mode hors ligne. 14 tests d’interface passent sur desktop/mobile, y compris compatibilité,
arrêt et échec simulé du worker ; aucun test d’inférence sur téléphone physique.
Preuve : evidence/browser-ai-current.json. Build et détection de secrets réussis.

Dernier réglage de fidélité : repetition_penalty=1.0, pour ne pas pénaliser les mots
présents dans les sources. Nouvelle génération réelle sous CSP : « [1] Delta Lake fournit
des transactions ACID. » Cette phrase est étayée mais peu informative ; ne pas revendiquer
une qualité technique générale. Les 14 parcours d’interface passent aussi en production.
Notices Transformers.js et ONNX Runtime distribuées sous frontend/public/licenses.
