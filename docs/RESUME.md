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
