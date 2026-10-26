# Version publiée — atelier ludique et architecture

Déploiement production READY `dpl_3JB2cWHctBsiM4Z6npPzrufo4C6R`, code `9a3e62d`,
fusionné et poussé sur main. Site et `/architecture` répondent 200 ; les 30 fichiers
publics et la CSP correspondent exactement au build testé. Statut API ready:true,
entrée invalide 422, ancienne route opérateur 404. Aucun plafond applicatif de demandes.

L’atelier des preuves suit les pages réellement extraites, les cartes découpées et les
vecteurs calculés, puis les rangs de recherche et le contexte retenu. Les étapes sont
cliquables et les aperçus sont tirés des PDF locaux. Un petit défi distingue E5 et NVIDIA.
La page Architecture détaille les huit étapes, les formules interactives et la frontière
de données, avec un mode utilisant les chiffres de la dernière recherche.

Validation : **22 cas navigateur réussis** (14 PDF/OCR/recherche, 6 architecture et 2 atelier),
**13 tests serveur réussis**. Accessibilité et débordement vérifiés sur ordinateur/mobile
Chromium émulé. Audit dépendances frontend production : aucune vulnérabilité connue.
Nouveau parcours réel, deux PDF → E5/BM25/RRF → consentement → API publique → NVIDIA
HTTP 200 → citation guide.pdf page 1 ouverte. Les limites de transport TLS du sandbox
restent explicites dans `evidence/workshop-live-desktop.json` : interface locale aux
assets identiques au public, cache E5 vérifié et relais API avec TLS vérifié. Aucun faux
résultat fournisseur ni contournement TLS. Aucun achat ni changement de plan.

Preuves : `evidence/generation-publication-current.json`, `workshop-validation.json`,
`workshop-live-desktop.json`, captures architecture/atelier et pdf-screenshots/workshop-live-*.

---

# Mise à jour — suppression des plafonds de demandes, 26 octobre 2026

À la demande explicite du propriétaire, tous les quotas de demandes du parcours PDF public
ont été supprimés : minute, jour, mois et client. Le message « La limite de demandes est
atteinte » a été retiré de l’interface. `server/quota.js`, ses tests et la dépendance Blob
ont été supprimés. Les anciennes variables de quota et le store restent inactifs : aucun
accès au compteur ne précède désormais l’appel NVIDIA. Aucune ressource tierce n’a été supprimée.

Le déploiement de correction `dpl_C7Je4sFXTpH2EmT3evxhCs4bFtXR`, code `b38111e`, est READY
sur https://lakehouse-rag-lab.vercel.app. Un nouvel appel public consenti a renvoyé HTTP 200
et une réponse réelle NVIDIA citée (« 25 jours de congés payés par an »).
Le consentement, la validation des entrées et les bornes techniques des fichiers, du contexte
et du modèle restent en place. Ce sont des contraintes de traitement, pas des quotas de demandes.
La disponibilité et les éventuelles limites propres à NVIDIA/Vercel restent celles des fournisseurs ;
la gratuité et l’absence de limite du compte NVIDIA sont déclarées par le propriétaire,
non vérifiées indépendamment. Aucun achat ni changement de plan n’a été effectué.

La nouvelle page `/architecture` présente la frontière navigateur/serveur, huit étapes
inspectables et les formules BM25, cosinus et RRF. Son exemple pédagogique se distingue des
données de la dernière recherche. BM25 partage la fonction de calcul avec le moteur ; les
rangs, vecteurs et termes réels restent en mémoire locale. La navigation conserve la session PDF.

Les sections suivantes sont un **historique** : les obligations de compteur et plafonds qu’elles
décrivent ne s’appliquent plus au parcours PDF déployé depuis cette mise à jour.

---

# Reprise — génération NVIDIA publique activée, 26 octobre 2026

## État actuel opérationnel

Site : https://lakehouse-rag-lab.vercel.app. NVIDIA_API_KEY est maintenant déclarée comme
variable **sensible de production** par le propriétaire, sans lecture de sa valeur.
RAG_PUBLIC_GENERATION a été activé et le projet dédié redéployé. Le compteur Blob durable,
le consentement et toutes les bornes restent obligatoires. Aucun achat ou changement de plan.

Un premier essai public a révélé un bug dans l'adaptateur JavaScript : `tool_calls: []`
était considéré comme un appel d'outil parce qu'une liste vide est truthy en JS. NVIDIA
renvoyait pourtant HTTP 200, finish_reason stop, role assistant. Le contrôle accepte
maintenant un champ omis, null ou une liste vide ; les vraies demandes d'outils et valeurs
malformées restent refusées. Test de régression ajouté. Les diagnostics ne journalisent
que des champs autorisés (étape, UUID, code, durée et métadonnées bornées), jamais clé,
question, IP, passage, réponse ou raisonnement. Voir nvidia-public-diagnostic-current.json.

