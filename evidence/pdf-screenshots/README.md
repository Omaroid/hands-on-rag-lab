# Captures réelles

`final-*` et `ocr-in-progress.png` : parcours PDF/OCR/recherche locaux antérieurs.

`live-public-*` : réponses NVIDIA réelles reçues de l'API de production après consentement,
et ouverture des citations. Le rendu Chromium est local sur les assets identiques aux
30 fichiers publics ; l'API est appelée via un relais HTTPS vérifié et l'encodeur réel
provient d'un cache vérifié, car le navigateur du sandbox refuse la CA du proxy.
Ces captures ne montrent ni une réponse simulée ni un téléphone physique.
Preuves : ../pdf-live-desktop-current.json et ../pdf-live-mobile-current.json.
