# Déploiement et CI/CD

## Projet actuel

- Application : https://hands-on-rag-lab.vercel.app
- Dépôt : https://github.com/Omaroid/hands-on-rag-lab
- Projet Vercel : [rag-lab](https://vercel.com/omar-laraquis-projects/rag-lab), équipe `omar-laraquis-projects`.
- Branche de production : `main`.
- Runtime : Node.js 24 ; interface statique et fonctions `api/ai/*`.

Le projet est relié à GitHub. Les modifications Git sont déployées par l’intégration native Vercel : aucun token de déploiement n’est stocké dans GitHub Actions. Aucun nouveau projet, plan payant ou base de données n’est nécessaire.

## Configuration versionnée

`vercel.json` fait foi :

```text
Install: npm ci --ignore-scripts && npm ci --ignore-scripts --prefix frontend
Build:   npm run test:server && npm run build --prefix frontend
Output:  frontend/dist
```

La racine du projet Vercel reste la racine du dépôt, afin de déployer les fonctions Node et le frontend ensemble. Les routes `/theory` et `/architecture` servent l’application. Le favicon est `frontend/public/favicon.svg`, référencé par `frontend/index.html` et publié sous `/favicon.svg`.

Les secrets sont saisis directement dans Vercel / Environment Variables, cible **Production** :

| Variable | Valeur / type |
| --- | --- |
| `NVIDIA_API_KEY` | Clé serveur sensible ; ne jamais l’exporter dans une variable `VITE_*` |
| `RAG_PUBLIC_GENERATION` | `true` pour autoriser explicitement la génération |

Sans activation et clé valide, l’API indique `ready:false`. L’indexation/recherche locale et les pages pédagogiques restent utilisables. Ne copiez pas les secrets Production vers les previews de contributions externes.

## CI : vérifier avant fusion

La workflow `.github/workflows/ci.yml` s’exécute sur les pull requests et les pushes sur `main` :

- **PDF/API/sécurité** : historique Git, secretlint, audits npm, API Node, compilation TypeScript/Vite, scan du bundle et vrais tests PDF/OCR/E5 sur desktop/mobile émulé.
- **Outils de maintenance** : formatage et lint des scripts Python standard, sans backend Python ni dépendance Python de production.

La génération d’interface est simulée dans la CI ; aucun appel NVIDIA réel n’y est effectué. Les scénarios réels fournisseur sont validés séparément avec des documents de test et un accord explicite.

Les permissions Actions sont en lecture seule et les actions sont fixées par SHA. Les modèles publics sont validés par le [manifeste SHA-256](evidence/pdf-model-manifest.json). La CI ne publie que le rapport JSON des tests, pas les secrets, logs complets ou états de navigateur.

La protection de branche et les checks requis sont des réglages GitHub distincts de la workflow : un administrateur doit les activer si les permissions et le plan le permettent. La présence du YAML ne prouve pas que ces réglages sont appliqués.

## Vérifier le déploiement

Après le build local PDF et le déploiement du même commit :

```bash
python3 scripts/check_public.py --expect-generation-ready --compare-dist
```

Le contrôle vérifie HTTP 200, les routes, la CSP et les autres en-têtes, le favicon, les empreintes des fichiers publics et les rejets de requêtes invalides. **Il ne déclenche aucun appel NVIDIA.** Un échec de comparaison signifie que le déploiement et le build local ne correspondent pas : ne validez pas la publication avant de l’expliquer.

## Retour arrière

1. Choisir dans Vercel un déploiement Production précédemment validé.
2. Utiliser Rollback/Promote dans ce projet uniquement, puis refaire le contrôle public.
3. Vérifier l’assignation du domaine et le comportement des prochains pushes : un rollback peut suspendre l’assignation automatique.
4. Pour couper seulement la génération, désactiver `RAG_PUBLIC_GENERATION` puis redéployer. La recherche locale reste disponible.

Aucune suppression de base, rotation automatique ou migration d’un autre projet n’est prévue par cette procédure.

## Avant de rendre le dépôt public

Valider le commit exact : scans de secrets et d’historique, CI, tests réels locaux, audits, favicon et site public. En cas de vrai secret historique, le révoquer et nettoyer l’historique avant de poursuivre. Le changement de visibilité est une action GitHub d’administration ; ne pas confondre dépôt publiable et dépôt déjà public.