**19 tests serveur réussis**, 14 tests navigateur précédents conservés, plus **deux parcours
réels complets** de l'interface vers l'API de production :
- desktop : deux PDF texte, E5/BM25/RRF, consentement, réponse NVIDIA « 25 jours de congés
  payés par an », citation guide.pdf page 1 ouverte avec le vrai passage ;
- mobile Chromium émulé : PDF scanné, OCR FR/EN, E5, réponse NVIDIA « budget annuel de
  formation de 500 euros », citation scan.pdf page 1 ouverte.
Un appel HTTPS public direct a aussi confirmé HTTP 200 et les références.
Ces réponses ne sont pas simulées. Les deux cas UI simulés antérieurs restent distingués.

Précision de test : le Chromium du sandbox refuse la CA du proxy. Les deux parcours réussis
utilisent donc le build local **identique aux 30 assets publics**, le vrai encodeur E5
avec cache vérifié par SHA-256, et un relais Playwright vers l'API publique utilisant le
proxy et la CA configurés, avec Origin de production. Aucune vérification TLS désactivée.
Ce n'est pas un test natif sur téléphone physique ni une navigation directe Chromium TLS
réussie. Les fichiers publics du modèle ont aussi été téléchargés et leurs empreintes
vérifiées séparément pendant l'essai de transport. Captures réelles sous evidence/pdf-screenshots.

Déploiement actif : `dpl_BdcK11wDoNRx4rLn7Xd2Huvt5rM4`, READY, code
`5f454778a92ecddc964ead83173f8a6a6c15b1b0`, fusionné et poussé sur main.
HTTP public 200 ; statut ready:true ; entrée forgée rejetée 422 ; ancienne route de
vérification 404. HTML, CSP et 30 assets identiques au build testé. Aucune fixture modèle
ou PDF de test déployée. Dernier résumé : evidence/generation-publication-current.json.
Preuves détaillées : nvidia-public-generation-current.json, pdf-live-desktop-current.json,
pdf-live-mobile-current.json. Le backend Python historique reste inchangé (100 tests lors
du dernier contrôle). Aucune autre application/base modifiée, aucun secret dans Git/bundle.

Les limites restent 3/minute, 20/jour, 200/mois et 6/jour/client. Les tentatives échouées ne
sont pas remboursées. Les conditions NVIDIA restent distinctes de cette validation technique :
endpoint annoncé gratuit et déclaration propriétaire, pas de vérification indépendante
illimité/conditions du compte. Les réponses doivent être vérifiées dans les passages cités.

---

## Historique avant activation

# Reprise — génération PDF, état vérifié le 26 octobre 2026

## Compteur durable validé ; clé NVIDIA Vercel absente

Le store Blob privé `store_etqnqyg3va5gtf18` a été créé pour le seul projet dédié,
équipe Hobby vérifiée. La documentation Hobby confirme gratuité et arrêt au dépassement,
sans dépassement facturé. Aucun autre store/base/projet réutilisé, achat ou changement de plan.
Aucun PDF, question, extrait ou vecteur stocké : seulement compteurs et identifiants HMAC.

Compteur réel testé sur 12 demandes HTTP à des fonctions serverless, 6 en concurrence,
plafond 3 : exactement 3 succès, 8 refus quota, 1 fermeture sous contention, compteur final
3 et révision 3, compteur public resté à 0. Lecture origine non cachée + ETag/ifMatch,
4 tentatives CAS maximum, échec fermé. Preuve `evidence/blob-quota-current.json`.
Limites de production fixes : 3/minute, 20/jour, 200/mois, 6/jour/client. Aucun compteur
mémoire ou /tmp ne remplace Blob. Le reçu RAG_QUOTA_VERIFIED est posé après le test réel.
La route et le jeton temporaires de vérification sont supprimés de la version finale.

L'API PDF est implémentée : corps et passages bornés, consentement, quota avant appel,
endpoint/modèle NVIDIA fixes, aucun outil/retry/redirection ; JSON de réponse contrôlé,
statuts supported/incomplete/absent, citations fichier/page depuis les données validées.
Le serveur ne prétend pas vérifier la fidélité de passages à un PDF qu'il n'a pas reçu.
L'interface génère seulement après consentement, montre les statuts, ouvre les citations,
nettoie les erreurs et efface réponse/consentement à la réinitialisation.

Quatre appels NVIDIA réels séparés sur textes synthétiques ont validé réponse étayée,
incomplète, absence et refus d'injection, avec le constructeur de requête et le validateur
JS réellement employés par le serveur. Ce n'est pas un test public complet PDF→NVIDIA.
Les 17 tests serveur passent ; 14 parcours navigateur passent, avec OCR/E5 réels et
réponses fournisseur simulées dans les deux cas UI de génération. Backend Python inchangé,
dernière validation 100 tests. Audits npm root/frontend à 0 après correction Zod transitive.
Preuves : nvidia-pdf-contract-current.json et generation-readiness-current.json.

