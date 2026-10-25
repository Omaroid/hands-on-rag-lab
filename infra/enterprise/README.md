# Extension entreprise — non déployée

Ce dossier est un canevas d'architecture, pas une infrastructure validée ou prête à appliquer.
Le fichier `.tf.example` ne contient aucune ressource exécutable. Aucun `terraform apply`
n'est autorisé par la livraison gratuite.

Chemin cible : Entra ID → frontend → Azure Container Apps (identité managée) → Azure OpenAI
via réseau privé ; documents versionnés dans ADLS, catalogués par Unity Catalog ; index
Databricks Vector Search. MLflow suit les évaluations sans enregistrer les questions privées.

Avant implémentation : budget explicitement autorisé, région, ACL de chaque document,
chiffrement, Private Link, journalisation expurgée, compteurs atomiques, plan de reprise.
L'adaptateur `Embedder`, l'interface `Generator` et les nœuds de retrieval permettent une
migration ciblée ; aucun client Azure ni accès à un espace Databricks n'est activé ici.
