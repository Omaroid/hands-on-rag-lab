# 4. Hybride, RRF et reranking

Les scores BM25 et cosinus n'ont ni la même échelle ni la même distribution. Les additionner
sans calibration peut favoriser arbitrairement un moteur. Reciprocal Rank Fusion utilise les
rangs : pour chaque passage, additionner `1/(60+rang)` dans chaque liste où il apparaît.

Un passage rang 1 dans deux listes reçoit `2/61`. Un passage présent dans une seule liste
rang 1 reçoit `1/61`. RRF ne prouve pas que les passages sont vrais ou suffisants.

Le reranking réordonne une liste courte selon une autre mesure. Le baseline calcule une
couverture de termes avec un bonus sur le titre ; ce n'est pas un cross-encoder neuronal.
Le jeu livré montre même une petite baisse de recall après ce reranking : une étape plus
complexe doit prouver son utilité. La possibilité de le désactiver est donc essentielle.
