# Historical browser AI integration

Superseded locally by the server-side NVIDIA integration; see NVIDIA_AI.md.
The deployed version remains unchanged until the NVIDIA readiness requirements are met.

# IA sur l’appareil du visiteur

Sur le site, lancer une recherche, puis cliquer sur **Télécharger et activer l’IA sur cet appareil**.
Une fois le modèle prêt, cliquer sur **Expliquer ces sources avec l’IA**. Le chargement peut
également précéder la recherche. Une question refusée ne peut pas être envoyée au modèle.

Le téléchargement initial représente environ 950 Mo ; il ne démarre pas automatiquement.
Privilégier un ordinateur récent, le Wi-Fi et plusieurs Go de mémoire libre. Le navigateur
peut conserver les fichiers en cache, mais son quota peut l’empêcher. Aucune disponibilité
hors ligne n’est garantie. Le calcul consomme du processeur et de la batterie ; un mobile
peut être trop lent ou manquer de mémoire. Le moteur demande Worker, WebAssembly et un
contexte sécurisé, puis vérifie réellement la compatibilité en chargeant le modèle.

**Arrêter** termine le worker, y compris pendant le chargement ou la rédaction.
**Décharger le modèle** libère le worker ; les fichiers du cache restent éventuellement
présents. Pour les retirer, supprimer les données du site dans le navigateur. Le chargement
est borné à 10 minutes, la rédaction à 3 minutes et 160 nouveaux tokens. Aucun nouvel essai
ni fournisseur de secours n’est lancé automatiquement.

## Modèle, exécution et confidentialité

- Transformers.js 4.3.1, dépendance exacte dans le lockfile.
- `onnx-community/Qwen3-0.6B-ONNX`, révision
  `58ca03a5e7b354b480b1a82b34bde8dc7b854cc0`, poids q4.
- `onnx/model_q4.onnx` : 919 096 585 octets, taille vérifiée via l’API HF et HEAD.
- Modèle de base : [Qwen3-0.6B](https://huggingface.co/Qwen/Qwen3-0.6B),
  [licence Apache-2.0](https://huggingface.co/Qwen/Qwen3-0.6B/blob/main/LICENSE).
  La conversion ONNX identifie ce modèle de base dans sa fiche.
- WebAssembly à un thread dans un worker dédié ; aucun besoin de WebGPU ni de clé.
- Le runtime WASM est servi avec le site. Les poids et le tokenizer viennent de Hugging Face.
  Ce téléchargement révèle l’adresse IP à l’hébergeur ; les questions et extraits ne sont
  pas transmis à un service d’inférence. Ils sont envoyés uniquement au worker local.
- La CSP autorise le téléchargement HF et la compilation WASM ; elle conserve l’interdiction
  des scripts arbitraires et des objets intégrés. Aucun appel Gateway n’est ajouté.

## Ce que signifie une réponse

La recherche reste indépendante. La génération reçoit la question normalisée et les passages
correspondant aux références sélectionnées, bornés à 1 600 caractères par passage.
Le modèle est invité à répondre en français à partir de ces textes. Une instruction de prompt
ne garantit pas l’exactitude : la réponse est marquée comme une reformulation à vérifier.
Les références originales sont affichées avec leurs passages ; elles ne constituent pas une
preuve automatique de chaque affirmation générée. Ce petit modèle peut inventer un mécanisme
ou mal interpréter le français. Ne pas présenter cette fonction comme une validation factuelle.

Cette intégration ne débloque aucune fonction serverless et ne raccorde aucun compteur global.
Elle ne modifie pas le solde, le budget ou les conditions de facturation AI Gateway.
Le service n’utilise pas de fournisseur d’inférence payant ; les limites d’hébergement Hobby
restent celles du site statique existant.

## Vérification

Build TypeScript/Vite, contrôle des signatures de secrets du bundle, 14 parcours Playwright
sur ordinateur/mobile avec les en-têtes de production. Essai réel distinct : téléchargement
des poids et génération WASM dans Chromium ; les tests mobiles vérifient l’interface et
les contrôles, sans prétendre valider la génération sur un téléphone physique.
