# Génération NVIDIA côté serveur

Le site canonique est https://hands-on-rag-lab.vercel.app ; le projet Vercel est [rag-lab](https://vercel.com/omar-laraquis-projects/rag-lab).

## Activation

Configurer directement dans Vercel / Production : `NVIDIA_API_KEY` sensible et `RAG_PUBLIC_GENERATION=true`. Aucun secret n’entre dans les variables `VITE_*`, GitHub Actions ou les fichiers suivis. Sans configuration, `/api/ai/status` indique `ready:false` ; la recherche locale reste disponible.

## Contrat

`POST /api/ai/answer` accepte uniquement le JSON prévu : consentement, question, langue et 1–4 passages avec identifiant, fichier, page et texte. Question : 1 200 caractères. Chaque passage : 4 000 caractères ; total : 8 000. Corps : 24 000 octets selon le chemin de lecture contrôlé. Aucun choix utilisateur de modèle, destination, outil ou instruction système.

Le serveur appelle une seule fois `https://integrate.api.nvidia.com/v1/chat/completions`, modèle `openai/gpt-oss-20b`, sortie maximale 1 024 tokens et délai 30 secondes. Aucune redirection ni tentative automatique. La sortie bornée est validée : statut étayé/partiel/absent, texte et identifiants de citation existants. Les éventuels raisonnements internes ne sont pas retournés ; une liste d’outils vide est acceptée, une vraie demande d’outil est rejetée.

Le serveur ne peut pas authentifier un PDF resté dans le navigateur. Les références contrôlées prouvent leur présence dans le contexte reçu, pas la justesse d’une interprétation.

## Sécurité et exploitation

L’origine de production autorisée est le domaine canonique ci-dessus. Les diagnostics n’enregistrent que les métadonnées autorisées, jamais clé, question, passage, réponse, IP ou raisonnement. Aucun compteur applicatif de demandes n’est appliqué ; les limites et conditions des fournisseurs restent distinctes.

La CI teste le contrat sans clé ni appel NVIDIA réel. Le contrôle `scripts/check_public.py` vérifie routes, en-têtes, favicon et rejets sans déclencher le fournisseur. Une vérification réelle doit utiliser un document de test et un consentement explicite.