Blocage restant : NVIDIA_API_KEY n'est pas dans les métadonnées du projet Vercel. La tâche
reçoit une référence de proxy, pas une clé exportable. VERCEL_TOKEN donne le droit d'écrire
les variables mais ne révèle pas cette valeur ; copier la référence serait inutilisable.
Aucun placeholder NVIDIA n'a été copié dans Vercel. Aucune ancienne clé recherchée ou utilisée.
Le propriétaire doit injecter la clé réelle directement par une configuration sécurisée
Vercel (jamais en chat), puis nous pourrons activer RAG_PUBLIC_GENERATION, redéployer et
vérifier une vraie génération publique bornée. En attendant le flag reste false et l'API 503.
Les conditions du compte NVIDIA restent déclaratives ; endpoint annoncé gratuit, usage
illimité non vérifié indépendamment. Aucun achat/auto-recharge/carte/upgrade.

Version finale fusionnée et poussée sur main, source produit
`996ab965a4bca75ed4f99cfa9085c8a12d2b7e2f`, déploiement
`dpl_HrXkrp1cMTHG5c6ZD7GDifiivBDL`, READY. Domaine exclusivement
https://lakehouse-rag-lab.vercel.app / prj_bx0b78VzJb6VNA2OyyIOElDnBiEE.
HTTP 200, HTML/CSP et 30 assets identiques au build testé ; API status false, answer 503,
route temporaire de vérification 404. La variable opérateur temporaire est supprimée,
ainsi que sa copie locale ; le sel de quota reste uniquement dans les secrets Vercel.
Un dernier contrôle des métadonnées confirme l'absence de NVIDIA_API_KEY dans le projet.
La validation des dates/totaux incohérents a été renforcée sans changer le CAS, avec
17 tests serveur réussis. Preuve finale : evidence/generation-publication-current.json.
Les tests navigateur publics restent limités par la CA du proxy, sans désactivation TLS.
Voir docs/PDF_GENERATION.md pour le contrat, les limites et les conditions d'ouverture.

---

# Reprise — état vérifié le 26 octobre 2026

## État actuel : vitrine PDF publiée

Branche `feat/nvidia-server-inference`, checkpoint initial `afd085a` conservé. Interface
Source FR/EN sur les PDF visiteurs : 5 Mo cumulés, 10 fichiers, 40 pages, extraction PDF.js,
OCR FR/EN Tesseract, encodeur E5 q8 réellement exécuté, BM25, RRF, contexte borné et citations
fichier/page. Texte extrait, passages, comptes de tokens et coordonnées vectorielles visibles.
Session en mémoire ; arrêt et suppression terminent les workers. Pas de bibliothèque persistante.
Le frontend historique Lakehouse et son backend restent dans le dépôt ; la production choisit
le build PDF par `VITE_RUNTIME=browser`. Voir `docs/PDF_RAG.md` pour architecture et limites.

Configuration attachée révision 2 : secrets NVIDIA/Vercel présents, états déclarés unknown,
donc pas qualifiés ready. Accès authentifiés réels réussis via le proxy : catalogue NVIDIA
HTTP 200, modèle demandé présent ; lecture du projet Vercel dédié HTTP 200. Une génération
réelle NVIDIA Chat Completions a réussi sur un passage synthétique, 155 tokens d'entrée,
39 en sortie, plafond 512, aucun retry. Aucun secret affiché, aucune ancienne clé recherchée.
Contrat Python corrigé vers Chat Completions, qui est documenté et testé. Voir NVIDIA_AI.md.

La génération publique reste fermée : aucun compteur global atomique durable gratuit connecté,
aucun Blob créé, aucune autre base réutilisée. Routes Vercel status false / answer 503, bouton
NVIDIA désactivé et indisponibilité expliquée. Le raccordement de génération spécifique aux PDF
reste à faire une fois les protections établies ; le backend historique ne lit pas ces PDF.
La page NVIDIA annonce un endpoint gratuit ; conditions du compte et usage illimité restent
non vérifiés indépendamment. Compte utilisateur Vercel Hobby confirmé via le connecteur.
Aucun achat, recharge, carte, changement de plan ou autre projet modifié.

Validation : 100 tests Python, 12 tests PDF navigateur desktop/mobile, Ruff/mypy/build,
axe WCAG2A/AA sur accueil et résultats, audits npm/Python sans vulnérabilité connue.
Le projet Python local non publié est ignoré par pip-audit. Les tests PDF emploient de vrais
PDF/OCR/embeddings ; seuls les téléchargements HF passent par un cache local vérifié car le
navigateur cloud refuse la CA du proxy. Aucune vérification TLS désactivée. Ce n'est pas une
preuve de téléchargement HF depuis un téléphone physique. Captures réelles dans
`evidence/pdf-screenshots/`, synthèse `evidence/pdf-validation-current.json`.

