# ADR 0004 — Graphe borné et MCP local read-only

Statut : accepté.

Contexte : une tâche de réponse documentaire n'exige pas un agent capable d'exécuter des
commandes, de visiter n'importe quelle URL ou de modifier une base.

Décision : neuf nœuds explicites, aucun outil arbitraire et trois outils MCP stdio strictement
bornés. Les motifs d'injection s'ajoutent à la réduction réelle des capacités.

Conséquence : les documents ne peuvent déclencher aucune action externe. Des injections
peuvent encore affecter la pertinence ; les refus et citations restent testés indépendamment.
Un transport MCP public futur doit réutiliser authentification, quotas et garde des coûts.
