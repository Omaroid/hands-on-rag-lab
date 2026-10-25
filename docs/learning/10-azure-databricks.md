# 10. Migration vers Azure et Databricks

Conserver le contrat Embedder et Generator, puis remplacer les adaptateurs. Azure OpenAI
impose une authentification, un déploiement de modèle, des quotas et un budget vérifiés ; les
noms et API doivent être lus dans leur documentation actuelle, pas copiés d'un souvenir.

Databricks Vector Search peut remplacer l'index Qdrant dans une architecture entreprise.
Unity Catalog gouverne identités, objets, permissions et lineage ; il ne suffit pas de filtrer
les résultats dans le frontend. Les ACL doivent restreindre les passages avant leur mise en contexte.

Les documents peuvent être versionnés dans ADLS, les embeddings recalculés seulement sur les
sections modifiées et les évaluations suivies avec MLflow. Private Link et identités managées
réduisent certaines expositions mais ne remplacent pas les contrôles applicatifs.

Ce chemin est documentaire ici. Le fichier Terraform porte l'extension .example et ne crée
rien. Aucun déploiement Azure, Kubernetes ou Databricks payant n'est autorisé par le projet gratuit.
