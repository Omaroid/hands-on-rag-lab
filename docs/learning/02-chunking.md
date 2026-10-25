# 2. Pourquoi découper les documents

Un document entier dilue les sujets et peut dépasser le contexte du modèle. Un chunk trop
petit perd la définition, le titre ou les exceptions. Le chevauchement préserve une partie du
contexte entre chunks, au prix de doublons et de stockage.

Le découpage ici suit les titres et paragraphes, conserve le chemin de section, traite listes,
tableaux et blocs de code comme des unités quand leur taille le permet. Le budget initial
650/75 est une estimation caractères/3, pas un comptage exact de tokens. Un tokenizer propre
au modèle sera nécessaire avant une limite d'inférence stricte.

L'identifiant section/position aide à retrouver le chunk ; son hash de contenu indique un
changement. Ces deux fonctions sont distinctes. Modifier une autre section ne doit pas forcer
tous les embeddings à être recalculés.

Exercice : comparer 500/50, 650/75 et 800/100 sur un corpus identique avec les mêmes questions.
Mesurer les passages pertinents récupérés et les doublons, pas seulement le nombre de chunks.
