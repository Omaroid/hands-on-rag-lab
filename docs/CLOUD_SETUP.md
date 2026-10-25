# Raccorder le cloud gratuit — configuration opérateur

État : le cluster Qdrant existant a été déclaré **Free et dédié** par son propriétaire.
Aucun cluster, plan payant ou projet supplémentaire n'est créé par ce guide.

## 1. Autoriser le réseau de l'environnement de travail

Ouvrir la configuration de l'environnement cloud associé à la conversation. Dans la section
réseau/accès Internet, conserver l'accès aux registres de paquets et ajouter les hôtes suivants,
un domaine par entrée, sans schéma HTTPS ni chemin. Les libellés de cette interface varient ;
ces réglages ne se trouvent pas dans la console Qdrant et ne sont pas une variable Python.

```text
docs.databricks.com
learn.microsoft.com
docs.delta.io
ai-gateway.vercel.sh
qdrant.tech
docs.langchain.com
huggingface.co
lakehouse-rag-lab.vercel.app
85462729-45d6-473d-b8aa-fc712b1b14c0.eu-west-1-0.aws.cloud.qdrant.io
```

Enregistrer puis appliquer la configuration. Si l'interface propose un redémarrage, le code
est conservé dans le dépôt GitHub ; le runtime devra revérifier que la politique est effectivement
appliquée. Modifier `/etc/codex/network-policy.json` ne donne aucun accès et n'est pas une solution.
Les domaines de téléchargement supplémentaires d'un modèle seront ajoutés seulement après
identification de ses redirections réelles.

## 2. Variables non secrètes et secrets

Dans les variables de **cet environnement de travail**, ajouter :

| Nom | Type | Valeur / usage |
|---|---|---|
| `QDRANT_URL` | variable non secrète | `https://85462729-45d6-473d-b8aa-fc712b1b14c0.eu-west-1-0.aws.cloud.qdrant.io:443` |
| `QDRANT_COLLECTION` | variable non secrète | `lakehouse_docs_multilingual_v1` (nouvel index réservé à la suite) |
| `QDRANT_PLAN_CONFIRMED_FREE` | variable non secrète | `true`, seulement après confirmation du plan Free dans la console |
| `QDRANT_WRITE_API_KEY` | secret | clé Database API pour l'indexeur, limitée au cluster dédié |
| `QDRANT_API_KEY` | secret | clé Database API **read-only** pour l'application |

Les clés ne doivent jamais être collées dans la conversation ou dans une variable `VITE_*`.
Ne pas fournir une clé Cloud Management de compte : elle n'est pas nécessaire pour les données.
Dans la console Qdrant : cluster → API Keys → créer une **Database API key**. Conserver une
expiration adaptée (par exemple 90 jours) et noter sa date sans stocker sa valeur dans le dépôt.
La clé d'indexation sert à créer puis alimenter la collection dédiée. Une fois la collection
créée, restreindre la clé de lecture à cette collection. Ne pas essayer d'indexer avec la clé
read-only et ne pas mettre la clé d'écriture dans le service public.

La collection sémantique sera créée seulement après validation du modèle et du corpus officiel.
Le nom d'une collection ne prouve pas que ses vecteurs proviennent du bon modèle. Les dimensions
compatibles ne suffisent pas non plus : ne pas remplir cet index avec le baseline de hash.

## 3. Diagnostic sans écriture

```bash
# Configuration présente, sans aucun accès réseau :
uv run python -m lakehouse.cloud_setup

# Après activation des secrets et du domaine, un GET borné sur la collection cible :
uv run python -m lakehouse.cloud_setup --connect
```

La première commande renvoie un statut non-ready tant que la connexion n'est pas vérifiée ;
son code de sortie est donc 1. Un statut `collection_missing` est normal avant la première
indexation. Les autres statuts distinguent clé refusée, droits insuffisants, quota, indisponibilité
et forme d'index incompatible. Le diagnostic ne provisionne rien, n'utilise jamais la clé
d'écriture et n'imprime ni les valeurs des secrets ni les corps d'erreur du serveur.

Il ne peut pas prouver les droits read-only par un simple GET et n'essaie pas d'écrire pour les
tester. Il ne peut pas non plus vérifier la facturation à travers l'API de données : la console
reste la source pour la confirmation du plan. Un statut de connexion n'est pas une autorisation
d'activer une génération publique.

## 4. Éléments à vérifier ensuite

- Sources : robots.txt, conditions et licences avant ingestion des 22 URLs candidates.
- Embeddings : poids multilingues, limites réelles du tokenizer et évaluation avant indexation.
- Modèle : éligibilité AI Gateway du compte, crédits gratuits disponibles, aucun achat/rechargement
  automatique ni fallback payant. Aucune clé LLM n'est encore demandée ou activée.
- API publique : compteur atomique durable gratuit avant de lever la garde serverless.
  Upstash Redis Free est une piste documentée, pas une base déjà créée ou autorisée à facturer.

## Disponibilité du niveau Free

Le niveau Free peut être suspendu après une semaine d'inactivité et supprimé après quatre
semaines sans réactivation, selon la documentation consultée. Conserver le manifeste et le
pipeline d'indexation ; réactiver manuellement si nécessaire. Aucun keep-alive artificiel n'est
ajouté et aucune mise à niveau automatique n'est configurée.

Sources vérifiées : [création et limites Free](https://qdrant.tech/documentation/cloud/create-cluster/),
[Database API keys](https://qdrant.tech/documentation/cloud/authentication/),
[tarifs Qdrant](https://qdrant.tech/pricing/),
[Upstash Redis Free — piste pour quotas](https://upstash.com/pricing/redis).

## Diagnostic vérifié après reprise

Les domaines et secrets sont maintenant observés comme `ready`, et la politique réseau
comme `enforced`. Sur cet environnement, le GET de la collection sur le port 6333 reçoit
HTTP 403 ; sur **443 explicitement**, le diagnostic officiel retourne `collection_missing`.
Ne pas déduire de ce 403 que les clés doivent être recréées. Le client Qdrant utilise 6333
par défaut : retirer simplement le port ne corrige pas le diagnostic. Définir `QDRANT_URL`
avec `:443`, enregistrer/appliquer la configuration puis relancer le diagnostic.

`collection_missing` est attendu avant indexation ; il ne prouve ni la facturation ni les
droits read-only de la clé. Aucune écriture n'a été effectuée. La cause précise du refus
sur 6333 n'est pas établie ; 443 est une correction vérifiée dans cet environnement.

Les robots.txt Databricks, Microsoft Learn et Delta ainsi que le catalogue public
`https://ai-gateway.vercel.sh/v1/models` répondent HTTP 200. La revue des conditions/licences,
l'éligibilité gratuite du compte, les embeddings et les quotas durables restent à terminer.
