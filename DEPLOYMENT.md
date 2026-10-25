# Déploiement gratuit

## Cible livrée

L'édition publique est statique (retrieval dans le navigateur). `vercel.json` sélectionne
`frontend/dist` et `VITE_RUNTIME=browser`. Aucun runtime Python ni fournisseur distant n'est
nécessaire pour cette édition. Ne pas la présenter comme l'intégration cloud complète.

URL : **https://lakehouse-rag-lab.vercel.app**

Déploiement production READY ; HTML, JavaScript et CSS retournent 200 via le connecteur Vercel.
Les deux assets sont identiques octet pour octet au build local testé. Les en-têtes de sécurité
sont présents. Le navigateur de cet environnement ne peut pas atteindre vercel.app à cause de
la politique réseau ; les parcours navigateur ont donc été exécutés localement, sans prétendre
à une vérification navigateur distante. Voir `evidence/deployment.json`.
Équipe prévue : `omar-laraquis-projects`, plan Hobby vérifié avant création.
Nouveau projet dédié : `lakehouse-rag-lab`. Aucune application existante modifiée.

## Local

Voir README. Le backend FastAPI et l'interface construite partagent le port 8000. Pour servir
l'interface avec Vite sur 5173, définir APP_ORIGIN à `http://localhost:5173`, puis lancer le
backend et le dev server. Pas de wildcard CORS.

## Qdrant Cloud Free (cluster existant, connexion en attente)

Le propriétaire a fourni un cluster **Free dédié** existant. Le raccordement attend encore
l’application des domaines réseau et des secrets. Suivre [CLOUD_SETUP.md](docs/CLOUD_SETUP.md).
Créer uniquement un index isolé. Ne pas accepter un essai qui se convertit en offre
payante. Vérifier la console avant de définir `QDRANT_PLAN_CONFIRMED_FREE=true` pour l'indexeur.
Utiliser `QDRANT_WRITE_API_KEY` pour l'indexation, puis une clé read-only différente avec
`QDRANT_API_KEY` pour le service. Entrer les secrets dans un gestionnaire de secrets serveur,
jamais dans le chat ou dans une variable `VITE_*`.

```bash
uv run python -m lakehouse.ingestion
# Uniquement quand robots et termes sont réellement approuvés :
uv run python scripts/index_qdrant.py --corpus corpus/official.json --prune
```

Le premier appel d'ingestion échoue tant que les revues restent pending. C'est intentionnel.
Le manifeste ne crée aucun cluster et ne modifie aucune autre base.

## Backend et frontend dans un même projet Vercel

La documentation actuelle confirme la détection FastAPI et la promotion des fichiers statiques
par `app.mount(..., StaticFiles(...))` ou `app.frontend`. Le backend local utilise la première
méthode. Cela rend la colocalisation possible, mais **ne résout pas** la persistance des quotas,
les embeddings lourds ou la connectivité Qdrant.

Une configuration intégrée doit être validée séparément après ajout d'un stockage atomique
durable gratuit. Le code refuse les requêtes quand VERCEL ou PUBLIC_SERVERLESS est actif.
Ne pas enlever cette garde pour obtenir artificiellement une démo de génération publique.

## Génération distante

Non activée. Le catalogue `/v1/models` ne pouvait pas être téléchargé depuis l'environnement
restreint au moment de la première vérification. Aucun nom de modèle, solde gratuit ou budget
du compte n'est supposé. Les adaptateurs de protocole permettent une extension ultérieure,
mais le chemin actif n'a aucune clé AI Gateway/Azure/Mistral.

## Conditions avant publication

Tests unitaires, refus, injections, citations, quotas, mypy/Ruff, audits de dépendances,
secretlint, build, schéma, tests navigateur, en-têtes et contrôle du bundle. La CI est versionnée ;
un résultat local ne doit pas être présenté comme un résultat GitHub Actions distant.
Après déploiement : vérifier état READY, URL publique sans authentification, headers et
parcours essentiels. Le statut effectif est enregistré dans evidence/deployment.json.
