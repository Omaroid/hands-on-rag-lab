# Architecture — Hands-on RAG Lab

Application : https://hands-on-rag-lab.vercel.app · Projet Vercel : [rag-lab](https://vercel.com/omar-laraquis-projects/rag-lab).

## Parcours actif

1. `frontend/src/PdfApp.tsx` orchestre la session ; les traductions sont dans `pdf-labels.ts`.
2. `pdf-import.ts` extrait les pages avec PDF.js ou Tesseract dans un worker.
3. `semantic.worker.ts` découpe avec le tokenizer E5 et calcule de vrais vecteurs de 384 dimensions.
4. `pdf-retrieval.ts` calcule cosinus et BM25, fusionne les rangs avec RRF et sélectionne le contexte.
5. `PdfGeneration.tsx` demande le consentement avant l’appel à `/api/ai/answer`.
6. `server/answer-handler.js`, `http.js` et `pdf-answer.js` contrôlent les entrées, appellent NVIDIA à destination fixe et valident la réponse.

Les PDF et vecteurs restent dans le navigateur. Seuls question, langue et passages retenus avec fichier/page traversent l’API. Aucun entrepôt de documents visiteurs n’est créé.

## Interface et pédagogie

React, TypeScript, shadcn/ui, Radix UI et Tailwind composent l’interface. `/theory` explique le RAG en FR/EN avec un exemple guidé sans appel fournisseur. `/architecture` affiche les formules et les chiffres de la dernière recherche. L’atelier suit les vrais événements de traitement. Les transitions respectent la réduction des animations.

## Vérification et déploiement

GitHub Actions vérifie secrets/historique, dépendances, API, bundle et parcours PDF/OCR/E5. Vercel déploie nativement `main`, exécute les tests Node et publie `frontend/dist` avec les fonctions `api/ai/*`. Les scripts Python servent uniquement à la maintenance et aux tests.

Voir [README](README.md), [sécurité](SECURITY.md), [déploiement](DEPLOYMENT.md) et [détails PDF](docs/PDF_RAG.md).