Publication effectuée : branche poussée puis fusionnée par fast-forward dans main.
Code produit `93d0ee8`, configuration d'installation `3205a66`. Déploiement de production
`dpl_DxdCEKHq43qewTpr8vkcSUnpTHHS`, source exacte
`3205a6624d5b303d869008f32b010d028101798a`, READY, sur le projet/équipe autorisés.
Domaine https://lakehouse-rag-lab.vercel.app : HTTP 200, HTML, CSP et **30 assets identiques**
au build testé. GET /api/ai/status renvoie ready:false ; POST /api/ai/answer renvoie 503.
Le projet n'a pas de liaison Git Vercel ; fichiers sources envoyés par SHA puis création par
l'outil Vercel connecté et build distant verrouillé, comparé au build local. Le CLI refusait
la syntaxe du placeholder secret injecté ; aucune clé n'a été remplacée pour le contourner.
Le transfert des gros assets locaux était interrompu par le proxy, d'où le build distant.

Le contrôle navigateur du domaine public reste bloqué par la CA du proxy du sandbox
(ERR_CERT_AUTHORITY_INVALID, desktop/mobile). Pas de désactivation TLS. Les 12 parcours
réels portent sur le build local identique ; les contrôles HTTPS publics utilisent la CA
configurée du runtime. Ne pas déclarer les parcours publics réussis. Voir
`evidence/pdf-publication-current.json`. Les captures dans evidence sont les rendus réels
locaux. La génération publique reste fermée ; le seul appel réel est le probe synthétique.

La dernière mise à jour de documentation/preuves après publication ne modifie aucun asset.
Pour poursuivre : raccorder et tester un compteur durable atomique gratuit, clarifier les
conditions du compte NVIDIA, puis implémenter/valider le contrat de génération sur extraits
PDF locaux avant toute ouverture. Ne pas supprimer la garde ou réutiliser une autre base.

---

# Reprise — état vérifié le 25 octobre 2026

## Contraintes absolues

Coût obligatoire strictement 0 €. Aucun achat, upgrade, auto top-up, fallback facturable,
Azure/Kubernetes payant ni modification d'autres applications/bases. Aucun Supabase réutilisé.
Aucun secret dans Git, le chat ou le frontend. La CI privée reste désactivée.

## Dépôt et service

- `Omaroid/lakehouse-rag-lab`, `main`, privé.
- Compagnon public : https://lakehouse-rag-lab.vercel.app ; recherche dans le navigateur sur
  les 24 notes originales, hash lexical et réponses extractives.
- Backend sémantique vérifié : FastAPI, neuf nœuds LangGraph, ONNX CPU MiniLM multilingue,
  BM25/RRF et Qdrant Cloud Free dédié existant. Toujours extractif, aucun LLM distant.
- Endpoint Qdrant :
  `https://85462729-45d6-473d-b8aa-fc712b1b14c0.eu-west-1-0.aws.cloud.qdrant.io:443`.
- Collection `lakehouse_docs_multilingual_v1` : **1 034 points officiels**, 384 dimensions,
  cosinus ; index payload keyword `product` créé. Filtrer sans cet index échoue en mode strict.
- Les clés Qdrant et variables sont observées `ready`, politique réseau `enforced`.
  Les permissions supplémentaires d'exécution sont nécessaires dans ce sandbox pour le réseau
  et les tests TestClient ; le blocage AnyIO venait du sandbox. Ne pas changer les clés.

## Modèle et corpus

Le modèle FastEmbed 0.9.1 est `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`.
Poids ONNX quantifiés : `Qdrant/paraphrase-multilingual-MiniLM-L12-v2-onnx-Q`, révision
`faf4aa4225822f3bc6376869cb1164e8e3feedd0`. Cinq fichiers disponibles dans
`work/models/multilingual-minilm`, hors Git ; SHA-256 contrôlés par `scripts/verify_semantic.py`.
Limite réelle : 128 tokens, titre et tokens spéciaux inclus. Pas de téléchargement implicite.
L'API renvoie maintenant 422 pour une question dépassant cette limite.

Corpus officiel livré : `corpus/delta-official-semantic.json`, 20 documents du dépôt officiel
`delta-io/delta` à la révision `7c660debfc3ef2dab6006fa012b15a13cd5ffc69`.
Licence Apache-2.0, NOTICE et modifications dans `corpus/licenses/delta/`. Sources et empreintes
sont dans `evidence/delta-source-manifest.json`. Aucun code MDX/SQL n'a été exécuté.
Les citations pointent vers les fichiers exacts à cette révision. ADR 0006 explique ce choix.
Les revues des sites Databricks, Microsoft Learn et docs.delta.io demeurent pending ;
leur statut n'a pas été changé pour débloquer l'indexation. La revue Databricks reste différée.

## Commandes

