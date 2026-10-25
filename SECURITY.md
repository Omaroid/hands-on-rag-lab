# Sécurité

## Modèle de menace

| Menace | Barrière implémentée | Limite |
|---|---|---|
| Abus et bots | Quotas atomiques, corps borné, timeout, contexte borné | Pas de CAPTCHA ni identité forte ; plusieurs adresses peuvent contourner une limite individuelle |
| Injection documentaire | Documents traités comme données, aucun outil exécutable, motifs suspects exclus | La détection par motifs n'est pas exhaustive |
| Citations falsifiées | Identité/URL/passage exact et réponse entièrement extractive | Ne démontre pas la vérité de la note ni la page de référence |
| SSRF | CLI seule, hôtes HTTPS explicites, contrôle IP, redirects refusés | La résolution/proxy doit aussi être sécurisée côté hébergeur |
| Secrets navigateur | Aucun secret requis, scan du bundle et secretlint | Un scan n'est pas une preuve exhaustive |
| XSS | React rend du texte ; aucun dangerouslySetInnerHTML ; CSP | Revoir toute future dépendance Markdown |
| CSRF/CORS | JSON seulement, Origin exact, cross-site Fetch Metadata refusé, aucun cookie d'auth | Les clients serveur sans Origin restent soumis aux quotas |
| Facturation | Aucun fournisseur payant actif ; API serverless fermée | Ne pas changer de plan ou ajouter des clés sans nouvelle revue |
| Vie privée | HMAC d'IP avec clé secrète et sel journalier, cache borné en RAM sans question | Un HMAC reste un identifiant pseudonymisé et ne remplace pas une politique RGPD |

## Contrôles HTTP

CSP self-only sans inline script ; `frame-ancestors 'none'`, HSTS, nosniff, Referrer-Policy
no-referrer, Permissions-Policy restrictive, X-Frame-Options DENY. Les en-têtes du site statique
sont définis dans vercel.json. Le backend sert les mêmes protections. HTTPS est assuré par
Vercel pour l'édition publique ; en local HSTS n'active pas TLS.

Le backend n'accepte aucune URL utilisateur à ouvrir, aucun upload, aucune instruction système,
aucun outil d'écriture. Les trois outils MCP sont locaux en stdio ; ils ne sont pas un service
HTTP public échappant aux quotas. Leurs annotations read-only sont informatives : le code
n'expose effectivement aucune opération d'écriture.

## Secrets et exploitation

`.env` ignoré, clé Qdrant côté serveur seulement. En cloud, créer une clé de lecture limitée
à l'index dédié et conserver la clé d'écriture dans l'environnement de l'ingestion. Ne jamais
réutiliser un projet Supabase ou une collection existante. Le secret HMAC doit être aléatoire
et persistant sur un hôte public durable ; le secret éphémère est réservé au démarrage local.

Uvicorn se lance sans access log et sans confiance dans les proxy headers en local. En présence
d'un reverse proxy, définir explicitement les proxys de confiance avant d'identifier les clients.
Ne pas lire un `X-Forwarded-For` arbitraire. L'hébergement CDN peut conserver des logs propres
au fournisseur : vérifier sa politique séparément.

## Dépendances et signalement

Versions verrouillées dans uv.lock et package-lock.json. CI : Ruff, mypy, pytest, pip-audit,
npm audit, secretlint, schémas, build, Playwright, bundle scan et Docker. Les audits datent de
leur exécution ; ils ne promettent pas l'absence de vulnérabilités futures.

Ne publier aucun secret dans une issue. Pour un incident local : arrêter le service, révoquer
la clé concernée dans sa console, corriger, reconstruire, refaire les contrôles. Une révocation
ne consiste pas à effacer seulement le secret du dernier commit.
