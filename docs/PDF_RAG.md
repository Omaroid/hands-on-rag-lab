> Mise à jour du 26 octobre 2026 : génération NVIDIA publique activée et vérifiée.
> Clé sensible injectée directement dans Vercel, compteur Blob CAS testé, 19 tests serveur
> et deux parcours réels vers l'API de production réussis. Voir docs/RESUME.md et
> evidence/generation-publication-current.json. Les mentions de blocage ci-dessous sont historiques.

# Source — session PDF locale

Le build `VITE_RUNTIME=browser npm run build --prefix frontend` ouvre la vitrine PDF.
Le frontend historique et le backend Lakehouse restent disponibles dans le code pour les
parcours existants ; sans ce mode de build, le frontend continue à interroger le backend.

## Parcours réellement implémenté

- Plusieurs PDF par sélection ou glisser-déposer : 5 000 000 octets cumulés, 10 fichiers,
  noms distincts, signature `%PDF-`, validation structurelle PDF.js. Une sélection remplace
  la précédente ; l'interface le précise. Les PDF chiffrés nécessitant un mot de passe
  sont refusés avec une erreur dédiée.
- 40 pages cumulées, 150 000 caractères extraits, rendu OCR limité à 4 millions de pixels,
  images PDF limitées à 8 millions de pixels. Ces limites bornent le travail courant mais
  ne garantissent pas la mémoire maximale du parseur face à tout PDF malveillant.
- PDF.js extrait le texte par page ; les écarts verticaux aident à reconnaître les paragraphes.
  La reconstruction des titres, colonnes et tableaux reste heuristique, pas un parseur de mise
  en page documentaire. Pour moins de 30 caractères non blancs par page, OCR FR/EN Tesseract.
  Une page mêlant texte natif et images riches peut nécessiter un prétraitement externe :
  les images d'une page déjà textuelle ne sont pas automatiquement OCRisées.
- E5 regroupe les paragraphes adjacents jusqu'à environ 400 tokens puis sépare récursivement
  les passages trop longs aux espaces (ou aux caractères si nécessaire), page par page.
  Comptage réel par tokenizer, préfixe `passage:` et tokens spéciaux compris ; maximum 480,
  inférieur aux limites 512 du tokenizer et du modèle. Aucune troncature silencieuse.
  Maximum 200 passages. Les détails du texte et des vecteurs sont consultables.
- E5 multilingue, mean pooling masqué et normalisation L2 ; `query:` pour les questions,
  `passage:` pour les passages, y compris en français. Cosinus entre vecteurs normalisés.
- BM25 : termes Unicode normalisés sans accents, stopwords FR/EN, k1=1.2 et b=0.75.
  Pas de stemming, traduction ni réécriture de question inventée.
- RRF : les 20 premiers de chaque classement, k=60. Un score BM25 nul ne reçoit pas de
  contribution lexicale. Les scores bruts ne sont jamais additionnés ni probabilisés.
- Contexte : au plus 4 passages, cosinus >= 0.78 et budget de 1600 tokens d'encodeur.
  Ce budget n'est pas présenté comme un comptage de tokens du générateur NVIDIA.
  Le seuil est heuristique, sans calibration universelle sur les PDF des visiteurs.
  Refus sans candidat admissible ; sinon extraits avec couverture non évaluée explicitement.
  Le dialogue détaille les termes communs, seuil, rangs et contributions. Aucune preuve
  d'implication logique ou d'exhaustivité n'est inférée de ces nombres.

## Modèle et réseau

Encodeur : `Xenova/multilingual-e5-small`, révision
`761b726dd34fb83930e26aab4e9ac3899aa1fa78`, ONNX q8, 384 dimensions.
Poids : 118 308 185 octets ; tokenizer : 17 082 730 octets. Empreintes dans
`evidence/pdf-model-manifest.json`. Carte d'origine :
https://huggingface.co/intfloat/multilingual-e5-small (licence déclarée MIT).
Conversion : https://huggingface.co/Xenova/multilingual-e5-small/tree/761b726dd34fb83930e26aab4e9ac3899aa1fa78.
La carte d'origine documente préfixes, pooling, normalisation et limite 512.
La configuration locale vérifie aussi 512. La politique de chemin distante est épinglée
explicitement car la découverte de fichiers de Transformers.js 4.3.1 interroge autrement
`main` avant de charger le modèle à la révision demandée.

