import { useState, type ReactNode } from "react";
import {
  bm25Breakdown,
  terms,
  type retrieve,
  RRF_K,
  RETRIEVAL_TOP,
  MIN_COSINE,
  CONTEXT_PASSAGES,
  CONTEXT_TOKENS,
  BM25_K1,
  BM25_B,
} from "./pdf-retrieval";
import "./architecture.css";
type Lang = "fr" | "en";
type SearchResult = ReturnType<typeof retrieve>;
function Glyph({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    pdf: (
      <>
        <path d="M6 2h8l4 4v16H6zM14 2v5h5M9 12h6M9 16h6" />
      </>
    ),
    split: (
      <>
        <rect x="3" y="3" width="18" height="6" rx="1" />
        <rect x="3" y="13" width="8" height="8" rx="1" />
        <rect x="15" y="13" width="6" height="8" rx="1" />
      </>
    ),
    vector: (
      <>
        <circle cx="5" cy="6" r="2" />
        <circle cx="18" cy="5" r="2" />
        <circle cx="12" cy="18" r="2" />
        <path d="m7 6 9-1M6 8l5 8m6-9-4 9" />
      </>
    ),
    question: (
      <>
        <circle cx="11" cy="10" r="7" />
        <path d="m16 15 5 6M9 8a2 2 0 1 1 3 2c-1 0-1 1-1 2m0 2v.1" />
      </>
    ),
    search: (
      <>
        <circle cx="10" cy="10" r="6" />
        <path d="m15 15 6 6M7 10h6M10 7v6" />
      </>
    ),
    merge: (
      <>
        <path d="M4 3v5c0 3 8 3 8 6v7M20 3v5c0 3-8 3-8 6m-4 3 4 4 4-4" />
      </>
    ),
    context: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="m7 8 2 2 3-4M7 15h10M7 18h7" />
      </>
    ),
    spark: (
      <>
        <path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" />
      </>
    ),
    device: (
      <>
        <rect x="3" y="3" width="18" height="13" rx="2" />
        <path d="M8 21h8m-4-5v5" />
      </>
    ),
    server: (
      <>
        <rect x="3" y="3" width="18" height="7" rx="2" />
        <rect x="3" y="14" width="18" height="7" rx="2" />
        <path d="M7 6h.1M7 17h.1M12 6h5m-5 11h5" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.pdf}
    </svg>
  );
}
const content = {
  fr: {
    eyebrow: "L’ARCHITECTURE, SANS BOÎTE NOIRE",
    title: "Du PDF à la réponse.",
    accent: "Chaque calcul a sa place.",
    intro:
      "Une vue d’ensemble pour comprendre. Les formules et les données pour vérifier. Explorez le parcours réel de vos documents, sans raisonnement inventé.",
    back: "Revenir aux documents",
    map: "Le parcours en un regard",
    mapIntro:
      "Sélectionnez une étape pour examiner ses entrées, sa transformation et sa sortie.",
    local: "Dans votre navigateur",
    localNote: "PDF, OCR, passages et vecteurs en session temporaire",
    remote: "Côté serveur",
    remoteNote: "Validation puis inférence NVIDIA",
    boundary: "Après votre accord : question + passages sélectionnés",
    noPdf: "Aucun PDF complet ni vecteur transmis",
    labels: [
      "Lire le PDF",
      "Découper le texte",
      "Encoder les passages",
      "Analyser la question",
      "Chercher deux fois",
      "Fusionner les rangs",
      "Choisir le contexte",
      "Générer & citer",
    ],
    sub: [
      "Texte natif ou OCR FR/EN",
      "Paragraphes → passages",
      "E5 multilingue · 384 dimensions",
      "Unicode, termes et filtre",
      "Cosinus + BM25, en parallèle",
      "RRF · k = 60",
      "Pertinence, ordre et budget",
      "openai/gpt-oss-20b",
    ],
    steps: [
      [
        "Les pages de vos PDF",
        "PDF.js lit le texte. Une page contenant moins de 30 caractères non blancs passe par l’OCR Tesseract français/anglais. Les écarts verticaux aident à retrouver les paragraphes ; les mises en page complexes restent heuristiques.",
        "Texte attribué à un fichier et une page. Les images d’une page déjà textuelle ne sont pas systématiquement OCRisées.",
      ],
      [
        "Le texte extrait page par page",
        "Les paragraphes courts sont regroupés jusqu’à environ 400 tokens. Les longs passages sont séparés aux espaces, ou aux caractères si nécessaire, selon le vrai tokenizer. Aucun passage ne traverse une page.",
        "Passages de 480 tokens maximum, préfixe passage: et tokens spéciaux compris. Aucune troncature silencieuse.",
      ],
      [
        "Chaque passage de texte",
        "Xenova/multilingual-e5-small, révision épinglée, ONNX q8. Le préfixe passage: est ajouté. Les états des tokens sont moyennés avec leur masque, puis le vecteur est normalisé en L2 : u = Σᵢ(mᵢhᵢ) / Σᵢmᵢ ; v = u / √Σⱼuⱼ².",
        "Un vrai vecteur sémantique de 384 coordonnées. Ce modèle encode le sens pour la recherche ; il ne génère pas de réponse.",
      ],
      [
        "Votre question et le périmètre choisi",
        "La forme Unicode NFKC et les espaces sont harmonisés. Pour BM25 : minuscules, accents retirés et mots fréquents FR/EN écartés. Pour E5 : préfixe query: puis encodage et normalisation L2.",
        "Une question normalisée, des termes lexicaux utiles, un vecteur de question et un filtre de fichier observables.",
      ],
      [
        "Le vecteur de question et les termes utiles",
        "Le cosinus compare les vecteurs. BM25 mesure les occurrences et la rareté des termes dans le périmètre filtré. Les deux listes sont triées indépendamment ; les égalités sont départagées par l’identifiant du passage.",
        "Un classement sémantique et un classement lexical. Les échelles des scores sont différentes : elles ne sont pas additionnées.",
      ],
      [
        "Les positions dans les deux listes",
        "Chaque rang admissible contribue 1 / (60 + rang). Seuls les 20 premiers de chaque liste contribuent. Un score BM25 nul ne crée pas de rang lexical.",
        "Un classement fusionné RRF. Un passage peut contribuer par une seule méthode ou par les deux.",
      ],
      [
        "Le classement RRF",
        "Dans cet ordre, chaque passage doit atteindre un cosinus de 0,78, avoir une contribution, entrer dans les quatre premiers admissibles et tenir dans le budget de 1 600 tokens E5.",
        "Les passages réellement proposés au générateur, ou un refus si aucun ne passe. Le seuil est heuristique, pas une garantie de pertinence.",
      ],
      [
        "Votre question et les passages sélectionnés, après consentement",
        "L’API vérifie la forme, les tailles, la langue, le consentement et les références. Elle appelle une seule fois NVIDIA, avec modèle et destination fixes, sans outil, commande, redirection ou nouvel essai automatique.",
        "JSON contrôlé : réponse étayée, partielle ou information absente. Les citations fichier/page proviennent des passages reçus ; le serveur ne peut pas certifier un PDF resté dans votre navigateur.",
      ],
    ],
    input: "ENTRÉE",
    transform: "TRANSFORMATION",
    output: "SORTIE",
    detail: "Au cœur de l’étape",
    math: "Les maths, rendues lisibles.",
    mathIntro:
      "Le calcul est le même que celui du moteur. Utilisez un exemple ou inspectez votre dernière recherche.",
    example: "Exemple pédagogique",
    live: "Votre recherche",
    noLive: "Une recherche dans vos PDF rendra ses calculs disponibles ici.",
    passage: "Passage à examiner",
    vector: "Cosinus",
    lexical: "BM25",
    fusion: "Fusion RRF",
    vectorNote:
      "La proximité de deux directions, pas une probabilité de vérité.",
    lexicalNote:
      "Le poids des mots : fréquence locale, rareté dans le corpus et longueur du passage.",
    fusionNote:
      "Des rangs comparables remplacent les scores bruts incompatibles.",
    vectorDemo:
      "Exemple géométrique à 2 dimensions, distinct de l’encodeur réel à 384 dimensions.",
    vectorLive:
      "Les trois premiers termes sont affichés ; le résultat utilise les 384 coordonnées.",
    norm: "Normalisation L2",
    denseRank: "Rang vectoriel",
    lexicalRank: "Rang lexical",
    noLexical: "Aucun résultat lexical",
    rrfCut: "Un rang au-delà de 20 contribue zéro.",
    rrfNote:
      "Aucun poids caché : une contribution par méthode. Une liste absente apporte zéro.",
    term: "Terme",
    frequency: "tf",
    documents: "df",
    contribution: "Contribution",
    length: "Longueur du passage",
    average: "Longueur moyenne",
    lexicalUnits:
      "Ces longueurs comptent les termes lexicaux filtrés, pas les tokens E5.",
    idf: "La rareté du terme dans le périmètre",
    tf: "Occurrences du terme dans ce passage",
    df: "Passages du périmètre contenant ce terme",
    N: "Nombre de passages dans le périmètre filtré",
    params: "Paramètres réels",
    sum: "Score total",
    rules: "Pourquoi garder ce passage ?",
    rulesIntro:
      "Des décisions déterministes sur des données observables. La génération ne remplace pas ces calculs.",
    ruleTitles: [
      "Un candidat classé",
      "Assez proche",
      "Une place dans le contexte",
      "Un contexte qui tient",
    ],
    ruleDescriptions: [
      "Une contribution parmi les 20 premiers d’au moins un classement.",
      "Cosinus ≥ 0,78. Un seuil heuristique, sans calibration universelle.",
      "Les quatre premiers passages admissibles selon l’ordre RRF.",
      "Somme des tokens des passages retenus ≤ 1 600, mesurée par E5.",
    ],
    refusal:
      "Si aucun passage n’est admissible, le système refuse de construire une réponse sans source.",
    privacy: "Ce qui traverse la frontière",
    privacyLocal:
      "Restent locaux : PDF complets, rendu des pages, texte intégral, index, vecteurs et recherche.",
    privacySent:
      "Sont envoyés après accord : question, langue et 1 à 4 passages avec fichier, page et texte.",
    privacyServer:
      "Restent côté serveur : clé NVIDIA, instructions fixes, validation et contrôle des références. Aucun compteur de demandes de l’application.",
    privacyNote:
      "Les sorties du modèle sont non fiables. Le texte est affiché sans exécuter de HTML, de commande ou d’URL. Les références doivent rester dans les passages fournis.",
    payload: "Format de la requête après consentement",
    technical: "Tous les paramètres de traitement",
    technicalIntro:
      "Des bornes techniques de fichiers, de mémoire et de modèles ; aucun quota ajouté de demandes par minute ou par jour.",
    rows: [
      ["Import", "5 000 000 octets cumulés · 10 PDF · 40 pages"],
      [
        "Extraction",
        "150 000 caractères · OCR à 4 millions de pixels par page",
      ],
      ["Encodage", "E5 q8 · 384 dimensions · moyenne masquée · L2"],
      ["Découpage", "Cible ≈400 tokens · maximum 480 · jusqu’à 200 passages"],
      ["Question", "1 200 caractères · maximum 480 tokens E5, préfixe inclus"],
      ["Recherche", "Cosinus + BM25 (k₁=1,2 ; b=0,75) · 20 rangs par liste"],
      [
        "Fusion et contexte",
        "RRF k=60 · seuil 0,78 · 4 passages · 1 600 tokens E5",
      ],
      [
        "API serveur",
        "JSON ≤24 000 octets · extraits ≤8 000 caractères au total",
      ],
      [
        "NVIDIA",
        "openai/gpt-oss-20b · 1 024 tokens de sortie · réponse ≤128 Kio",
      ],
      [
        "Durées de traitement",
        "Indexation 180 s · recherche 30 s · génération serveur 30 s",
      ],
      [
        "Nombre de demandes",
        "Aucun plafond de requêtes ajouté par l’application",
      ],
    ],
    truth: "Une citation permet de vérifier, pas de croire aveuglément.",
    truthText:
      "Le modèle distingue ce qui est étayé, incomplet ou absent. Une référence valide prouve qu’un passage existe ; elle ne démontre pas automatiquement que chaque affirmation en découle.",
  },
  en: {
    eyebrow: "THE ARCHITECTURE, OPEN TO INSPECTION",
    title: "From PDF to answer.",
    accent: "Every calculation in its place.",
    intro:
      "An overview to understand. Formulas and data to verify. Explore what really happens to your documents, without invented reasoning.",
    back: "Back to documents",
    map: "The complete path",
    mapIntro: "Choose a step to inspect its input, transformation and output.",
    local: "In your browser",
    localNote: "PDFs, OCR, passages and vectors in a temporary session",
    remote: "On the server",
    remoteNote: "Validation, then NVIDIA inference",
    boundary: "After consent: question + selected passages",
    noPdf: "No full PDFs or vectors transmitted",
    labels: [
      "Read the PDF",
      "Split the text",
      "Encode passages",
      "Analyze the question",
      "Search twice",
      "Fuse rankings",
      "Select context",
      "Generate & cite",
    ],
    sub: [
      "Native text or FR/EN OCR",
      "Paragraphs → passages",
      "Multilingual E5 · 384 dimensions",
      "Unicode, terms and scope",
      "Cosine + BM25, in parallel",
      "RRF · k = 60",
      "Relevance, order and budget",
      "openai/gpt-oss-20b",
    ],
    steps: [
      [
        "The pages of your PDFs",
        "PDF.js extracts text. Pages with fewer than 30 non-whitespace characters use French/English Tesseract OCR. Vertical gaps help reconstruct paragraphs; complex layouts remain heuristic.",
        "Text attributed to a file and page. Images on already textual pages are not systematically OCRed.",
      ],
      [
        "Page-by-page extracted text",
        "Short paragraphs are grouped to approximately 400 tokens. Long passages split at spaces, or characters when necessary, using actual token counts. Passages never cross a page.",
        "At most 480 tokens including passage: and special tokens. No silent truncation.",
      ],
      [
        "Each text passage",
        "Pinned Xenova/multilingual-e5-small, ONNX q8. Add passage:, mean-pool token states with the attention mask, then L2-normalize.",
        "An actual 384-dimensional semantic vector. This model encodes for search; it does not generate an answer.",
      ],
      [
        "Your question and chosen scope",
        "Normalize NFKC Unicode and whitespace. For BM25: lowercase, remove accents and common FR/EN words. For E5: add query:, encode and L2-normalize.",
        "Observable normalized question, useful terms, question vector and file filter.",
      ],
      [
        "Question vector and lexical terms",
        "Cosine compares vectors. BM25 scores term occurrence and rarity within the chosen scope. Lists rank independently, with passage ID breaking ties.",
        "Separate semantic and lexical rankings. Raw scores have incompatible scales and are never added.",
      ],
      [
        "Positions in both lists",
        "Each eligible rank contributes 1 / (60 + rank). Only the first 20 of each list contribute. Zero BM25 produces no lexical rank.",
        "An RRF ranking. A passage may contribute through either method or both.",
      ],
      [
        "The RRF ranking",
        "In order, each passage must reach cosine 0.78, have a contribution, fit among the first four eligible passages and stay within the 1,600 E5-token budget.",
        "Actual context passages, or refusal when none qualify. The threshold is heuristic, not a guarantee of relevance.",
      ],
      [
        "Question and selected passages after consent",
        "The API validates shape, size, language, consent and references. One request to a fixed NVIDIA destination/model, with no tools, commands, redirects or automatic retry.",
        "Validated JSON: supported, incomplete or absent. File/page references come from supplied passages; the server cannot certify a PDF that stayed in your browser.",
      ],
    ],
    input: "INPUT",
    transform: "TRANSFORMATION",
    output: "OUTPUT",
    detail: "Inside this step",
    math: "The maths, made readable.",
    mathIntro:
      "The same calculation as the engine. Use an example or inspect your latest search.",
    example: "Educational example",
    live: "Your search",
    noLive: "Search your PDFs to make their calculations available here.",
    passage: "Inspect passage",
    vector: "Cosine",
    lexical: "BM25",
    fusion: "RRF fusion",
    vectorNote: "How close two directions are, not a probability of truth.",
    lexicalNote:
      "Word weights: local frequency, corpus rarity and passage length.",
    fusionNote: "Comparable ranks replace incompatible raw scores.",
    vectorDemo:
      "A 2-dimensional geometric example, separate from the real 384-dimensional encoder.",
    vectorLive: "First three terms shown; the result uses all 384 coordinates.",
    norm: "L2 normalization",
    denseRank: "Vector rank",
    lexicalRank: "Lexical rank",
    noLexical: "No lexical result",
    rrfCut: "Ranks beyond 20 contribute zero.",
    rrfNote:
      "No hidden weight: one contribution per method. An absent list contributes zero.",
    term: "Term",
    frequency: "tf",
    documents: "df",
    contribution: "Contribution",
    length: "Passage length",
    average: "Average length",
    lexicalUnits: "These lengths count filtered lexical terms, not E5 tokens.",
    idf: "Term rarity within the selected scope",
    tf: "Occurrences of this term in the passage",
    df: "Passages containing this term",
    N: "Passages in the selected scope",
    params: "Actual parameters",
    sum: "Total score",
    rules: "Why select this passage?",
    rulesIntro:
      "Deterministic decisions based on observable data. Generation does not replace these calculations.",
    ruleTitles: [
      "A ranked candidate",
      "Close enough",
      "A place in the context",
      "A context that fits",
    ],
    ruleDescriptions: [
      "A contribution in the top 20 of at least one ranking.",
      "Cosine ≥0.78. A heuristic threshold, without universal calibration.",
      "The first four eligible passages in RRF order.",
      "Selected passages total ≤1,600 tokens, counted with E5.",
    ],
    refusal:
      "If no passage is eligible, the system refuses to construct an answer without sources.",
    privacy: "What crosses the boundary",
    privacyLocal:
      "Stay local: full PDFs, page rendering, complete text, index, vectors and retrieval.",
    privacySent:
      "Sent after consent: question, language and 1–4 passages with file, page and text.",
    privacyServer:
      "Stay server-side: NVIDIA key, fixed instructions, validation and reference checks. No application request counter.",
    privacyNote:
      "Model output is untrusted. No generated HTML, command or URL is executed. References must point to supplied passages.",
    payload: "Request shape after consent",
    technical: "Every processing parameter",
    technicalIntro:
      "Technical file, memory and model bounds; no application requests-per-minute or daily quota.",
    rows: [
      ["Import", "5,000,000 combined bytes · 10 PDFs · 40 pages"],
      ["Extraction", "150,000 characters · OCR at 4 million pixels/page"],
      ["Encoding", "E5 q8 · 384 dimensions · masked mean pooling · L2"],
      ["Splitting", "Target ≈400 tokens · max 480 · up to 200 passages"],
      ["Question", "1,200 characters · max 480 E5 tokens, prefix included"],
      ["Retrieval", "Cosine + BM25 (k₁=1.2; b=0.75) · 20 ranks per list"],
      [
        "Fusion and context",
        "RRF k=60 · threshold 0.78 · 4 passages · 1,600 E5 tokens",
      ],
      ["Server API", "JSON ≤24,000 bytes · total excerpts ≤8,000 characters"],
      [
        "NVIDIA",
        "openai/gpt-oss-20b · 1,024 output tokens · response ≤128 KiB",
      ],
      [
        "Processing durations",
        "Index 180s · search 30s · server generation 30s",
      ],
      ["Request counts", "No application request cap"],
    ],
    truth: "A citation is a way to verify.",
    truthText:
      "The model distinguishes supported, incomplete and absent information. A valid reference establishes that a passage exists; it does not automatically prove that every claim follows from it.",
  },
};
function Fraction({ top, bottom }: { top: ReactNode; bottom: ReactNode }) {
  return (
    <span className="arch-fraction">
      <span>{top}</span>
      <span>{bottom}</span>
    </span>
  );
}
const demos = [
  "Les salariés disposent de 25 jours de congés payés. Les congés sont validés par le responsable.",
  "Les congés doivent être demandés avant le départ.",
  "Les frais de repas sont remboursés sur justificatif.",
];
export default function ArchitecturePage({
  lang,
  result,
  onBack,
}: {
  lang: Lang;
  result: SearchResult | null;
  onBack: () => void;
}) {
  const t = content[lang],
    [step, setStep] = useState(0),
    [formula, setFormula] = useState<"rrf" | "cosine" | "bm25">("rrf"),
    [live, setLive] = useState(!!result?.hits.length),
    [pickedId, setPickedId] = useState(result?.hits[0]?.chunk.id || ""),
    [dense, setDense] = useState(2),
    [lexical, setLexical] = useState(1),
    [noLexical, setNoLexical] = useState(false);
  const hit =
      result?.hits.find((h) => h.chunk.id === pickedId) || result?.hits[0],
    isLive = live && !!hit && !!result;
  const denseRank = isLive ? hit.denseRank : dense,
    lexicalRank = isLive ? hit.lexicalRank : noLexical ? null : lexical;
  const contribution = (rank: number | null) =>
    rank && rank <= RETRIEVAL_TOP ? 1 / (RRF_K + rank) : 0;
  const dr = contribution(denseRank),
    lr = contribution(lexicalRank),
    q = isLive ? result.queryVector : [1, 0],
    p = isLive ? hit.chunk.vector : [0.8, 0.6];
  const dot = q.reduce((sum, n, i) => sum + n * p[i], 0),
    qNorm = Math.sqrt(q.reduce((s, n) => s + n * n, 0)),
    pNorm = Math.sqrt(p.reduce((s, n) => s + n * n, 0));
  const docs = isLive
      ? result.hits.map((h) => terms(h.chunk.text))
      : demos.map(terms),
    queryTerms = isLive ? result.terms : terms("congés payés"),
    docIndex = isLive ? result.hits.indexOf(hit) : 0,
    bm = bm25Breakdown(docs, queryTerms, docIndex);
  const payload = {
    question: isLive
      ? result.normalized
      : lang === "fr"
        ? "Combien de jours de congés ?"
        : "How many days of leave?",
    language: lang,
    consent: true,
    passages: isLive
      ? result.context.slice(0, 2).map(({ chunk: c }) => ({
          id: c.id,
          file: c.file,
          page: c.page,
          text: c.text.length > 150 ? c.text.slice(0, 150) + "…" : c.text,
        }))
      : [
          {
            id: "1",
            file: "guide.pdf",
            page: 1,
            text: "Les salariés disposent de 25 jours de congés payés par an.",
          },
        ],
  };
  const icons = [
    "pdf",
    "split",
    "vector",
    "question",
    "search",
    "merge",
    "context",
    "spark",
  ];
  return (
    <div className="architecture-view">
      <section className="arch-hero">
        <button className="arch-back" onClick={onBack}>
          ← {t.back}
        </button>
        <div className="eyebrow">
          <span />
          {t.eyebrow}
        </div>
        <h1>
          {t.title}
          <br />
          <em>{t.accent}</em>
        </h1>
        <p>{t.intro}</p>
        <div className="arch-pills">
          <span>E5 · BM25 · RRF</span>
          <span>
            {lang === "fr" ? "Calculs observables" : "Observable calculations"}
          </span>
          <span>
            {lang === "fr" ? "Données temporaires" : "Temporary data"}
          </span>
        </div>
      </section>
      <section className="arch-section" aria-labelledby="arch-map-title">
        <div className="arch-section-head">
          <div>
            <span className="section-kicker">
              01 · {lang === "fr" ? "LA VUE D’ENSEMBLE" : "THE OVERVIEW"}
            </span>
            <h2 id="arch-map-title">{t.map}</h2>
            <p>{t.mapIntro}</p>
          </div>
          <span className="arch-outline-tag">
            {lang === "fr" ? "Cliquez pour explorer" : "Click to explore"} ↘
          </span>
        </div>
        <div className="arch-map" aria-label={t.map}>
          <div className="arch-browser-lane">
            <div className="arch-lane-title">
              <Glyph name="device" />
              <div>
                <strong>{t.local}</strong>
                <small>{t.localNote}</small>
              </div>
              <span className="arch-local-dot" />
            </div>
            <div className="arch-flow-grid">
              {t.labels.slice(0, 7).map((label, i) => (
                <button
                  key={label}
                  className={"arch-node " + (step === i ? "active" : "")}
                  aria-pressed={step === i}
                  onClick={() => setStep(i)}
                >
                  <span className="arch-node-top">
                    <b>{String(i + 1).padStart(2, "0")}</b>
                    <Glyph name={icons[i]} />
                  </span>
                  <strong>{label}</strong>
                  <small>{t.sub[i]}</small>
                  <span className="arch-node-arrow" aria-hidden="true">
                    →
                  </span>
                </button>
              ))}
            </div>
            <p className="arch-flow-note">
              {lang === "fr"
                ? "La question rejoint l’index. Deux recherches convergent vers le même contexte."
                : "The question joins the index. Two retrieval paths converge on one context."}
            </p>
          </div>
          <div className="arch-server-lane">
            <div className="arch-lane-title">
              <Glyph name="server" />
              <div>
                <strong>{t.remote}</strong>
                <small>{t.remoteNote}</small>
              </div>
            </div>
            <div className="arch-boundary">
              <span aria-hidden="true">→</span>
              <strong>{t.boundary}</strong>
              <small>{t.noPdf}</small>
            </div>
            <button
              className={
                "arch-node server-node " + (step === 7 ? "active" : "")
              }
              aria-pressed={step === 7}
              onClick={() => setStep(7)}
            >
              <span className="arch-node-top">
                <b>08</b>
                <Glyph name="spark" />
              </span>
              <strong>{t.labels[7]}</strong>
              <small>{t.sub[7]}</small>
            </button>
            <div className="arch-return">
              ↩{" "}
              {lang === "fr"
                ? "Réponse et références vers votre navigateur"
                : "Answer and references back to your browser"}
            </div>
          </div>
        </div>
        <div className="arch-step-detail" aria-live="polite">
          <div className="arch-detail-title">
            <span>{String(step + 1).padStart(2, "0")}</span>
            <div>
              <small>{t.detail}</small>
              <h3>{t.labels[step]}</h3>
            </div>
          </div>
          <dl>
            <div>
              <dt>{t.input}</dt>
              <dd>{t.steps[step][0]}</dd>
            </div>
            <div>
              <dt>{t.transform}</dt>
              <dd>{t.steps[step][1]}</dd>
            </div>
            <div>
              <dt>{t.output}</dt>
              <dd>{t.steps[step][2]}</dd>
            </div>
          </dl>
        </div>
      </section>
      <section className="arch-section" aria-labelledby="arch-math-title">
        <div className="arch-section-head">
          <div>
            <span className="section-kicker">
              02 · {lang === "fr" ? "LES CALCULS" : "THE CALCULATIONS"}
            </span>
            <h2 id="arch-math-title">{t.math}</h2>
            <p>{t.mathIntro}</p>
          </div>
        </div>
        <div className="arch-math-panel">
          <div className="arch-math-toolbar">
            <div
              className="arch-formula-tabs"
              role="group"
              aria-label={
                lang === "fr" ? "Formule à inspecter" : "Inspect formula"
              }
            >
              {[
                ["rrf", t.fusion],
                ["cosine", t.vector],
                ["bm25", t.lexical],
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setFormula(id as typeof formula)}
                  aria-pressed={formula === id}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="arch-data-switch">
              <button aria-pressed={!isLive} onClick={() => setLive(false)}>
                {t.example}
              </button>
              <button
                disabled={!result?.hits.length}
                aria-pressed={isLive}
                onClick={() => setLive(true)}
              >
                {t.live}
              </button>
            </div>
          </div>
          {isLive && (
            <label className="arch-passage-select">
              {t.passage}
              <select
                value={hit.chunk.id}
                onChange={(e) => setPickedId(e.target.value)}
              >
                {result.hits.map((h) => (
                  <option key={h.chunk.id} value={h.chunk.id}>
                    {h.chunk.file} · {lang === "fr" ? "page" : "page"}{" "}
                    {h.chunk.page} · #{h.chunk.id}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="arch-equation-heading">
            <span className="arch-outline-tag">
              {isLive ? t.live : t.example}
            </span>
            <p>
              {formula === "rrf"
                ? t.fusionNote
                : formula === "cosine"
                  ? t.vectorNote
                  : t.lexicalNote}
            </p>
          </div>
          {formula === "rrf" ? (
            <>
              <div
                className="arch-equation"
                role="math"
                tabIndex={0}
                aria-label="RRF equals the sum of one divided by k plus rank"
              >
                <span>RRF(p) =</span>
                <span>
                  Σ<sub>m</sub>
                </span>
                <Fraction top="1" bottom="60 + rangₘ(p)" />
              </div>
              <div className="arch-formula-columns">
                <div className="arch-controls">
                  {[
                    [t.denseRank, denseRank],
                    [t.lexicalRank, lexicalRank],
                  ].map(([label, value], i) => (
                    <label key={String(label)}>
                      {label}
                      <output>{value ?? "—"}</output>
                      {!isLive && (
                        <input
                          type="range"
                          min="1"
                          max="25"
                          value={Number(value) || 1}
                          disabled={i === 1 && noLexical}
                          aria-label={String(label)}
                          onChange={(e) =>
                            i === 0
                              ? setDense(Number(e.target.value))
                              : setLexical(Number(e.target.value))
                          }
                        />
                      )}
                    </label>
                  ))}
                  {!isLive && (
                    <label className="arch-checkbox">
                      <input
                        type="checkbox"
                        checked={noLexical}
                        onChange={(e) => setNoLexical(e.target.checked)}
                      />
                      {t.noLexical}
                    </label>
                  )}
                  <p>{t.rrfCut}</p>
                </div>
                <div className="arch-calculation">
                  <span className="section-kicker">
                    {lang === "fr"
                      ? "CALCUL DÉVELOPPÉ"
                      : "EXPANDED CALCULATION"}
                  </span>
                  <div className="arch-expanded">
                    <span>{dr ? `1 / (60 + ${denseRank})` : "0"}</span>
                    <b>+</b>
                    <span>{lr ? `1 / (60 + ${lexicalRank})` : "0"}</span>
                  </div>
                  <p>
                    {dr.toFixed(6)} + {lr.toFixed(6)}
                  </p>
                  <div className="arch-total">
                    <span>{t.sum}</span>
                    <strong>{(dr + lr).toFixed(6)}</strong>
                  </div>
                </div>
              </div>
              <p className="arch-footnote">{t.rrfNote}</p>
            </>
          ) : formula === "cosine" ? (
            <>
              <div
                className="arch-equation"
                role="math"
                tabIndex={0}
                aria-label="Cosine equals dot product divided by vector norms"
              >
                <span>cos(q,p) =</span>
                <Fraction top="Σᵢ qᵢ pᵢ" bottom="√Σᵢqᵢ² × √Σᵢpᵢ²" />
              </div>
              <div className="arch-formula-columns">
                <div className="arch-vector-display">
                  <code>
                    q = [
                    {q
                      .slice(0, 3)
                      .map((n) => n.toFixed(4))
                      .join(", ")}
                    {q.length > 3 ? ", …" : ""}]
                  </code>
                  <code>
                    p = [
                    {p
                      .slice(0, 3)
                      .map((n) => n.toFixed(4))
                      .join(", ")}
                    {p.length > 3 ? ", …" : ""}]
                  </code>
                  <p>{isLive ? t.vectorLive : t.vectorDemo}</p>
                  <dl>
                    <dt>{t.norm} · q</dt>
                    <dd>{qNorm.toFixed(6)}</dd>
                    <dt>{t.norm} · p</dt>
                    <dd>{pNorm.toFixed(6)}</dd>
                  </dl>
                </div>
                <div className="arch-calculation">
                  <span className="section-kicker">
                    {lang === "fr" ? "PRODUIT SCALAIRE" : "DOT PRODUCT"}
                  </span>
                  <code>
                    {q
                      .slice(0, 3)
                      .map((n, i) => `(${n.toFixed(4)} × ${p[i].toFixed(4)})`)
                      .join(" + ")}
                    {q.length > 3 ? " + …" : ""}
                  </code>
                  <div className="arch-total">
                    <span>{t.vector}</span>
                    <strong>{(dot / (qNorm * pNorm || 1)).toFixed(6)}</strong>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div
                className="arch-equation bm25-equation"
                role="math"
                tabIndex={0}
                aria-label="BM25 sum over terms of inverse document frequency times normalized term frequency"
              >
                <span>
                  BM25(q,p) = Σ<sub>t∈q</sub> IDF(t) ×
                </span>
                <Fraction
                  top="tf(t,p) × (k₁ + 1)"
                  bottom="tf(t,p) + k₁(1 − b + b × |p| / avgdl)"
                />
              </div>
              <div className="arch-idf">
                <span>IDF(t) = ln(1 +</span>
                <Fraction top="N − df(t) + 0,5" bottom="df(t) + 0,5" />
                <span>)</span>
              </div>
              <div className="arch-variable-row">
                <span>
                  N <b>{bm.N}</b>
                </span>
                <span>
                  |p| <b>{bm.length}</b>
                </span>
                <span>
                  avgdl <b>{bm.averageLength.toFixed(3)}</b>
                </span>
                <span>
                  k₁ <b>{BM25_K1}</b>
                </span>
                <span>
                  b <b>{BM25_B}</b>
                </span>
              </div>
              <div
                className="arch-term-table"
                role="region"
                tabIndex={0}
                aria-label="BM25"
              >
                <table>
                  <caption>
                    {isLive ? result.normalized : "congés payés"}
                  </caption>
                  <thead>
                    <tr>
                      <th>{t.term}</th>
                      <th>tf</th>
                      <th>df</th>
                      <th>IDF</th>
                      <th>{t.contribution}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bm.entries.map((e) => (
                      <tr key={e.term}>
                        <td>{e.term}</td>
                        <td>{e.tf}</td>
                        <td>{e.df}</td>
                        <td>{e.idf.toFixed(4)}</td>
                        <td>{e.contribution.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="arch-total">
                <span>{t.sum}</span>
                <strong>{bm.score.toFixed(6)}</strong>
              </div>
              <p className="arch-footnote">{t.lexicalUnits}</p>
              <dl className="arch-legend">
                <div>
                  <dt>tf</dt>
                  <dd>{t.tf}</dd>
                </div>
                <div>
                  <dt>df</dt>
                  <dd>{t.df}</dd>
                </div>
                <div>
                  <dt>IDF</dt>
                  <dd>{t.idf}</dd>
                </div>
                <div>
                  <dt>N</dt>
                  <dd>{t.N}</dd>
                </div>
              </dl>
            </>
          )}
          {!result?.hits.length && <p className="arch-no-live">{t.noLive}</p>}
        </div>
      </section>
      <section className="arch-section" aria-labelledby="arch-rules-title">
        <div className="arch-section-head">
          <div>
            <span className="section-kicker">
              03 · {lang === "fr" ? "LES RÈGLES" : "THE RULES"}
            </span>
            <h2 id="arch-rules-title">{t.rules}</h2>
            <p>{t.rulesIntro}</p>
          </div>
        </div>
        <div className="arch-rule-grid">
          {t.ruleTitles.map((title, i) => (
            <article key={title}>
              <span>
                {
                  [
                    "TOP 20",
                    "≥ " + MIN_COSINE,
                    "≤ " + CONTEXT_PASSAGES,
                    "≤ " + CONTEXT_TOKENS,
                  ][i]
                }
              </span>
              <h3>{title}</h3>
              <p>{t.ruleDescriptions[i]}</p>
            </article>
          ))}
        </div>
        <div className="arch-refusal">↳ {t.refusal}</div>
        <details className="arch-technical">
          <summary>
            {t.technical}
            <span>＋</span>
          </summary>
          <p>{t.technicalIntro}</p>
          <dl>
            {t.rows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </details>
      </section>
      <section
        className="arch-section arch-privacy"
        aria-labelledby="arch-privacy-title"
      >
        <div className="arch-section-head">
          <div>
            <span className="section-kicker">
              04 · {lang === "fr" ? "LES DONNÉES" : "THE DATA"}
            </span>
            <h2 id="arch-privacy-title">{t.privacy}</h2>
          </div>
        </div>
        <div className="arch-privacy-grid">
          <div className="arch-privacy-copy">
            <p>
              <span>01</span>
              {t.privacyLocal}
            </p>
            <p>
              <span>02</span>
              {t.privacySent}
            </p>
            <p>
              <span>03</span>
              {t.privacyServer}
            </p>
            <small>{t.privacyNote}</small>
          </div>
          <div className="arch-payload">
            <div>
              <span>{t.payload}</span>
              <span className="arch-outline-tag">
                {isLive ? t.live : t.example}
              </span>
            </div>
            <pre tabIndex={0}>{JSON.stringify(payload, null, 2)}</pre>
            <small>
              {lang === "fr"
                ? "Aperçu abrégé : les passages sélectionnés sont envoyés dans leur intégralité, dans les bornes du contrat."
                : "Abbreviated preview: selected passages are sent in full within the API contract bounds."}
            </small>
          </div>
        </div>
      </section>
      <section className="arch-closing">
        <Glyph name="context" />
        <h2>{t.truth}</h2>
        <p>{t.truthText}</p>
        <button className="primary" onClick={onBack}>
          {t.back} →
        </button>
      </section>
    </div>
  );
}
