# Contribuer

Créer une branche courte et des commits cohérents. Ne jamais ajouter .env, clés, prompts privés
ou données d'utilisateurs. Aucune dépendance ne peut activer un paiement ou télécharger un
modèle à l'insu de l'opérateur. Les templates entreprise ne sont pas à appliquer.

Conserver la distinction notes originales / pages ingérées et hash lexical / modèle sémantique.
Tout changement de schéma public exige une revue puis la régénération explicite de
config/question.schema.json. Ajouter des tests de comportement pour des modifications de logique,
pas des assertions qui recopient simplement l'implémentation.

Exécuter les commandes README avant une PR. Expliquer le problème concret, le changement, les
preuves et les limites. Ne pas annoncer une CI passée si seuls les tests locaux ont été lancés.
Pour une évolution structurante, ajouter un ADR avec contexte, choix, conséquences et validation.
