# Parcours PDF et recherche hybride

## Sources et extraction

PDF.js 6.4.299 lit le texte. Une page contenant moins de 30 caractères non blancs passe par Tesseract FR/EN. Les écarts verticaux aident à retrouver les paragraphes. Les limites sont 5 Mo cumulés, 10 fichiers, 40 pages et 150 000 caractères extraits. L’OCR est local et annulable ; les mises en page complexes peuvent dégrader le texte.

## Tokenisation et E5

`Xenova/multilingual-e5-small`, révision `761b726dd34fb83930e26aab4e9ac3899aa1fa78`, s’exécute via Transformers.js / ONNX Runtime Web en q8. Le [manifeste](../evidence/pdf-model-manifest.json) fixe tailles et SHA-256 des fichiers utilisés en vérification.

Les paragraphes courts sont regroupés autour de 400 tokens. Les passages longs sont divisés récursivement, sans traverser une page et sans troncature silencieuse : maximum 480 tokens, préfixe `passage:` et tokens spéciaux compris. Au plus 200 passages. Une question utilise `query:`. Pooling moyen masqué puis normalisation L2 produisent 384 coordonnées.

## Recherche et sélection

- La forme NFKC et les espaces de la question sont harmonisés.
- Le cosinus compare les directions des vecteurs normalisés.
- BM25 utilise les termes lexicaux filtrés, `k1=1.2`, `b=0.75`, et les statistiques du périmètre choisi.
- RRF additionne `1/(60 + rang)` dans les 20 premiers résultats de chaque méthode. BM25 nul ne donne pas de rang lexical.
- Dans l’ordre RRF, un passage doit avoir une contribution, un cosinus ≥ 0,78 et tenir dans les limites de 4 passages / 1 600 tokens E5.

Les égalités sont départagées par identifiant. Le seuil est heuristique, pas une probabilité de vérité. Sans contexte admissible, la génération n’est pas lancée.

## Interface et vérification

L’atelier montre les pages extraites, cartes, vecteurs et vrais classements. Les calculs de `/architecture` utilisent les mêmes données de recherche ; BM25 partage son calcul avec le moteur. Le guide `/theory` distingue explicitement son exemple pédagogique de l’inférence réelle.

`python scripts/verify_pdf.py` teste réellement extraction, OCR, E5, recherche, citations, refus, arrêt, réinitialisation, accessibilité et FR/EN sur desktop/mobile émulé. Les cas d’interface de génération sont simulés et ne disposent d’aucune clé fournisseur.

Voir le [contrat de génération](PDF_GENERATION.md) et la [politique de sécurité](../SECURITY.md).