Installer : `UV_CACHE_DIR=work/uv-cache uv sync --locked --group semantic`.
Lancer l'interface et l'API sur `http://localhost:8000` :

```bash
.venv/bin/python scripts/serve_semantic.py \
  --corpus corpus/delta-official-semantic.json \
  --model-dir work/models/multilingual-minilm --cloud --build
```

Le service retire `QDRANT_WRITE_API_KEY` de son environnement. Sans `--cloud`, Qdrant est local
en mémoire. `LAKEHOUSE_CORPUS` sélectionne le corpus ; un fichier explicite absent échoue.
Pour l'indexation admin, utiliser `scripts/index_qdrant.py` avec le backend multilingue,
le corpus officiel et la clé d'écriture ; une seconde passe a renvoyé 0 changement.
Pour régénérer le corpus, voir `scripts/ingest_delta_snapshot.py` et ADR 0006.

## Vérifications réellement réussies

- 64 tests Python ; Ruff, format, mypy, schémas des deux corpus.
- 42 cas × 4 stratégies avec vrais embeddings ; hybride Recall@4 = 0,9833, MRR = 0,9778.
  Ces mesures concernent le corpus éditorial synthétique, sans benchmark indépendant.
- 8 questions FR/EN sur le corpus officiel en local puis en cloud : réponses citées exactes.
- Tous les payloads distants sont identiques au corpus ; 3 vecteurs recalculés ont un cosinus
  proche de 1 avec les vecteurs distants. Voir `evidence/cloud-semantic-integration.json`.
- 12 parcours navigateur baseline + 6 parcours backend sémantique cloud desktop/mobile,
  avec axe, filtres, comparaison, sources réelles et provenance. Les tests cloud ont trouvé
  le défaut d'index payload, corrigé et retesté.
- L'intégration HTTP du modèle réel couvre réponse, NDJSON, injection, origine et fermeture
  serverless. Le dernier Docker du baseline reste historique, pas reconstruit dans cette reprise.

## Ce qui reste nécessaire pour une API publique et un LLM

La garde serverless reste fermée car aucun compteur atomique durable gratuit n'est raccordé.
Aucune intégration Upstash n'est installée dans l'équipe Vercel ; les bases existantes restent
hors périmètre. Une exploration documentaire confirme aussi des écritures Blob conditionnelles
par ETag, mais aucune ressource Blob, implémentation de quotas ou garantie de coût n'a été
créée/déclarée validée sur cette piste.

Le catalogue AI Gateway est lisible et annonce des modèles à prix nul. Cela ne vérifie ni
l'éligibilité du compte, ni les coupures et fallbacks du compte exact. Aucun accès LLM n'est
configuré dans l'environnement observé. Ne pas appeler de modèle ni demander une clé en chat.
Le compte Vercel utilisateur est Hobby ; aucun changement de plan n'a été effectué.

Poursuivre les quotas durables et les garanties fournisseur avant de déployer la vraie API
publique. Ne pas supprimer la garde ni annoncer la génération distante comme réalisée.


## Dernière publication

Les changements ont été poussés sur main ; le compagnon a été redéployé à partir du commit
`afea23a6a4301c1047ff37a2b11fce3bea572c6f`, déploiement
`dpl_ALgAGxsJCQBgu4PrFXH2mCJ2chio`, production READY. HTTP et assets vérifiés identiques au
build navigateur testé. Le navigateur distant du sandbox refuse la CA du proxy ; aucune
vérification TLS n'a été désactivée. Les tests locaux réels totalisent 18 parcours réussis,
dont 6 sur le chemin Qdrant Cloud. La synthèse actuelle est `evidence/integration-current.json`.


## Dernier contrôle budget gratuit

Voir `evidence/budget-validation.json` et la dernière section de COST.md. Compte utilisateur
Hobby confirmé ; solde AI Gateway gratuit et auto top-up non vérifiés. Le CLI 65.2.0 annonce
un budget minimum de 1 USD et les budgets Gateway sont souples (pas une garantie de facture
0 €). Aucun budget fournisseur n'a été modifié. Le CLI n'a pas d'identifiants existants et
le connecteur ne propose pas l'opération budget. Ne pas inventer un budget 0 activé, ni
relever le plafond pour débloquer. Aucun appel génératif, achat ou changement de plan.


## Reprise suivante — diagnostic de crédits prêt, secret non injecté

Le propriétaire demande de conserver le budget existant de 5 USD, sans le reconfigurer.
Il indique avoir enregistré la nouvelle clé dans les secrets de cette tâche. Le runtime
observé à la révision 11 est toutefois toujours lié à la configuration publiée
`057bbfbd-5978-40d3-b706-70276f47f466~cecfgver_6ade6e3982ec819e8215c67d00a946d8`,
qui ne lie que les deux secrets Qdrant ; `AI_GATEWAY_API_KEY` est absent du processus.
Le projet Vercel dédié ne contient aucune variable non plus. Ne pas rechercher la valeur
dans les fichiers ou réutiliser la clé précédemment publiée en chat.

