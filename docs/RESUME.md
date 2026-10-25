# Reprendre après application de la configuration cloud

## Pourquoi cette reprise

Le propriétaire a ajouté les domaines et secrets puis publié sa configuration. Le runtime de
la conversation initiale reste lié au même `source_config_version_id` qu'au démarrage ; les
révisions de runtime ont atteint 11, mais la liste de domaines personnalisés, les secrets et
les variables observés restent vides. Ne pas redemander ni recréer les clés pour ce motif.
Appliquer la version publiée à la tâche ou lancer une nouvelle tâche avec cette configuration.
Les réglages réellement reçus doivent être revérifiés, sans afficher de valeur de secret.

## État sauvegardé

- Dépôt `Omaroid/lakehouse-rag-lab`, branche `main`, privé.
- Compagnon public : https://lakehouse-rag-lab.vercel.app ; retrieval navigateur extractif.
- Backend local : FastAPI/Pydantic, Qdrant réel, neuf nœuds LangGraph, BM25, RRF, refus et citations.
- 45 tests Python passent ; 11 nouveaux tests couvrent le diagnostic cloud.
- Les 6 parcours Playwright par runtime du baseline ont été vérifiés précédemment.
- 42 cas × 4 stratégies ont été évalués avec MLflow local.
- Docker non-root construit et démarré ; aucune ressource cloud payante créée.
- Le corpus contient 24 notes originales ; il n'est pas encore un corpus officiel ingéré.
- Les embeddings actifs sont du hash lexical, pas un modèle sémantique.
- Aucun appel LLM distant actif et aucune génération payante autorisée.

## Raccordement attendu

Le propriétaire confirme un cluster Qdrant **Free dédié existant** :
`https://85462729-45d6-473d-b8aa-fc712b1b14c0.eu-west-1-0.aws.cloud.qdrant.io:443`.

Voir docs/CLOUD_SETUP.md pour les domaines et les noms de variables/secrets. Les valeurs des
clés n'ont pas été communiquées dans la conversation et ne doivent pas l'être. Elles doivent
être injectées dans l'environnement effectif. La collection sémantique prévue est
`lakehouse_docs_multilingual_v1` ; ne pas la remplir avec les vecteurs de hash du baseline.

## Prochaines étapes

1. Lire le guide Cloud Environment ; vérifier l'état courant, les noms des secrets et les
   domaines réellement appliqués. Ne pas lire ou afficher les valeurs pour les rechercher.
2. Installer les dépendances verrouillées ; lancer `uv run python -m lakehouse.cloud_setup --connect`.
   Un résultat `collection_missing` est normal avant indexation. Ce diagnostic est read-only.
3. Vérifier robots.txt, conditions et licences avant d'approuver une ingestion bornée des URLs
   de config/sources.json. Les revues sont volontairement pending.
4. Vérifier les modèles multilingues actuels et leurs poids, tokenizer et limites. L'adaptateur
   FastEmbed existant est optionnel et son inférence n'a pas encore été testée.
5. Évaluer les embeddings puis indexer le corpus officiel dans une collection dédiée versionnée.
   Conserver la clé d'écriture uniquement dans l'environnement d'ingestion et limiter la clé
   de service à la lecture de cette collection.
6. Vérifier le catalogue AI Gateway et l'éligibilité gratuite du compte, sans achat de crédits,
   auto top-up ou fallback payant. Ne pas inventer de nom de modèle ni un budget dur non vérifié.
7. Ajouter des quotas atomiques durables gratuits avant toute API serverless publique. Upstash
   Redis Free a été repéré dans la documentation, mais n'a pas été créé ou raccordé.
8. Tester puis déployer la vraie API ; conserver le compagnon statique tant que les critères
   précédents ne sont pas satisfaits. Ne pas supprimer la garde serverless pour simuler un succès.

Contraintes absolues : 0 € obligatoire, aucune modification des applications ou bases existantes,
aucun Supabase existant réutilisé, aucune ressource Azure/Kubernetes payante, aucun secret dans
le chat ou le frontend. Lire README.md, COST.md, SECURITY.md, STATUS.md et les ADR avant de changer
l'architecture. Ne déclarer réussis que les contrôles réellement exécutés.

## Point de reprise le plus récent

Le propriétaire a appliqué le port 443 : le diagnostic sans override retourne
`collection_missing`. Les URLs candidates ont été actualisées, le contrôle des 128 tokens
corrigé et les gardes d'indexation/recherche sémantique renforcées. Une commande offline de
rechunking est disponible : `scripts/rechunk_semantic.py` ; lire le chapitre embeddings.

