# 9. MCP, Docker et CI

MCP donne à un client un protocole standard de découverte et d'appel d'outils. Il ne rend pas
un outil sûr par son nom. Les trois outils de ce dépôt recherchent, répondent et listent les
sources locales ; aucune écriture ni commande n'est exposée. Le transport stdio évite de
publier une nouvelle API qui contournerait les quotas HTTP.

Docker fige un environnement d'exécution et isole les dépendances, pas la vérité des réponses.
Le conteneur utilise un utilisateur non-root et un healthcheck. Compose ajoute Qdrant et un
indexeur initial, avec ports locaux et volumes dédiés.

La CI répète types, tests, refus, sécurité, audits, builds et parcours navigateur. Une case
cochée dans un YAML n'est pas une preuve de passage : vérifier le run réel et conserver les
rapports. Les lockfiles empêchent une mise à jour implicite, pas toutes les vulnérabilités.
