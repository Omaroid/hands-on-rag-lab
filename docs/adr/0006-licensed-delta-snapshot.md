# ADR 0006 — Corpus officiel Delta Lake depuis un instantané Git sous Apache-2.0

Statut : accepté, 25 octobre 2026.

La revue des sites web Databricks/Microsoft Learn/Delta demeure pending. Pour avancer sans
présumer de leurs conditions, un corpus distinct est constitué depuis les objets Git de
`https://github.com/delta-io/delta.git`, révision
`7c660debfc3ef2dab6006fa012b15a13cd5ffc69`. Les 20 fichiers documentaires sélectionnés
sont dans ce dépôt officiel, couvert par LICENSE.txt Apache-2.0 et NOTICE.txt. Le manifeste
conserve les SHA-256 des sources. Aucun code MDX ni exemple SQL n'est exécuté.

Les licences, notices et modifications sont livrées dans `corpus/licenses/delta/`. Les
citations pointent vers le fichier exact à la révision ingérée, plutôt que vers une page
web dont l'identité avec le contenu ingéré ne serait pas démontrée. La validation des URL
n'autorise que ce dépôt, les chemins documentaires et une révision de 40 chiffres hexadécimaux.

Le corpus officiel et son index sémantique restent distincts du baseline éditorial. Le chemin
`LAKEHOUSE_CORPUS` choisit explicitement le corpus du backend ; un fichier configuré absent
provoque un échec. Le compagnon public utilise toujours les notes originales.

L'indexeur seul crée/alimente la collection dédiée et l'index keyword sur `product`, exigé
par le mode strict Qdrant Cloud pour les filtres. Le processus de service n'a pas de clé
écriture. La vérification compare tous les payloads et trois vecteurs recalculés avec les
valeurs distantes, puis contrôle huit réponses FR/EN et leurs citations exactes.

Aucun quota distribué n'est simulé. Sans stockage atomique durable gratuit ni garanties
fournisseur vérifiées, la génération distante et l'API serverless publique restent fermées.
