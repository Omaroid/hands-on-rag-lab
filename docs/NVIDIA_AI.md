> Mise à jour du 26 octobre 2026 : génération NVIDIA publique activée et vérifiée.
> Clé sensible injectée directement dans Vercel, compteur Blob CAS testé, 19 tests serveur
> et deux parcours réels vers l'API de production réussis. Voir docs/RESUME.md et
> evidence/generation-publication-current.json. Les mentions de blocage ci-dessous sont historiques.

# NVIDIA serveur — accès réel validé, génération publique fermée

État du 26 octobre 2026. Il s'agit d'inférence, pas d'entraînement.

## Vérifications de cette session

La configuration attachée est à la révision 2 et déclare NVIDIA_API_KEY et VERCEL_TOKEN.
Les variables sont présentes dans le processus, sans lecture affichée de leurs valeurs.
Les observations sont actuelles mais les états individuels et la politique sont `unknown` :
ils ne sont donc pas qualifiés de `ready` ou `enforced` sur cette seule base.
Les accès réels via le proxy avec permissions réseau du sandbox ont ensuite réussi :
GET NVIDIA `/v1/models` HTTP 200, modèle `openai/gpt-oss-20b` présent ; GET du projet
Vercel dédié HTTP 200 avec l'identifiant attendu.

La documentation NVIDIA actuelle expose Chat Completions pour ce modèle :
https://docs.api.nvidia.com/nim/reference/openai-gpt-oss-20b-infer
et https://build.nvidia.com/openai/gpt-oss-20b.
La page de présentation propose aussi un sélecteur Responses ; cette reprise choisit le
contrat Chat Completions explicitement documenté et testé, pas une supposition sur Responses.

Une seule génération réelle bornée a été exécutée sur un passage **synthétique** :
HTTP 200, `finish_reason: stop`, 155 tokens d'entrée et 39 tokens de sortie, maximum
512 tokens, aucun retry. Réponse : « Les salariés disposent de **25 jours de congés payés
par an**. [1] ». Voir `evidence/nvidia-live-probe.json`. Aucun PDF privé n'a été envoyé.
La page NVIDIA annonce un endpoint gratuit ; les conditions du compte exact, l'absence de
limite et ses modalités de rétention n'ont pas été vérifiées indépendamment. La déclaration
historique du propriétaire « gratuit, illimité » reste distincte de ces observations.
Aucun achat, recharge, carte ou changement de plan n'a été effectué.

## Adaptateur Python

- Endpoint fixe `https://integrate.api.nvidia.com/v1/chat/completions` et modèle fixe.
- `messages` système/utilisateur ; les extraits sont marqués comme données non fiables.
- Aucun outil, redirection, retry ni URL décidée par un PDF ou une réponse du modèle.
- Maximum 1024 tokens de sortie, réponse HTTP <=128 Kio et texte <=6000 caractères.
- `reasoning_effort: low`. Seul `message.content` est retourné, jamais `reasoning_content`.
- Réponses tronquées, tool calls, formes invalides, erreurs fournisseur et échos du secret
  sont rejetés. Erreurs publiques nettoyées, pas de journal des prompts ou des clés.
- Le contrat Chat choisi ne contient pas de paramètre `store`. Aucune garantie de rétention
  fournisseur n'est donc déduite de la requête ou de l'ancien exemple Responses.
- La route Python historique garde le consentement explicite, le recalcul de ses sources
  Lakehouse et la réservation de quota avant tout appel. Elle n'ingère pas les PDF visiteurs.

## Fermeture publique

Un compteur Blob privé gratuit a depuis été raccordé et testé, voir PDF_GENERATION.md. SQLite ou un compteur mémoire
ne protège pas plusieurs instances serverless. La garde Python d'origine reste intacte.
Les routes Vercel ajoutées sont explicitement fermées : GET `/api/ai/status` renvoie
`ready:false`, POST `/api/ai/answer` renvoie 503, sans appel fournisseur tant que les prérequis serveur ne sont pas réunis.
La vitrine PDF présente cette indisponibilité et un bouton désactivé. Cocher le consentement
ne l'active pas. Les extraits restent locaux et consultables.

Le store Blob privé dédié a été créé et les écritures conditionnelles ont été réellement
testées sous concurrence. Le contrat PDF est maintenant implémenté. L'ouverture publique
reste bloquée par l'absence de clé NVIDIA réelle dans les variables Vercel ; la référence
de proxy de tâche n'est pas exportable. Voir docs/PDF_GENERATION.md et les preuves actuelles.
Voir `docs/PDF_RAG.md` pour l'architecture PDF et ses limites.

Les tests Python de l'adaptateur utilisent des réponses simulées ; le probe JSON est la preuve
séparée de l'appel réel. Les tests navigateur PDF utilisent de vrais PDF, OCR et embeddings.
