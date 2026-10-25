# Delta Lake — note pédagogique originale
## Transactions
Delta Lake utilise un journal de transactions pour apporter des transactions ACID aux tables du lac de données. Le journal enregistre les versions successives de la table et les fichiers associés.

## Historique
Le time travel permet de lire une version antérieure de la table, tant que les fichiers requis sont conservés. VACUUM supprime des fichiers anciens et peut rendre certaines versions historiques illisibles.