`python -m lakehouse.gateway_setup --connect` est maintenant prêt : GET borné du solde,
aucun appel génératif, aucune modification de budget, aucun achat. La lecture du solde ne
prouve pas la gratuité des crédits ni l'état de l'auto top-up. Quinze tests couvrent la clé
manquante, les erreurs, les redirections, les montants invalides et l'absence de fuite.
Voir `evidence/gateway-readiness-current.json` et la fin de docs/CLOUD_SETUP.md pour le
raccordement du nouveau secret dans une nouvelle version de configuration.


## Reprise du budget Gateway — contrôle du 25 octobre 2026

Instruction actuelle : régler le budget pertinent à 5 USD, sans achat, auto-recharge,
ajout de moyen de paiement ni changement de plan ; coût obligatoire 0 €.
Cette instruction remplace la consigne historique de ne pas reconfigurer le budget.

Réalisé : main récupéré à `f4701e6`, résumé lu. Aucune modification locale préexistante
observée dans cette session ; les trois changements signalés n'étaient pas présents.
Les deux variables VERCEL_TOKEN et AI_GATEWAY_API_KEY sont présentes, sans affichage
ni sauvegarde de leurs valeurs. La configuration réellement attachée, révision 2,
lie ces secrets aux domaines appropriés. Les observations sont actuelles, mais leurs
états de préparation et celui de la politique sont `unknown`, donc pas déclarés `ready`.
L'accès réel via le proxy à api.vercel.com fonctionne au niveau HTTP, sans prouver
une autorisation de gestion. GET Gateway /v1/credits : HTTP 200, solde 0 USD,
usage cumulé 0 USD. Guide AI Gateway et référence spend-observability lus ; aide
actuelle du CLI 65.2.0 consultée pour budgets set/list et api-keys inspect.

Bloqué : GET Vercel /v2/user → 404 User not found ; /v2/teams → 403 ;
/v5/user/tokens/current → 404 Token not found ; /ai-gateway/directory/keys → 403 ;
/ai-gateway/budgets/list → 404 AI Gateway Budget not found. Ce dernier résultat
ne démontre pas l'absence de budget dans l'équipe propriétaire inconnue.
L'équipe de la clé n'est pas identifiée et n'est pas assimilée à celle du connecteur.
Aucun budget inspecté avec succès, modifié ou relu : **5 USD reste non vérifié**.
Il faut rétablir l'autorisation de gestion du jeton via le mécanisme sécurisé de
configuration de tâche, puis identifier l'équipe de la clé et son budget avant toute écriture.
Ne jamais fournir un secret en chat.

L'éligibilité gratuite du compte exact et l'auto top-up désactivé restent inconnus.
La référence AI Gateway indique qu'un moyen de paiement valide est requis pour débloquer
les crédits gratuits ; aucune carte n'a été ajoutée et aucune éligibilité n'est déduite
du seul solde. Budget souple : une requête peut franchir la limite, propagation différée,
BYOK hors compteur. Il ne garantit ni plafond strict de 5 USD ni facture 0 €.
Aucun appel génératif, achat, recharge, ajout de paiement, changement de plan ou
modification d'autre projet. La garde serverless reste fermée faute de compteur atomique
durable gratuit. Preuve actuelle : `evidence/gateway-readiness-current.json`.


## Interface guidée — modifications locales du 25 octobre 2026

Présentation « Lakehouse Knowledge », mentions de budget et marqueurs LAB/v0.1 retirés
 de l'interface. Parcours interactif question/pistes/preuves/réponse, explications des
filtres et stratégies, lecture des classements et conseils en cas de refus. Les nombres
proviennent des résultats réels ; aucune progression de pipeline simulée. Provenance
éditoriale/officielle et fonctionnement extractif conservés. Aucun backend ni garde modifié.
Validation : build TypeScript/Vite réussi, 8 tests Playwright desktop/mobile réussis,
contrôle axe et absence de débordement, captures du rendu inspectées. Rapports temporaires
sous work/. Publication effectuée, voir ci-dessous.


## Publication de l’interface guidée

Tous les changements ont été poussés sur main. Interface déployée en production depuis
`57a7b02bc1973c1ad891bbfdb28c12890f675955`, déploiement
`dpl_22BfV94vw6QEReEHigbDi6AA6cLt`, READY, domaine
https://lakehouse-rag-lab.vercel.app. HTTP 200 ; JS et CSS identiques au build testé.
Les 8 tests Playwright passent aussi sur le domaine public, desktop et mobile,
avec parcours guidé, citations, refus, filtres, comparaison, architecture, axe et débordement.
Aucune génération distante ni modification de la garde serverless. Les blocages Gateway
restent ceux documentés ci-dessus. Preuve : evidence/publication-current.json.


