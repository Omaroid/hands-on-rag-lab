# 7. Injection, quotas et coûts

Une injection essaie de faire passer du texte documentaire ou utilisateur pour une instruction
système. Aucun prompt seul ne suffit. Ici le graphe n'a pas d'exécuteur de code, de fetch URL
utilisateur ni d'outil d'écriture ; le contenu n'a donc pas ces capacités à détourner.
Des motifs d'injection connus sont exclus, mais ils ne sont pas présentés comme exhaustifs.

Les limites Pydantic ne bornent pas à elles seules la taille du corps HTTP : compter les
octets avant de parser. De même, un compteur en RAM ne borne pas plusieurs fonctions serverless.
Le SQLite avec BEGIN IMMEDIATE réserve atomiquement sur un hôte durable ; ailleurs l'API refuse.

L'IP n'est pas écrite : HMAC secret + date produit un identifiant journalier. Cela reste de la
pseudonymisation. Le cache RAM ne stocke pas la question normalisée ; aucun benchmark ne prend
les questions privées des visiteurs. Le chemin actif n'a aucune API de génération facturable.