Hugging Face reçoit des téléchargements de fichiers publics du modèle, donc les métadonnées
réseau usuelles ; aucun PDF, question ou vecteur ne lui est envoyé. OCR, WASM et workers
sont servis depuis le même site et leurs versions sont verrouillées par package-lock.
La CSP autorise uniquement les téléchargements HF, le site, les workers et WASM nécessaires.
Aucun modèle génératif n'est téléchargé dans le navigateur.

## Session et suppression

Fichiers, pages, passages et vecteurs vivent en mémoire dans l'onglet et son worker.
Aucun localStorage, IndexedDB documentaire, bibliothèque utilisateur ou upload PDF serveur.
La réinitialisation supprime les références de l'application et termine les workers ; le
navigateur gère la récupération physique de mémoire, pas un effacement sécurisé garanti.
L'encodeur ne met pas ses poids dans le cache applicatif ; les caches HTTP du navigateur
peuvent conserver des assets publics. Tesseract n'utilise pas de cache documentaire.

Indexation arrêtée après 180 secondes, recherche après 30 secondes. Le bouton Arrêter
termine le worker d'encodage ou le worker parent OCR (et ses descendants), interrompt
PDF.js et refuse les résultats de générations de session antérieures. Aucun index partiel
n'est conservé après arrêt. L'initialisation OCR est isolée dans un worker parent pour
rendre son arrêt possible avant même la fin de `createWorker()`.

## NVIDIA et production

Le contrat Chat Completions est maintenant documenté et un appel réel borné avec la clé
injectée a réussi ; voir `evidence/nvidia-live-probe.json`. Le test emploie un passage
synthétique et aucun document privé. Il ne démontre pas les conditions du compte exact.

La vitrine publique reste **sans génération** : API status `ready:false`, API answer 503,
bouton désactivé, explication explicite. Le consentement ne débloque pas la garde. Aucun
secret NVIDIA n'est provisionné dans le navigateur ni nécessaire au build statique.
Le serveur Python historique utilise le contrat Chat Completions, garde consentement,
recalcul des sources historiques et quotas avant appel. Il n'ingère pas les PDF visiteurs.

Le raccordement de génération PDF et le compteur Blob privé sont maintenant implémentés.
Le CAS a été vérifié par 12 demandes HTTP concurrentes sur les fonctions serverless,
sans dépassement. Voir docs/PDF_GENERATION.md et evidence/blob-quota-current.json.
L'ouverture reste fermée : la clé réelle doit être injectée directement dans Vercel ;
la référence de proxy de tâche ne peut pas être exportée avec VERCEL_TOKEN.
Aucun stockage d'un autre projet n'est réutilisé et aucun achat/plan n'est modifié.

## Tests

Fixtures synthétiques dans `frontend/tests/fixtures` : texte FR, texte EN, image OCR,
PDF corrompu, protégé, trop de pages, texte long et injection documentaire inerte.
Tests : `E2E_PDF=1 CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e --prefix frontend -- pdf.spec.ts`.
Télécharger les fichiers avec `python scripts/fetch_pdf_model.py` (empreintes obligatoires).
Lancer `python scripts/serve_pdf_test.py --model-dir work/e5` après le build. Le serveur
vérifie les empreintes et sert le build avec la CSP réelle et les fichiers sous `/_test-model/`. Les tests redirigent uniquement les téléchargements HF vers ce
cache exact (empreintes vérifiées), car Chromium ne fait pas confiance à la CA du proxy
cloud. PDF.js, OCR, tokenizer, ONNX et recherche sont réels, pas simulés. La route de cache
n'est jamais copiée dans les assets publiés. Les tests mobile sont une émulation Chromium,
pas un test sur iPhone physique. Voir les preuves actuelles pour les résultats.