## Demande d’activation IA — nouveau contrôle

La configuration attachée est maintenant observée à la révision 5 : secrets Gateway et
Vercel ready, politique réseau enforced. Cela ne résout pas l’autorisation effective :
GET /v2/user renvoie toujours 404 User not found, /v2/teams 403 ; GET Gateway /v1/credits
renvoie 200, balance 0 et total_used 0. Aucune génération lancée, garde serverless fermée.
Le site publié reste extractif. Choix demandé entre poursuivre Gateway sous les contraintes
existantes et intégrer un modèle exécuté sur l’appareil du visiteur ; cette seconde voie
nécessite de vérifier téléchargement, licence, mémoire, compatibilité et qualité FR.


## IA exécutée dans le navigateur

Le propriétaire a choisi une génération sur l’appareil du visiteur. Intégration Qwen3 0,6B
ONNX q4, révision épinglée, Transformers.js 4.3.1, WASM dans un worker à un thread.
Activation explicite après annonce d’environ 950 Mo, progression, arrêt/déchargement,
timeouts, contexte borné et 160 nouveaux tokens. Aucun Gateway, clé frontend ou backend
serverless activé. La recherche extractive reste indépendante et disponible en cas d’échec.
Les réponses générées sont distinctes des passages sources, sans garantie d’exactitude.
Le candidat précédent Qwen2.5 0,5B a été écarté après deux réponses françaises inadéquates.
Voir docs/BROWSER_AI.md pour l’utilisation, la provenance, la licence et les limites.

Validation IA locale : poids réels chargés, génération Qwen3 terminée en français dans
Chromium sous la CSP de production. La phrase produite reste imprécise (« système
d’accompagnement des transactions »), ce n’est pas une réponse factuellement validée.
Le modèle compact n’a pas de garantie de qualité ; références et avertissement sont visibles.
Le cache navigateur du sandbox a refusé les poids, sans empêcher l’inférence : ne pas promettre
le mode hors ligne. 14 tests d’interface passent sur desktop/mobile, y compris compatibilité,
arrêt et échec simulé du worker ; aucun test d’inférence sur téléphone physique.
Preuve : evidence/browser-ai-current.json. Build et détection de secrets réussis.

Dernier réglage de fidélité : repetition_penalty=1.0, pour ne pas pénaliser les mots
présents dans les sources. Nouvelle génération réelle sous CSP : « [1] Delta Lake fournit
des transactions ACID. » Cette phrase est étayée mais peu informative ; ne pas revendiquer
une qualité technique générale. Les 14 parcours d’interface passent aussi en production.
Notices Transformers.js et ONNX Runtime distribuées sous frontend/public/licenses.


Publication IA locale finale : main poussé ; version interface/worker déployée depuis
`919693396b2e3926e88e49fc4c2c134b365d2876`, déploiement
`dpl_Axi46Ph72kxaby7MMJheHWgp3nAF`, production READY. Domaine public HTTP 200,
CSP identique au test local ; JS, CSS, worker, module et binaire WASM ainsi que notices
identiques octet pour octet au build testé. Les 14 tests desktop/mobile passent sur ce
déploiement final. La génération réelle a été testée séparément dans Chromium sur les
mêmes assets avec la même CSP, pas sur un téléphone physique. Les limites de qualité
ci-dessus restent applicables. Aucun appel Gateway ni achat ; garde serverless inchangée.
Utilisation : télécharger/activer (~950 Mo), poser une question, puis « Expliquer ces
sources avec l’IA ». Ordinateur récent et Wi-Fi recommandés.
Preuves : evidence/publication-current.json et evidence/browser-ai-current.json.

## NVIDIA — remplacement préparé, non activé

Le propriétaire demande une inférence NVIDIA côté serveur à la place du téléchargement du
modèle navigateur. L’exemple fourni correspond à Responses avec openai/gpt-oss-20b, pas à
un entraînement. La clé publiée en chat est exposée : elle n’a été ni utilisée ni enregistrée ;
rotation puis injection sécurisée de NVIDIA_API_KEY nécessaires. Aucun secret demandé en chat.
La configuration attachée ne lie pas NVIDIA_API_KEY et n’inclut pas les hôtes NVIDIA.
Les sondes publiques de documentation/catalogue ont échoué. Contrat API actuel et conditions
gratuites du compte non vérifiés ; aucune inférence NVIDIA réelle exécutée.

Code préparé : adaptateur httpx serveur, endpoint/modèle fixes, consentement obligatoire,
recalcul des preuves côté serveur, quota réservé avant appel, aucun retry/redirect/outillage,
réponse bornée et erreurs sans détails fournisseur. Le frontend utilise seulement des URLs
same-origin ; dépendance Transformers, worker et permissions CSP WASM retirés. Service
indisponible affiché honnêtement tant que les conditions ne sont pas réunies.

