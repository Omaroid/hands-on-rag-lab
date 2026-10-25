# 5. Contexte, génération, hallucination et citations

Un mauvais retrieval fournit les mauvaises preuves. Une hallucination ajoute une affirmation
non soutenue malgré ou faute de contexte. Améliorer le prompt ne répare pas un corpus absent.

Le générateur actif est extractif : il choisit des phrases présentes dans les notes. Le
validateur contrôle le chunk, l'URL et le passage exact, puis compare toute la réponse aux
citations attendues. Aucun paragraphe libre ne peut se glisser entre les extraits.

Avec un LLM de synthèse, une citation existante ne suffirait plus : il faudrait juger si le
passage soutient effectivement chaque affirmation, y compris nombres, conditions et exceptions.
C'est pourquoi cette livraison ne revendique pas une vérification sémantique générale.

RAG récupère un contexte à la demande ; le fine-tuning modifie les paramètres d'un modèle.
Le RAG facilite l'actualisation et la provenance ; le fine-tuning peut adapter le comportement
ou le style mais ne remplace pas la gestion de sources actualisées.