Le propriétaire préfère avancer sur les autres composants sans ajouter le domaine des
conditions Databricks. Cette revue reste pending, sans bloquer le travail local.
Il a ajouté puis réappliqué `us.aws.cdn.hf.co`, mais les observations du runtime à la révision 9
restent liées à la version `057bbfbd-5978-40d3-b706-70276f47f466~cecfgver_6ade68afe63c819e9407137a4dc12af8`,
sans ce domaine. Le proxy refuse encore le téléchargement du tokenizer. Ne pas demander
encore une simple réapplication ni les clés : une reprise avec la configuration publiée
contenant effectivement le domaine est nécessaire si le runtime ne se met pas à jour.

L'inférence ONNX et l'évaluation sémantique réelle ne sont donc pas encore exécutées.
Aucun index distant n'est créé ; la génération distante reste désactivée. Coût obligatoire 0 €.


## Baseline désormais revérifié de bout en bout

Lire `evidence/integration-current.json` et la dernière section de STATUS.md : 54 tests Python,
12 parcours navigateur, assets publics identiques au build testé, Docker non-root sans réseau
et 42 cas × 4 stratégies réévalués. Le lanceur reproductible est `scripts/verify_web.py`.
Les audits et scans sont conservés dans evidence. La CI privée reste fermée pour préserver 0 €.

Le runtime observé à la révision 11 reste sans `us.aws.cdn.hf.co`. Une nouvelle tâche doit
être attachée à la configuration publiée contenant ce domaine si cette conversation conserve
son ancienne version. Ne pas redemander les secrets ni une réapplication identique.
Continuer ensuite par téléchargement des poids à révision fixée, inférence CPU, rechunking
et évaluation sémantique locale. La revue Databricks reste volontairement différée par le
propriétaire ; ne pas l'approuver artificiellement pour débloquer l'ingestion.


## Reprise du 25 octobre — inférence multilingue CPU exécutée

- Départ : `main`, commit `80fd9f1`. Dépendances installées avec `uv sync --locked --group semantic`.
- Les cinq fichiers Qdrant ONNX à la révision `faf4aa4225822f3bc6376869cb1164e8e3feedd0`
  ont été téléchargés via le proxy autorisé, y compris `us.aws.cdn.hf.co`.
  Tailles et SHA-256 sont dans `evidence/semantic-integration.json` ; les poids restent dans
  `work/`, hors Git. Le vérificateur refuse des fichiers dont les sommes diffèrent.
- Inférence réelle ONNX CPU : 384 dimensions finies ; proximité FR/EN supérieure au témoin
  hors sujet. Dépassement de 128 tokens effectivement refusé.
- Rechunking du corpus éditorial : 24 passages ; chaque titre et texte tient dans 128 tokens.
  Ce corpus reste éditorial, sans ingestion ni indexation cloud.
- Intégration réelle locale du modèle, Qdrant en mémoire et des neuf nœuds LangGraph :
  42 cas × 4 stratégies exécutés. Hybride : Recall@4 = 0,9833, MRR = 0,9778 ;
  citations exactes = 1,0 et refus attendus = 1,0. Jeu synthétique proche du corpus,
  sans démonstration de généralisation à des données tenues à part.
- Ruff et mypy passent ; 50 tests Python passent, 4 tests HTTP désélectionnés après blocage
  de TestClient dans ce sandbox (attente du portail AnyIO). Les 54 tests ne sont donc pas
  déclarés repassés sur cette reprise. Aucun nouveau résultat navigateur ou Docker.
- La tentative du diagnostic Qdrant read-only a été empêchée avant exécution : revue
  automatique d'approbation indisponible pour limite d'usage. Aucun nouveau statut Qdrant
  ne peut être déduit. Aucun secret consulté, aucune mutation distante, aucun achat.
- Génération distante et API serverless restent fermées. Revue Databricks toujours différée.
  Coût obligatoire conservé à 0 €.

Commande reproductible locale (ne contacte pas Qdrant Cloud) :

```bash
.venv/bin/python scripts/verify_semantic.py \
  --model-dir work/models/multilingual-minilm \
  --output work/semantic-integration.json
```

Ajouter `--http` seulement dans un environnement où TestClient/AnyIO fonctionne pour vérifier
réponse citée, NDJSON, refus des injections/origines et maintien de la fermeture serverless.
Cette option est implémentée, mais son exécution actuelle n'a pas abouti.
Prochaine étape : rétablir la capacité d'exécution approuvée pour les contrôles HTTP/cloud,
relancer le diagnostic Qdrant, puis poursuivre uniquement les sources dont les droits sont
validés. Aucun contournement des gardes, aucun appel facturable pour débloquer l'intégration.