96 tests Python, 14 tests navigateur, Ruff, mypy, build, contrôle des signatures de secrets
et audits passent. Réponses NVIDIA simulées seulement. La garde serverless reste fermée.
Le site public précédent n’a pas été redéployé : backend public, compteur durable gratuit,
clé de remplacement et conditions fournisseur restent à raccorder/vérifier.
Voir docs/NVIDIA_AI.md et evidence/nvidia-readiness-current.json.

Le propriétaire indique que NVIDIA est gratuit et sans limite d’usage. Information consignée
comme déclarative : aucun quota fournisseur n’a été constaté. Les protections anti-abus du
site restent distinctes. Configuration attachée révision 12, politique enforced : aucun
secret NVIDIA ni domaine NVIDIA autorisé. Le remplacement est conservé sur une branche
préparatoire pour ne pas remplacer le site actif par une génération indisponible.

## Reprise vers une vitrine RAG PDF généraliste — 26 octobre 2026

Le propriétaire demande maintenant une application RAG sur les PDF des visiteurs, pas
uniquement Lakehouse, avec tests, déploiement, explications de chaque étape et captures.
Choix explicitement confirmés : plusieurs PDF mais **5 Mo maximum pour l’ensemble**,
PDF scannés avec OCR, session temporaire sans bibliothèque conservée, interface FR/EN
et parcours pédagogique toujours visible. Montrer la décomposition de la question,
les scores vectoriels et BM25, la fusion RRF, les passages retenus et les raisons de leur
sélection, avec citations fichier/page. Rester simple et efficace ; ne pas présenter
un hash lexical comme de la sémantique ni un score comme une probabilité.

Le test de configuration réellement attachée observe encore la révision 14, politique
enforced, **aucun secret NVIDIA et aucun domaine NVIDIA**. NVIDIA_API_KEY absent du
processus ; les sondes publiques NVIDIA échouent avec tunnel HTTP 403. Le propriétaire
confirme ensuite : « Continue la préparation ; on débloquera NVIDIA ensuite », puis
souhaite rouvrir une session pour recharger la clé. La prochaine session doit revérifier
sa propre configuration et les accès, sans réutiliser les observations comme preuve.
Les variables du projet Vercel dédié étaient vides au dernier contrôle (métadonnées
seulement, aucune valeur de secret consultée). Aucune génération NVIDIA réelle faite.

Préparation actuelle : branche feat/nvidia-server-inference, base a94744e, déjà poussée.
Ce commit contient le remplacement serveur NVIDIA désactivé par défaut, testé avec
96 tests Python et 14 tests navigateur **à réponses NVIDIA simulées**, Ruff/mypy/build
et audits réussis. Le site public reste l’ancienne version sur main, non remplacée.

Après ce commit, seules les dépendances PDF/OCR/embeddings ont été ajoutées :
pdfjs-dist 6.4.299, tesseract.js 7.0.0, @huggingface/transformers 4.3.1 ; lockfile mis à jour
avec npm install --ignore-scripts. Elles ne sont **pas encore intégrées ni validées**.
Aucune interface PDF, OCR ou indexation de PDF n’est implémentée à ce stade.
Candidat d’encodeur (pas de modèle génératif local) : Xenova/multilingual-e5-small,
révision 761b726dd34fb83930e26aab4e9ac3899aa1fa78, model_quantized.onnx 118308185 octets.
Sa licence et son comportement doivent encore être vérifiés ; ce n’est pas une sélection
validée. Ne pas réinstaller des poids de génération de 950 Mo.

Piste d’architecture, **pas une réalisation** : lecture PDF + OCR + embeddings/retrieval
sur session navigateur pour éviter le stockage des documents ; génération NVIDIA
uniquement serveur et après consentement. Prévoir des limites de pages/texte/chunks et
un arrêt effectif. Le coût obligatoire reste 0 €, sans achat/auto-recharge/carte/upgrade,
et ne toucher qu’au projet dédié. La garde serverless doit rester fermée sans compteur
atomique durable gratuit raccordé et testé. La documentation Vercel consultée confirme
les écritures Blob conditionnelles par ETag/ifMatch (optimistic concurrency), mais aucun
store Blob n’a été créé, aucun CAS/compteur n’a été implémenté ou validé, aucune gratuité
n’en est attestée. Ne pas annoncer cette piste comme protection active.

Projet Vercel : prj_bx0b78VzJb6VNA2OyyIOElDnBiEE,
équipe team_0yx8bLSbYEsadJbCiwOd28l6, domaine lakehouse-rag-lab.vercel.app.
La publication est autorisée par le propriétaire, mais les fonctions NVIDIA doivent
rester indisponibles honnêtement tant que les prérequis ne sont pas satisfaits.
Préserver le travail, informer régulièrement et montrer des captures de vrais parcours
PDF texte et OCR, desktop/mobile, en distinguant tests réels et simulés.
