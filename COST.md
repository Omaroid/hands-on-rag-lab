# Coût et coupures

## Invariant livré

Coût obligatoire des services : **0 €**. Aucun cluster cloud, paiement, crédit acheté, projet
Supabase, domaine ou mécanisme d'auto top-up n'est créé. Le code actif n'appelle aucune API
LLM/embedding facturable. Le navigateur calcule sur le terminal du visiteur. En local, les
ressources CPU/RAM, l'électricité et la connexion appartiennent à l'utilisateur ; « 0 € »
ne signifie pas que ces ressources physiques sont sans coût.

## Services cibles vérifiés le 25 octobre 2026

| Service | Ce qui est établi | Décision |
|---|---|---|
| Vercel | L'équipe connectée est Hobby ; les quotas de la plateforme peuvent évoluer | Nouveau projet statique dédié seulement ; pas d'upgrade |
| Qdrant Cloud | La page officielle annonce Free : 0,5 vCPU, 1 Go RAM, 4 Go disque | Pas de compte/cluster créé ; aucun quota inventé pour un compte non inspecté |
| AI Gateway | La documentation annonce 5 $ de crédit mensuel, sous-ensemble de modèles ; un achat bascule vers le niveau payant | Aucun appel actif, achat ou changement de budget du compte existant |
| MLflow | Exécuté et enregistré en local | Aucun serveur distant |
| GitHub Actions | Le dépôt dédié est actuellement privé ; les minutes gratuites restantes ne sont pas vérifiées | Job gardé par `repository.private == false`, aucun runner sur ce dépôt privé |
| Supabase/Azure/Kubernetes | Aucun accès requis | Aucune ressource créée |

Sources : [Vercel Hobby](https://vercel.com/docs/plans/hobby),
[AI Gateway Pricing](https://vercel.com/docs/ai-gateway/pricing),
[Qdrant Pricing](https://qdrant.tech/pricing/).
Les services gratuits ne constituent pas une garantie perpétuelle. Ne pas interpréter un crédit
promotionnel comme un modèle intrinsèquement gratuit. Ne jamais activer de fallback facturable.

## Limites implémentées du backend local

| Contrôle | Valeur par défaut | Réponse |
|---|---:|---|
| Corps HTTP réel | 8 192 octets | 413 |
| Question | 8–1 200 caractères | 422 |
| Débit par identifiant HMAC journalier | 6/minute | 429 |
| Quota par identifiant | 40/jour | 429 |
| Plafond global | 300/jour ; 3 000/mois | 429 |
| Contexte | 6 chunks maximum ; 12 000 caractères | arrêt de sélection |
| Réponse extractive | 2 400 caractères | refus si citations non exactes |
| Temps de recherche | 15 secondes | 504 |
| Cache | 64 réponses en RAM ; clé SHA-256, sans texte de question stocké | éviction LRU |
| Quota indisponible ou Vercel serverless | aucune requête autorisée | 503 |

Les réservations sont faites AVANT le travail, même pour un cache hit. Les échecs restent
comptabilisés pour empêcher une boucle de retries illimités. Aucun retry fournisseur payant.
Une comparaison réserve une seule unité côté `/api/compare` et exécute quatre recherches bornées.

Le SQLite local n'est sûr que sur **un hôte durable unique**. Il ne constitue pas un budget
global pour des fonctions Vercel concurrentes. L'application vérifie ce cas et refuse. Aucun
flag d'attestation manuelle ne permet d'activer magiquement une génération payante.

## Édition publique

Le projet statique n'exécute pas de fonction et n'a ni clé ni fournisseur de génération.
Le nombre de recherches d'un visiteur n'utilise aucun quota API. Les quotas et protections
CDN restent ceux du plan Hobby. En cas d'indisponibilité du CDN, ne pas proposer un upgrade
automatique. Le plan Hobby est destiné aux usages personnels non commerciaux : le portfolio
est personnel ; un service client commercial demanderait une nouvelle décision d'hébergement.

## Avant une future génération distante

Vérifier dans le compte exact, sans toucher aux autres projets : modèle actuellement éligible,
solde gratuit, absence d'achat antérieur modifiant l'éligibilité, auto top-up désactivé, pas de
carte/fallback activant une facturation, budget fournisseur qui coupe réellement, compteurs
atomiques et réserve maximale de tokens en concurrence. Tant que l'un de ces éléments est
inconnu, rester fermé. Ne jamais promettre qu'un compteur Python local empêche une facture cloud.


## Contrôle du budget AI Gateway — 25 octobre 2026

Le plan du compte utilisateur connecté est confirmé Hobby. Cela ne prouve pas le solde ni
l'éligibilité gratuite de l'équipe AI Gateway. Le CLI Vercel 65.2.0 a été consulté :
`ai-gateway budgets set --help` indique un minimum de **1 USD**, donc aucun budget 0 USD
ne peut être réglé par cette commande. Un budget Gateway mesure la consommation ; ce n'est
pas un plafond strict d'argent facturé : la requête qui franchit la limite peut se terminer,
et BYOK est exclu de ce compteur. Ne pas régler automatiquement 1 ou 5 USD pour satisfaire
une contrainte de facturation strictement nulle.

Aucune modification du budget fournisseur n'a été exécutée : le connecteur disponible
n'expose pas cette opération et le CLI n'a pas d'authentification existante. Le solde gratuit,
le solde acheté et l'état d'auto top-up du compte exact restent à vérifier. Aucune clé, achat,
moyen de paiement ou montée de plan n'a été ajouté. La génération distante demeure désactivée.
Preuve : `evidence/budget-validation.json`.
