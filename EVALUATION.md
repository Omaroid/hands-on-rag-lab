# Évaluation

## Jeu et protocole

`config/evaluation.json` contient 42 cas : 24 factuels (dont anglais/acronymes), 6 multi-sources
ou comparaisons et 12 négatifs/ambigus/injections. Les tests pytest ajoutent des citations
forgées, URLs malveillantes et scénarios de concurrence des quotas. Les labels pertinents sont
des titres de notes ; plusieurs questions reformulent directement les notes. Ce jeu est un
smoke benchmark synthétique proche du développement, pas un jeu indépendant tenu à part.

Chaque mode exécute le vrai moteur Python et Qdrant local. K=4. Les métriques de retrieval sont
calculées sur les 30 cas documentaires ; le taux de refus correct sur les 12 cas négatifs.
Precision@4 utilise un dénominateur fixe de 4. Recall@4 mesure tous les documents étiquetés,
Hit@4 au moins un, MRR le rang du premier document pertinent. Le reranking est évalué après
son application. Le temps mesuré inclut le graphe, pas le transport réseau ni le démarrage.

## Résultats réellement exécutés

| Mode | Recall@4 | Precision@4 | MRR | Hit@4 |
|---|---:|---:|---:|---:|
| Lexical BM25 | 1,0000 | 0,2917 | 0,9611 | 1,0000 |
| Vectoriel hash | 0,9667 | 0,2750 | 0,9611 | 1,0000 |
| Hybride RRF | 0,9833 | 0,2833 | 0,9611 | 1,0000 |
| Hybride + rerank lexical | 0,9667 | 0,2750 | 0,9611 | 1,0000 |

Le reranking n'améliore pas ici le recall. Il reste désactivable ; ne pas choisir une option
parce qu'elle semble plus sophistiquée. Les latences individuelles, p50 et p95 sont dans
[evidence/evaluation.json](evidence/evaluation.json). Elles dépendent de la machine.

Le support exact des citations et les refus attendus sont à 100 % **sur ce jeu seulement**.
Le support exact est volontairement mécanique : toutes les phrases sont des extraits de notes.
Il ne mesure ni une synthèse générative, ni une adéquation factuelle aux pages officielles.
Les champs tokens LLM sont null, pas estimés ou inventés. Coût obligatoire des appels = 0,
car aucun appel fournisseur n'a lieu. Un coût théorique futur exige les prix et tokens réels.

## Reproduire et MLflow

```bash
uv sync --frozen --group evaluation
MLFLOW_ALLOW_FILE_STORE=true uv run --group evaluation python scripts/evaluate.py --mlflow
```

Les runs sont dans `work/mlruns`, sans serveur. MLflow 3.17 demande une activation explicite de
son backend fichiers en maintenance ; l'option est choisie ici pour des runs locaux éphémères.
Pour un historique partagé, migrer vers SQLite local avec les dépendances SQL adaptées ; ne
pas déployer un service payant. Seuls paramètres, métriques et cas publics sont suivis.

## Prochaine évaluation

Créer un jeu tenu à part à partir du corpus officiel, annoter les passages pertinents et
l'answerability avec un second lecteur, mesurer les variations de chunking (500/650/800 et
50/75/100), les embeddings multilingues, le contexte post-rerank, la qualité de synthèse,
la validité de chaque citation et la latence froide/chaude. Ajouter les questions partiellement
couvertes et les attaques indirectes nouvelles. Ne jamais publier les questions privées des
visiteurs pour enrichir le jeu sans consentement explicite.
