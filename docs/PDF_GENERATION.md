# Génération PDF serveur et compteur durable

Le store Blob privé `store_etqnqyg3va5gtf18` a été créé pour le seul projet
`prj_bx0b78VzJb6VNA2OyyIOElDnBiEE`, équipe `team_0yx8bLSbYEsadJbCiwOd28l6`.
Le plan de cette équipe est Hobby (contrôle du connecteur du 26 octobre 2026).
La documentation https://vercel.com/docs/vercel-blob/usage-and-pricing indique une offre
Hobby gratuite avec interruption de service au dépassement, sans dépassement facturé.
Aucun essai Pro, achat, carte, auto-recharge ou autre ressource n'a été utilisé.
Cette garantie dépend du maintien du plan Hobby ; le flag serveur est une attestation
opérateur, pas une surveillance automatique des changements manuels de plan.

## Données et quotas

Le store ne contient aucun PDF, question, extrait, vecteur ou texte généré. Le compteur
privé `quota/global-v1.json` contient les nombres de tentatives par minute/jour/mois,
les dates UTC, une révision monotone et des identifiants clients HMAC avec sel secret dédié.
Le sel n'est pas dans le navigateur. Le global limite toute demande même si une identité
client était mal détectée par la plateforme.

Limites fixes : 3/minute, 20/jour, 200/mois et 6/jour/client. Réservation avant l'appel,
sans remboursement en cas d'erreur ou d'arrêt de l'attente. Rollover UTC côté serveur ;
une horloge antérieure au compteur ferme le service. Au maximum 4 tentatives CAS et
7 secondes pour la réservation. Les erreurs stockage, ETag, compteur absent/invalide,
configuration ou contention persistante ferment la génération.

Lecture Blob privée `useCache:false` pour lire l'origine, puis écriture `ifMatch:etag`.
La révision monotone évite le retour au même ETag lors des changements de période.
Le compteur n'est jamais créé implicitement par la route publique. Son initialisation
est une opération authentifiée distincte et ne peut pas écraser un compteur existant.
La bibliothèque Blob est verrouillée à 2.8.2 ; Zod transitif est forcé à 4.6.6 pour corriger
l'avis GHSA-mrhx-c7xc-m3w5 trouvé lors de l'audit. Aucun downgrade du SDK n'a été utilisé.

Le raccordement n'est déclaré testé que dans la preuve de concurrence réelle, séparée
des tests utilisant un CAS mémoire simulé. La route temporaire `quota-verification` utilise
un jeton opérateur sensible et des chemins/limites fixes ; aucun appel NVIDIA ni paramètre
permettant de changer le compteur global. Elle doit être supprimée après vérification.

## Contrat de génération

La route reçoit exactement `question`, `language`, `consent:true`, `passages` (1 à 4).
Chaque passage contient seulement `id`, `file`, `page`, `text`. Corps <=24 000 octets,
question <=1200 caractères, texte des passages <=8000 caractères, chaque passage <=4000,
page de 1 à 40, noms sans contrôles, aucun modèle, URL ou prompt système paramétrable.
Ces passages locaux sont des données non fiables ; le serveur ne peut pas vérifier leur
fidélité à un PDF qu'il n'a pas reçu et ne prétend pas recalculer la recherche PDF.

Un seul POST NVIDIA Chat Completions, endpoint et modèle fixes, pas de retry, redirection
ou outil. Délai 30 secondes, 1024 tokens de sortie, réponse <=128 Kio. Instructions système
séparées des données JSON. Sortie JSON stricte `status`, `answer`, `citations` : supported,
incomplete ou absent. Références numériques uniques et bornées par les passages reçus ;
les références fichier/page/texte viennent de la requête validée, pas du modèle.
Les sorties tronquées, tool calls, JSON invalide, citations inconnues et échos de la clé
sont rejetés sans détails fournisseur. `reasoning_content` n'est jamais exposé.

Le frontend exige un statut serveur prêt et un consentement spécifique avant POST.
Aucun PDF complet ni vecteur n'est transmis. Le rendu est du texte, sans HTML ou URL active
pilotée par le modèle. Les citations ouvrent le passage local original. Réinitialiser
supprime aussi la réponse et le consentement. Arrêter l'attente ne garantit pas l'arrêt
fournisseur ; aucun nouvel essai automatique ou remboursement de quota n'est annoncé.

## Conditions d'ouverture

`RAG_PUBLIC_GENERATION=true`, `RAG_QUOTA_VERIFIED=store_etqnqyg3va5gtf18:cas-v1`,
`RAG_HOBBY_ONLY=true`, `RAG_NVIDIA_FREE_CONFIRMED=true`, sel de quota et clé NVIDIA réelle
sont nécessaires, ainsi que l'accès au store dédié. Le statut lit aussi le compteur ;
s'il est indisponible, ready reste false. Le seul flag ne remplace pas les preuves du test.
Les anciennes gardes Python serverless ne sont pas modifiées.

La tâche reçoit une référence de proxy pour NVIDIA_API_KEY, pas sa valeur exportable.
VERCEL_TOKEN permet de configurer le projet, mais ne révèle pas la clé NVIDIA de la tâche.
Une copie littérale de cette référence dans Vercel serait inutilisable. Le code refuse
ces références ; la clé réelle doit être injectée directement dans le projet Vercel,
jamais fournie en chat. Aucun secret NVIDIA n'est transféré dans le bundle.

## Validation réelle et simulée

`npm run test:server` couvre contrat, quotas, ordre des appels, échecs et secrets avec
réponses fournisseur simulées. Le navigateur emploie de vrais PDF/OCR/E5 ; les cas de
consentement/erreur UI utilisent explicitement un serveur simulé.

Quatre appels réels séparés à NVIDIA ont vérifié le contrat exact sur des textes synthétiques :
supported, incomplete, absent et refus d'injection. Tous HTTP 200 et finish_reason stop,
aucun retry ; sorties passées dans le même validateur JS de citations. Voir
`evidence/nvidia-pdf-contract-current.json`. Cela ne constitue pas un parcours public complet
navigateur → compteur Blob → NVIDIA. Les conditions du compte NVIDIA restent déclaratives,
avec endpoint publiquement annoncé gratuit, sans vérification indépendante d'usage illimité.
