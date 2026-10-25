# 3. Lexical, dense et Qdrant

La recherche lexicale retrouve les termes. BM25 pondère leur fréquence, leur rareté dans le
corpus et la longueur du passage. Elle est utile pour noms de commandes, acronymes et messages
d'erreur. Elle peut manquer une paraphrase sans mots communs.

Une recherche dense compare des vecteurs. Avec un modèle sémantique, elle peut rapprocher des
formulations différentes. Ici le vecteur est un hash lexical : son apparence dense ne lui
confère pas la sémantique d'un réseau neuronal.

Qdrant conserve les vecteurs et leurs métadonnées, calcule la similarité et filtre les produits.
Il n'écrit pas les réponses et ne vérifie pas leur vérité. La BM25 explicite utilise le même
instantané de chunks pour que la comparaison porte sur les stratégies, pas sur des corpus différents.

Exercice : filtrer Delta Lake, chercher Unity Catalog, constater un résultat pauvre ou un refus.
Un filtre appliqué avant la recherche fait partie du contrat de sécurité et de pertinence.
