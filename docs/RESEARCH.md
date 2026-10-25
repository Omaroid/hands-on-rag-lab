# Vérifications de sources et versions

Vérifications du 25 octobre 2026, sans paiement ni achat de crédits.

- Python 3.12.14, Node 24.19.0, uv 0.12.23 observés dans l'environnement.
- Versions PyPI interrogées directement avant verrouillage : FastAPI 0.162.0, Pydantic 2.14.1,
  LangGraph 1.2.17, Qdrant client 1.20.0, FastEmbed 0.9.1, MLflow skinny 3.17.2, MCP 2.3.0.
- Versions npm interrogées avant verrouillage : React 19.3.1, Vite 8.3.5, TypeScript 7.0.2,
  Playwright 1.64.1. Les versions exactes de transitives sont dans les deux lockfiles.
- Tags du dépôt officiel Qdrant consultés : v1.20.0 existe, version choisie pour Compose.
- FastAPI sur Vercel : https://vercel.com/docs/frameworks/backend/fastapi
  La documentation consultée confirme la détection ASGI et la promotion de fichiers statiques
  montés avec StaticFiles. La simple présence de cette fonctionnalité ne valide pas les quotas.
- LangGraph : https://docs.langchain.com/oss/python/langgraph/graph-api
  État, nœuds, edges, compilation et invocation vérifiés par documentation et exécution.
- MCP 2.3.0 : l'API installée utilise MCPServer et des attributs snake_case. Les signatures
  ont été inspectées et les trois schémas d'outils testés ; ne pas recopier FastMCP v1.
- FastEmbed : le modèle multilingue choisi est réellement dans list_supported_models().
  Ses métadonnées indiquent 384 dimensions et 128 tokens ; poids et inférence non validés.
- AI Gateway : https://vercel.com/docs/ai-gateway/pricing
  Crédit gratuit et sous-ensemble de modèles ; catalogue live non téléchargeable via réseau
  actuel. Aucun identifiant de modèle distant n'est inventé ni invoqué.
- Qdrant Free : https://qdrant.tech/pricing/ — offre de prototype consultée ; aucune console
  de cluster n'est inspectée et aucune ressource n'est créée.
- Vercel Hobby : https://vercel.com/docs/plans/hobby — plan de l'équipe connectée confirmé
  avec le connecteur. Portfolio personnel ; ne pas supposer une autorisation commerciale.
- Microsoft Learn robots consulté via connecteur web : https://learn.microsoft.com/robots.txt
  Les chemins Azure Databricks ne sont pas dans les exclusions générales observées.
- Conditions Microsoft Learn : https://learn.microsoft.com/en-us/legal/termsofuse
  Une revue de licence propre aux contenus reste nécessaire avant redistribution.
- robots.txt Databricks/Delta inaccessibles depuis les outils testés. Les revues restent pending.

Les sources ont servi à vérifier des choix techniques. Elles ne sont pas présentées comme
un corpus documentaire déjà ingéré. Aucun prix ou quota fournisseur supposé n'active une API.
