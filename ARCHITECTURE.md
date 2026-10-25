# Architecture

## Arborescence

```text
backend/lakehouse/     modèles, chunking, retrieval, graphe, API, quotas, MCP
frontend/             React/TypeScript, moteur navigateur et tests Playwright
corpus/               24 notes originales ; official.json seulement après ingestion autorisée
config/               URLs explicites, revues des termes, 42 cas et schéma API
scripts/              ingestion/indexation/évaluation/validation
infra/enterprise/     architecture optionnelle, templates non appliqués
docs/adr/             décisions et compromis
docs/learning/        progression pédagogique
evidence/             résultats effectivement exécutés, captures
```

## Deux exécutions distinctes

**Locale complète pour le baseline** : React appelle FastAPI. La validation Pydantic précède
la réservation atomique de quota. LangGraph orchestre neuf fonctions. Qdrant stocke et compare
les vecteurs ; BM25 est implémenté explicitement sur le même instantané de chunks. Le score
lexical n'est pas pris pour une probabilité. RRF additionne `1/(60+rang)` par liste.
Un reranker lexical gratuit calcule la couverture de la question, sans se prétendre neuronal.

**Publique statique** : React embarque les 24 notes et un moteur JavaScript en mémoire. Hash,
BM25, RRF, extraction et refus s'exécutent sur le terminal du visiteur. Aucun backend Qdrant
n'est invoqué et cette différence est affichée. Cette édition est utilisable pour explorer les
mécanismes, mais ne valide pas une architecture RAG cloud complète.

## Ingestion séparée du service public

La CLI n'accepte que les URLs du manifeste et trois hôtes officiels HTTPS. Microsoft Learn
est limité au chemin Azure Databricks. Les redirects, ports non standard, query strings,
identifiants d'URL et destinations IP privées sont refusés. Un échec réseau ou une revue des
termes absente/expirée empêche tout remplacement du corpus. Une revue des termes doit comporter
une URL, une date et le SHA-256 de la preuve conservée ; robots.txt est relu à l'exécution.

L'extracteur supprime scripts/navigation, conserve les titres, paragraphes, listes, tableaux
et code. Le chunking utilise un budget estimé en caractères/3 (pas un vrai tokenizer), 650 tokens
estimés et 75 de chevauchement par défaut. Les identifiants dépendent de l'URL, du chemin de
section et de la position locale ; le hash de contenu indique ce qui doit être ré-embeddé.
Une insertion avant un chunk de la même section peut déplacer ses ordinaux : stabilité par
section, pas une promesse absolue d'identité à travers toutes les éditions.

L'indexeur admin est séparé. Les écritures ne sont autorisées que dans une collection
`lakehouse_*`, avec confirmation du niveau Free pour les hôtes distants. `--prune` supprime
explicitement les chunks absents de ce corpus dédié. Le backend de service n'indexe pas au
startup s'il utilise Qdrant distant ; il attend un index déjà préparé et une clé read-only.

## Graphe et preuves

`validate_input → normalize_or_rewrite_query → retrieve_documents → hybrid_fusion →
rerank_documents → grade_context → generate_answer_or_refuse → verify_citations → format_response`.

La normalisation est Unicode/espaces, sans réécriture LLM cachée. Les refus traversent les
nœuds suivants sans retrieval ni génération inutiles. Le contexte exclut les formulations
d'injection connues, impose deux termes pertinents et au moins 45 % de couverture lexicale.
Ce seuil est un point de départ mesuré sur le baseline, pas un détecteur universel de pertinence.

Le générateur actif sélectionne des phrases exactes. Le validateur impose l'identité du chunk,
l'URL et la présence littérale du passage ; il vérifie que toute la réponse se réduit à ces
citations. C'est une garantie extractive, pas une preuve d'entailment pour une synthèse LLM.
La diffusion NDJSON commence après validation de la réponse. Elle est un streaming de transport,
pas un streaming de tokens d'un fournisseur absent.

## Embeddings et migrations

`Embedder` définit `embed`, `dimensions`, `name`. Le baseline est `local-hash-384` avec petit
lexique FR/EN explicite. La similarité par hash reste lexicale, même si le vecteur est dense.
Un adaptateur FastEmbed optionnel choisit un modèle multilingue réellement présent dans les
métadonnées du paquet 0.9.1. Il exige des fichiers locaux, refuse les téléchargements automatiques
et les passages trop longs. Son inférence n'a pas été validée sans les poids.

Toute migration exige un nouvel index avec la même convention document/question et la même
version d'embedding. Une dimension compatible ne signifie pas un espace vectoriel compatible.
L'adaptateur `Generator` sépare génération et moteur ; aucun appel Azure/Mistral n'est actif.
Les templates entreprise décrivent Azure OpenAI, Databricks Vector Search et Unity Catalog.

## Observabilité

Seuls les benchmarks publics sont inscrits dans MLflow local. En production : aucune question,
aucune IP claire, aucun prompt ni secret dans les logs applicatifs. Les métriques retournées
au visiteur sont latence, scores, refus et type de moteur. Aucun token LLM fictif n'est affiché.
Les logs d'accès du fournisseur d'hébergement ont leur propre politique de conservation ; le
code applicatif ne peut pas promettre leur absence dans l'infrastructure du fournisseur.
