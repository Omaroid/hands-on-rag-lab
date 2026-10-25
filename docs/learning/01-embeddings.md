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
