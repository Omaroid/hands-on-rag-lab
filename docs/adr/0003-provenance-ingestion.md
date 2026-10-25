# ADR 0003 — Ne pas déguiser des notes en corpus officiel

Statut : accepté.

Contexte : robots et conditions des trois hôtes ne sont pas tous vérifiables depuis le réseau
actuel. Les conditions générales Microsoft Learn ne suffisent pas à présumer les droits de
redistribution de chaque contenu.

Décision : livrer 24 notes originales étiquetées editorial, sans date de récupération inventée.
22 URLs candidates sont explicitement configurées. La CLI exige une revue et robots avant toute
récupération ; un échec laisse l'instantané existant intact.

Conséquence : citations garanties sur les notes, pas sur les pages officielles référencées.
La publication future d'un corpus officiel demandera une nouvelle revue, une ingestion bornée
et une nouvelle évaluation. Aucun scraping massif ni fetch utilisateur n'est introduit.
