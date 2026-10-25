# 1. Vecteurs, embeddings et similarité

Un embedding transforme un texte en vecteur numérique pour rapprocher des formulations
sémantiquement proches. Il est appris par un modèle ; une dimension seule ne dit rien du sens.
Le cosinus `a·b / (||a|| ||b||)` compare la direction des vecteurs. Avec des vecteurs normalisés,
il se réduit au produit scalaire. Un vecteur nul n'a pas de direction utile.

Dans ce dépôt, hash_embedding est un baseline de termes : SHA-256 choisit une coordonnée et un
signe, puis le vecteur est normalisé. Il est déterministe mais n'apprend aucune sémantique.
Le petit dictionnaire FR/EN est visible et ne constitue pas un modèle multilingue.

Exercice : comparer « transactions Delta Lake » et « garanties atomiques ». Observer ce que
le hash manque, puis expliquer pourquoi un vrai modèle peut rapprocher des paraphrases.
Ne jamais mélanger des vecteurs de deux modèles dans la même collection.

Le modèle optionnel multilingue MiniLM produit 384 dimensions et est limité à 128 tokens
selon sa configuration Sentence Transformers. Un token n'est pas un nombre fixe de caractères :
accents, ponctuation et identifiants techniques changent le découpage. L'adaptateur charge
le tokenizer local sans troncature et compte les tokens spéciaux avant de lancer l'inférence.
Il rejette tout le lot si un texte dépasse la limite. Le titre préfixé par le moteur doit
également tenir dans ce budget ; le chunking du baseline (650 tokens estimés) doit donc être
réévalué avant indexation sémantique.

## Préparer les chunks sémantiques sans accès cloud

Installer le groupe optionnel : `uv sync --locked --group semantic`. Les tests de tokenizer
nécessitent ce groupe ; sans lui, ces tests optionnels sont marqués skipped.
Le modèle ONNX quantifié référencé par FastEmbed 0.9.1 est
`Qdrant/paraphrase-multilingual-MiniLM-L12-v2-onnx-Q`, révision vérifiée
`faf4aa4225822f3bc6376869cb1164e8e3feedd0`. Les fichiers requis incluent
`config.json`, `tokenizer.json`, `tokenizer_config.json`, `special_tokens_map.json` et
`model_optimized.onnx`. Les téléchargements observés redirigent vers `us.aws.cdn.hf.co` ;
ce domaine doit être présent dans la politique effectivement appliquée. Ne pas contourner
un refus du proxy. La licence du modèle est Apache-2.0, distincte des droits sur le corpus.

Une fois les fichiers disponibles dans un répertoire local :

```bash
uv run --group semantic python scripts/rechunk_semantic.py \
  --corpus corpus/editorial.json \
  --model-dir work/models/multilingual-minilm \
  --output work/editorial-semantic.json \
  --tokens 128 --overlap 16
```

Cette commande ne contacte ni Qdrant ni un fournisseur d'inférence. Elle garde l'entrée
intacte, conserve la provenance et produit les nouveaux IDs/hashes de façon déterministe.
Le budget inclut titre, séparateur et tokens spéciaux, exactement comme les embeddings du
moteur. Le découpage privilégie les espaces proches de la limite ; les blocs trop longs
peuvent être coupés. Le chevauchement se mesure avec le tokenizer ; titres, sections, URL et
langue restent dans les métadonnées. Les notes éditoriales restent éditoriales après découpage.
Ne pas les injecter dans la collection réservée au corpus officiel.

La validation avec un tokenizer synthétique couvre les bornes, Unicode, l'absence de perte
de caractères, le chevauchement, la stabilité des IDs et les métadonnées. Elle ne remplace
pas un essai des poids réels ni une évaluation de recherche FR/EN sur données tenues à part.
