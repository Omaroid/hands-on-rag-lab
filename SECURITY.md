# Sécurité

Cette politique décrit **l’application PDF actuelle**. Le backend Python historique possède des contrôles distincts et n’est pas déployé pour traiter les PDF publics.

## Frontières de confiance

| Frontière | Contrôles | Limite à connaître |
| --- | --- | --- |
| PDF → navigateur | Type et taille contrôlés, extraction/OCR dans des workers, pages et texte bornés | Une erreur d’OCR ou un document complexe peut dégrader les preuves |
| Navigateur → API | JSON strict, consentement requis, question/contexte bornés, méthodes et Origin contrôlés | Origin et consentement ne constituent pas une authentification forte |
| API → NVIDIA | Destination et modèle fixes, clé serveur, pas d’outil, redirection ou retry automatique | L’API publique est utilisable par des clients directs ; aucun quota de demandes n’est appliqué |
| NVIDIA → interface | JSON et références contrôlés, texte rendu par React, aucun HTML ou code exécuté | Une citation valide ne garantit pas l’interprétation ni la vérité de la réponse |
| Git → build → navigateur | Scans de secrets, historique contrôlé, dépendances verrouillées, bundles inspectés | Un scan ne détecte pas toute vulnérabilité inconnue |

Les bornes de fichiers, texte, contexte, durée et sortie protègent le traitement. Les plafonds de demandes ont été retirés à la demande du propriétaire. Le service ne promet ni disponibilité illimitée ni absence de limites fournisseur.

## Secrets

- `NVIDIA_API_KEY` doit rester une variable **sensible de production dans Vercel**, jamais une variable `VITE_*`.
- GitHub Actions n’a besoin d’aucune clé NVIDIA, Qdrant ou Vercel. Les tests fournisseurs y sont simulés ; les vrais tests OCR/E5 utilisent uniquement des modèles publics.
- Les fichiers `.env*` réels, clés privées, certificats, états Terraform, bases locales et dossiers de travail sont ignorés par Git. `.env.example` contient uniquement des noms et des valeurs vides/non sensibles.
- Gitleaks analyse tous les commits accessibles avec ses règles par défaut et une règle NVIDIA. `.gitleaksignore` contient **quatre empreintes historiques exactes**, revues : une valeur synthétique de test et trois SHA-256 publics. Aucun fichier entier n’est exclu du scan.
- Les journaux de génération applicatifs contiennent seulement des métadonnées autorisées ; pas de clé, question, extrait, réponse, IP ou raisonnement du modèle. Les journaux de la plateforme restent soumis à la politique du fournisseur.

## CI/CD et contributions externes

La CI utilise `contents: read`, un checkout sans persistance d’identifiants, des actions fixées par SHA et `npm ci --ignore-scripts`. Elle ne s’exécute pas via `pull_request_target` et ne reçoit pas de secret de production.

Les artefacts Actions sont limités au rapport JSON de vérification avec des fixtures synthétiques. Les fichiers `.vercel`, `.env`, états de connexion navigateur et traces éventuelles ne sont pas publiés en artefact.

Vercel utilise son intégration Git native. La protection des forks reste activée ; une preview ne doit jamais recevoir les secrets Production. Le build de production exécute les tests de l’API Node avant la compilation. Les mainteneurs doivent vérifier la CI du commit exact avant de fusionner sur `main`.

## Données et navigateur

Les PDF et leurs vecteurs vivent en mémoire de session. Le serveur ne reçoit que la question et les passages sélectionnés après accord. Il ne peut pas certifier un PDF qu’il n’a pas reçu. Aucun entrepôt de PDF visiteurs ou journal de leur contenu n’est ajouté.

Les en-têtes incluent CSP, HSTS, `nosniff`, protection contre l’encadrement, Referrer-Policy et Permissions-Policy. La CSP autorise les domaines nécessaires au modèle et le WASM, sans `unsafe-inline` ni script distant arbitraire. Les sorties restent du texte, sans `dangerouslySetInnerHTML`.

## Signaler ou traiter un incident

Ne publiez **jamais** de clé, PDF privé ou détail d’exploitation sensible dans une issue. Contactez le propriétaire par un canal privé ; utilisez le signalement privé GitHub lorsqu’il est activé.

Si une clé réelle entre dans Git ou des logs :

1. Révoquer/remplacer la clé chez son fournisseur.
2. Suspendre la publication si le dépôt est encore privé.
3. Retirer la valeur des fichiers, de l’historique et des artefacts concernés ; refaire les scans.
4. Reconstruire, retester et vérifier le déploiement.

Effacer une ligne ou réécrire un commit ne remplace pas la révocation. Un scan réussi signifie « aucun résultat non expliqué avec les règles exécutées », pas « sécurité absolue ».
