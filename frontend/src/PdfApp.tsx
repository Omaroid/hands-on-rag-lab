import { useEffect, useRef, useState } from "react";
import { validateFiles } from "./pdf-limits";
import {
  normalize,
  retrieve,
  type Passage,
  type Hit,
  type PageText,
} from "./pdf-retrieval";
import "./pdf.css";
const labels = {
  fr: {
    title: "Vos documents.",
    accent: "Des réponses vérifiables.",
    intro:
      "Déposez vos PDF. Explorez comment une question retrouve les bons passages, puis remonte à ses sources.",
    local: "Votre espace temporaire",
    privacy:
      "Vos PDF restent sur cet appareil. Aucun document ni vecteur conservé par notre serveur.",
    journey: "DU PDF À LA RÉPONSE",
    steps: [
      "Lire & extraire",
      "Découper",
      "Encoder",
      "Analyser la question",
      "Rechercher",
      "Fusionner",
      "Sélectionner",
      "Répondre & citer",
    ],
    desc: [
      "PDF texte ou OCR français/anglais. Chaque page garde son origine.",
      "Paragraphes et titres préservés quand possible. Longs passages séparés selon le vrai nombre de tokens.",
      "Encodeur sémantique multilingue E5. Pooling moyen, normalisation L2, préfixes query: / passage:. Aucun modèle génératif local.",
      "Unicode et espaces normalisés. Termes utiles et filtre de fichier observables. Aucune chaîne de pensée inventée.",
      "Deux classements indépendants : cosinus sémantique et correspondance lexicale BM25.",
      "RRF additionne 1/(60 + rang) sur les 20 premiers de chaque liste, sans additionner des scores incompatibles.",
      "Au plus 4 passages, cosinus ≥ 0,78, budget de 1 600 tokens. Ce seuil heuristique ne garantit pas la pertinence.",
      "Extraits avec fichier, page et passage consultable. Génération NVIDIA uniquement après consentement et ouverture des protections serveur.",
    ],
    source: "01 — VOS SOURCES",
    drop: "Déposez vos PDF ici",
    choose: "Choisir des fichiers",
    limits: "5 Mo au total · 10 fichiers · 40 pages maximum",
    model:
      "L’indexation télécharge un encodeur de recherche (~118 Mo + tokenizer) depuis Hugging Face. Les PDF et questions n’y sont pas envoyés. OCR local FR/EN si nécessaire.",
    index: "Lire et indexer les PDF",
    reset: "Supprimer et réinitialiser",
    stop: "Arrêter",
    idle: "En attente de documents",
    loading: "Téléchargement de l’encodeur",
    reading: "Lecture",
    encoding: "Encodage",
    ready: "Index prêt",
    ask: "02 — VOTRE QUESTION",
    question: "Votre question sur les documents",
    placeholder: "Que disent ces documents à propos de… ?",
    scope: "Périmètre",
    all: "Tous les fichiers",
    search: "Explorer les preuves",
    noDocs: "Importez vos documents pour commencer.",
    answer: "03 — CE QUE LES SOURCES CONTIENNENT",
    found: "Passages retrouvés · réponse à vérifier",
    absent: "Preuves insuffisantes",
    refusal:
      "Aucun passage ne franchit les critères de sélection. Les documents ne permettent pas de répondre avec suffisamment de confiance. Reformulez ou changez le périmètre.",
    extract:
      "Extraits sources, sans synthèse générée. Leur présence ne prouve pas qu’ils répondent entièrement à la question.",
    coverage:
      "Couverture non évaluée : ces passages peuvent être incomplets. Vérifiez leur portée dans les pages originales.",
    ai: "Synthèse NVIDIA",
    unavailable:
      "Génération indisponible : la protection globale des quotas gratuits n’est pas raccordée. Aucun extrait ni question n’est transmis.",
    consent:
      "J’accepte l’envoi de ma question et des passages sélectionnés à NVIDIA pour cette réponse.",
    generate: "Générer une réponse sourcée",
    engine: "04 — LE MOTEUR, EN TOUTE TRANSPARENCE",
    normalized: "Question normalisée",
    terms: "Termes utiles",
    note: "Les scores cosinus et BM25 ont des échelles différentes. Les rangs sont fusionnés ; aucun score n’est une probabilité de vérité.",
    file: "Fichier",
    page: "page",
    passages: "passages",
    pages: "pages",
    selected: "Retenu",
    excluded: "Écarté",
    read: "Lire le passage",
    close: "Fermer",
    sourcePassage: "Passage source",
    shared: "Termes communs",
    why: "Seuil atteint, dans les 4 premiers admissibles et le budget de contexte.",
    whyNot:
      "Hors seuil, hors des 4 premiers admissibles ou budget de contexte atteint.",
    footer: "Explorez. Comprenez. Vérifiez.",
    stopMessage: "Traitement arrêté. Aucun index partiel conservé.",
    timeout: "Temps limite atteint. Le traitement a été arrêté.",
    errors: {
      token_limit:
        "Question trop longue : dépassement des 480 tokens de l’encodeur.",
      size: "La sélection dépasse 5 Mo au total.",
      format:
        "Sélectionnez des PDF valides, non vides, avec des noms distincts.",
      file_count: "Sélectionnez de 1 à 10 PDF.",
      pages: "La sélection dépasse 40 pages.",
      text: "Le texte extrait dépasse 150 000 caractères.",
      chunk_limit: "La sélection dépasse 200 passages.",
      password:
        "PDF protégé par mot de passe : importez une copie déverrouillée.",
      empty: "Aucun texte exploitable trouvé, même après OCR.",
      default:
        "Impossible de traiter le PDF ou de charger l’encodeur. Vérifiez le fichier et votre connexion.",
    },
  },
  en: {
    title: "Your documents.",
    accent: "Answers you can verify.",
    intro:
      "Drop your PDFs. Explore how a question finds the right passages, then trace every excerpt to its source.",
    local: "Your temporary workspace",
    privacy:
      "Your PDFs stay on this device. Our server stores no documents or vectors.",
    journey: "FROM PDF TO ANSWER",
    steps: [
      "Read & extract",
      "Split passages",
      "Encode",
      "Analyze the question",
      "Search",
      "Fuse rankings",
      "Select context",
      "Answer & cite",
    ],
    desc: [
      "Text PDFs or French/English OCR. Every page keeps its origin.",
      "Paragraphs and headings preserved where possible. Long passages split using actual token counts.",
      "Multilingual E5 semantic encoder. Mean pooling, L2 normalization, query: / passage: prefixes. No local generative model.",
      "Observable Unicode and whitespace normalization, useful terms and file filter. No fabricated chain of thought.",
      "Two independent rankings: semantic cosine similarity and lexical BM25 matching.",
      "RRF adds 1/(60 + rank) across the top 20 in each list. Incompatible raw scores are never added.",
      "At most 4 passages, cosine ≥ 0.78, and a 1,600-token budget. This heuristic threshold does not guarantee relevance.",
      "Read excerpts with file and page references. NVIDIA generation requires consent and active server protections.",
    ],
    source: "01 — YOUR SOURCES",
    drop: "Drop your PDFs here",
    choose: "Choose files",
    limits: "5 MB combined · 10 files · 40 pages maximum",
    model:
      "Indexing downloads a search encoder (~118 MB + tokenizer) from Hugging Face. No PDFs or questions are sent there. Local FR/EN OCR when needed.",
    index: "Read and index PDFs",
    reset: "Delete and reset",
    stop: "Stop",
    idle: "Waiting for documents",
    loading: "Downloading encoder",
    reading: "Reading",
    encoding: "Encoding",
    ready: "Index ready",
    ask: "02 — YOUR QUESTION",
    question: "Your question about the documents",
    placeholder: "What do these documents say about…?",
    scope: "Scope",
    all: "All files",
    search: "Explore the evidence",
    noDocs: "Import your documents to start.",
    answer: "03 — WHAT THE SOURCES CONTAIN",
    found: "Retrieved passages · verify the answer",
    absent: "Insufficient evidence",
    refusal:
      "No passage meets the selection criteria. The documents do not support a sufficiently confident answer. Rephrase or change the scope.",
    extract:
      "Source excerpts, without a generated synthesis. Their presence does not establish that they fully answer the question.",
    coverage:
      "Coverage not assessed: these passages may be incomplete. Check their scope in the original pages.",
    ai: "NVIDIA synthesis",
    unavailable:
      "Generation unavailable: the global free quota protection is not connected. No excerpts or questions are transmitted.",
    consent:
      "I agree to send my question and selected passages to NVIDIA for this answer.",
    generate: "Generate a cited answer",
    engine: "04 — INSIDE THE SEARCH ENGINE",
    normalized: "Normalized question",
    terms: "Useful terms",
    note: "Cosine and BM25 scores have different scales. Rankings are fused; no score is a probability of truth.",
    file: "File",
    page: "page",
    passages: "passages",
    pages: "pages",
    selected: "Selected",
    excluded: "Excluded",
    read: "Read passage",
    close: "Close",
    sourcePassage: "Source passage",
    shared: "Shared terms",
    why: "Meets the threshold, among the first 4 eligible passages and within the context budget.",
    whyNot:
      "Below threshold, outside the first 4 eligible passages, or context budget reached.",
    footer: "Explore. Understand. Verify.",
    stopMessage: "Processing stopped. No partial index retained.",
    timeout: "Time limit reached. Processing stopped.",
    errors: {
      token_limit: "Question too long: exceeds the encoder’s 480-token limit.",
      size: "The selection exceeds 5 MB combined.",
      format: "Choose valid, non-empty PDFs with distinct names.",
      file_count: "Select between 1 and 10 PDFs.",
      pages: "The selection exceeds 40 pages.",
      text: "Extracted text exceeds 150,000 characters.",
      chunk_limit: "The selection exceeds 200 passages.",
      password: "Password-protected PDF: import an unlocked copy.",
      empty: "No usable text found, including after OCR.",
      default:
        "Could not process the PDF or load the encoder. Check your file and connection.",
    },
  },
};
export default function PdfApp() {
  const [lang, setLang] = useState<"fr" | "en">("fr"),
    [files, setFiles] = useState<File[]>([]),
    [chunks, setChunks] = useState<Passage[]>([]),
    [pages, setPages] = useState<PageText[]>([]),
    [busy, setBusy] = useState(false),
    [queryBusy, setQueryBusy] = useState(false),
    [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [step, setStep] = useState(0),
    [question, setQuestion] = useState(""),
    [filter, setFilter] = useState(""),
    [result, setResult] = useState<ReturnType<typeof retrieve> | null>(null),
    [picked, setPicked] = useState<Hit | null>(null),
    [consent, setConsent] = useState(false),
    [drag, setDrag] = useState(false);
  const t = labels[lang],
    worker = useRef<Worker | null>(null),
    controller = useRef<AbortController | null>(null),
    generation = useRef(0),
    input = useRef<HTMLInputElement>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    dialog = useRef<HTMLDialogElement>(null);
  function clean() {
    controller.current?.abort();
    worker.current?.terminate();
    worker.current = null;
    if (timer.current) clearTimeout(timer.current);
  }
  useEffect(() => () => clean(), []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  function reset() {
    generation.current++;
    clean();
    setBusy(false);
    setQueryBusy(false);
    setFiles([]);
    setChunks([]);
    setPages([]);
    setResult(null);
    setPicked(null);
    dialog.current?.close();
    setQuestion("");
    setFilter("");
    setConsent(false);
    setStatus("");
    setError("");
    if (input.current) input.current.value = "";
  }
  function select(next: File[]) {
    if (busy || queryBusy) return;
    try {
      validateFiles(next);
      if (new Set(next.map((f) => f.name)).size !== next.length)
        throw Error("format");
      reset();
      setFiles(next);
    } catch (e) {
      setError(
        t.errors[
          (e instanceof Error ? e.message : "default") as keyof typeof t.errors
        ] || t.errors.default,
      );
    }
    if (input.current) input.current.value = "";
  }
  function stop() {
    generation.current++;
    clean();
    setBusy(false);
    setQueryBusy(false);
    setChunks([]);
    setPages([]);
    setResult(null);
    setStatus(t.stopMessage);
  }
  async function index() {
    const id = ++generation.current;
    clean();
    setError("");
    setResult(null);
    setChunks([]);
    setPages([]);
    setBusy(true);
    setStep(0);
    const c = new AbortController();
    controller.current = c;
    timer.current = setTimeout(() => {
      if (generation.current === id) {
        stop();
        setError(t.timeout);
      }
    }, 180000);
    try {
      const { readPDFs } = await import("./pdf-import");
      const extracted = await readPDFs(files, c.signal, (p) => {
        if (generation.current === id)
          setStatus(
            `${p.kind === "ocr" ? "OCR" : t.reading} · ${p.file} · ${p.page}/${p.total}${p.progress !== undefined ? " · " + Math.round(p.progress * 100) + "%" : ""}`,
          );
      });
      if (generation.current !== id) return;
      setPages(extracted);
      setStep(1);
      setStatus(t.loading);
      const w = new Worker(new URL("./semantic.worker.ts", import.meta.url), {
        type: "module",
      });
      worker.current = w;
      const fail = (code?: string) => {
        if (generation.current !== id) return;
        clean();
        setChunks([]);
        setPages([]);
        setBusy(false);
        setQueryBusy(false);
        setStatus("");
        setError(t.errors[code as keyof typeof t.errors] || t.errors.default);
      };
      w.onerror = () => fail();
      w.onmessage = (e) => {
        if (generation.current !== id) return;
        const d = e.data;
        if (d.type === "download" && d.detail.status === "progress")
          setStatus(
            `${t.loading} · ${d.detail.file} · ${Math.round(d.detail.progress || 0)}%`,
          );
        if (d.type === "encoded") {
          setStep(2);
          setStatus(`${t.encoding} · ${d.done}/${d.total}`);
        }
        if (d.type === "index") {
          if (timer.current) clearTimeout(timer.current);
          setChunks(d.chunks);
          setBusy(false);
          setStep(3);
          setStatus(t.ready);
        }
        if (d.type === "error") fail(d.code);
      };
      w.postMessage({ type: "index", pages: extracted });
    } catch (e) {
      if (generation.current !== id) return;
      clean();
      setBusy(false);
      setPages([]);
      setStatus("");
      setError(
        t.errors[
          (e instanceof Error ? e.message : "default") as keyof typeof t.errors
        ] || t.errors.default,
      );
    }
  }
  function search() {
    if (!worker.current || queryBusy || !chunks.length) return;
    const w = worker.current,
      id = generation.current,
      q = normalize(question),
      scope = filter;
    setQueryBusy(true);
    setError("");
    setResult(null);
    setStep(4);
    timer.current = setTimeout(() => {
      if (generation.current === id) {
        stop();
        setError(t.timeout);
      }
    }, 30000);
    w.onmessage = (e) => {
      if (generation.current !== id) return;
      if (timer.current) clearTimeout(timer.current);
      setQueryBusy(false);
      if (e.data.type === "query") {
        setResult(retrieve(chunks, q, e.data.vector, scope));
        setStep(7);
      } else
        setError(
          t.errors[e.data.code as keyof typeof t.errors] || t.errors.default,
        );
    };
    w.postMessage({ type: "query", question: q });
  }
  function show(hit: Hit) {
    setPicked(hit);
    dialog.current?.showModal();
  }
  const total = files.reduce((s, f) => s + f.size, 0);
  return (
    <div className="pdf-app">
      <a className="skip-link" href="#content">
        {lang === "fr" ? "Aller au contenu" : "Skip to content"}
      </a>
      <header className="topbar">
        <a className="pdf-brand" href="#">
          <span className="brand-symbol">≋</span>Source
          <span className="brand-dot">.</span>
        </a>
        <span className="top-note">
          <span className="green-dot" />
          {t.local}
        </span>
        <div className="language" aria-label="Language">
          <button onClick={() => setLang("fr")} aria-pressed={lang === "fr"}>
            FR
          </button>
          <button onClick={() => setLang("en")} aria-pressed={lang === "en"}>
            EN
          </button>
        </div>
      </header>
      <main id="content">
        <section className="hero">
          <div className="eyebrow">
            <span />
            {lang === "fr" ? "LE RAG, À LIVRE OUVERT" : "RAG, AN OPEN BOOK"}
          </div>
          <h1>
            {t.title}
            <br />
            <em>{t.accent}</em>
          </h1>
          <p>{t.intro}</p>
          <div className="privacy">◈ {t.privacy}</div>
        </section>
        <div className="app-layout">
          <aside className="learning">
            <h2 className="section-kicker">{t.journey}</h2>
            <ol>
              {t.steps.map((s, i) => (
                <li key={s}>
                  <button
                    className={step === i ? "current" : ""}
                    aria-pressed={step === i}
                    onClick={() => setStep(i)}
                  >
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    {s}
                  </button>
                </li>
              ))}
            </ol>
            <div className="step-note">
              <strong>{t.steps[step]}</strong>
              <p>{t.desc[step]}</p>
            </div>
          </aside>
          <div className="panels">
            <section className="panel">
              <div className="panel-heading">
                <h2>{t.source}</h2>
                <span className="chip">PDF · FR / EN</span>
              </div>
              <div
                className={"dropzone " + (drag ? "drag" : "")}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  select(Array.from(e.dataTransfer.files));
                }}
              >
                <div className="upload-icon" aria-hidden="true">
                  ↑
                </div>
                <h3>{t.drop}</h3>
                <p>{t.limits}</p>
                <button
                  className="secondary"
                  disabled={busy || queryBusy}
                  onClick={() => input.current?.click()}
                >
                  {t.choose} ＋
                </button>
                <input
                  ref={input}
                  id="pdf-files"
                  aria-hidden="true"
                  className="visually-hidden"
                  tabIndex={-1}
                  type="file"
                  aria-label={t.choose}
                  accept="application/pdf,.pdf"
                  multiple
                  onChange={(e) => select(Array.from(e.target.files || []))}
                />
              </div>
              {files.length > 0 && (
                <>
                  <ul className="file-list">
                    {files.map((f) => (
                      <li key={f.name}>
                        <span className="file-icon">PDF</span>
                        <span>{f.name}</span>
                        <small>{(f.size / 1000).toFixed(1)} kB</small>
                      </li>
                    ))}
                  </ul>
                  <div className="size-meter">
                    <span>{(total / 1_000_000).toFixed(2)} / 5 MB</span>
                    <span>{files.length} PDF</span>
                  </div>
                  <meter
                    min={0}
                    max={5_000_000}
                    value={total}
                    aria-label="PDF bytes"
                  />
                  <p className="muted">
                    {lang === "fr"
                      ? "Une nouvelle sélection remplace la précédente."
                      : "A new selection replaces the previous one."}
                  </p>
                </>
              )}
              <p className="model-notice">{t.model}</p>
              <div className="actions">
                <button
                  className="primary"
                  onClick={() => void index()}
                  disabled={!files.length || busy || queryBusy}
                >
                  {t.index} →
                </button>
                {busy || queryBusy ? (
                  <button className="danger" onClick={stop}>
                    {t.stop}
                  </button>
                ) : (
                  files.length > 0 && (
                    <button className="text-button" onClick={reset}>
                      {t.reset}
                    </button>
                  )
                )}
              </div>
              <div className="processing" role="status" aria-live="polite">
                <span className={busy || queryBusy ? "pulse" : "green-dot"} />
                {status || t.idle}
                {chunks.length > 0 && (
                  <span>
                    {pages.length} {t.pages} · {chunks.length} {t.passages}
                  </span>
                )}
              </div>
            </section>
            {chunks.length > 0 && (
              <section className="panel transformations">
                <h2>
                  {lang === "fr"
                    ? "LES TRANSFORMATIONS RÉELLES"
                    : "THE ACTUAL TRANSFORMATIONS"}
                </h2>
                <details>
                  <summary>
                    {lang === "fr"
                      ? "Texte extrait, page par page"
                      : "Extracted text, page by page"}{" "}
                    · {pages.length}
                  </summary>
                  {pages.map((p, i) => (
                    <article key={i}>
                      <h3>
                        {p.file} · {t.page} {p.page} ·{" "}
                        {p.ocr
                          ? "OCR"
                          : lang === "fr"
                            ? "texte natif"
                            : "native text"}
                      </h3>
                      <pre tabIndex={0}>{p.text}</pre>
                    </article>
                  ))}
                </details>
                <details>
                  <summary>
                    {lang === "fr"
                      ? "Passages et encodages"
                      : "Passages and embeddings"}{" "}
                    · {chunks.length}
                  </summary>
                  <p>
                    {lang === "fr"
                      ? "Vecteurs réels, 384 dimensions, norme L2 ≈ 1. Les 6 premières coordonnées sont affichées."
                      : "Actual 384-dimensional vectors, L2 norm ≈ 1. First 6 coordinates shown."}
                  </p>
                  {chunks.map((c) => (
                    <article key={c.id}>
                      <h3>
                        #{c.id} · {c.file} · {t.page} {c.page} · {c.tokens}/480
                        tokens
                      </h3>
                      <pre tabIndex={0}>{c.text}</pre>
                      <code>
                        {c.vector
                          .slice(0, 6)
                          .map((x) => x.toFixed(4))
                          .join(", ")}
                        …
                      </code>
                    </article>
                  ))}
                </details>
              </section>
            )}
            {error && (
              <div className="error-message" role="alert">
                {error}
              </div>
            )}
            <section className="panel">
              <div className="panel-heading">
                <h2>{t.ask}</h2>
                <span className="chip">BM25 + E5 + RRF</span>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  search();
                }}
              >
                <label htmlFor="pdf-question">{t.question}</label>
                <textarea
                  id="pdf-question"
                  placeholder={t.placeholder}
                  value={question}
                  maxLength={1200}
                  minLength={3}
                  required
                  disabled={!chunks.length || busy || queryBusy}
                  onChange={(e) => {
                    setQuestion(e.target.value);
                    setResult(null);
                  }}
                />
                <div className="question-actions">
                  <label className="scope">
                    {t.scope}
                    <select
                      disabled={!chunks.length || queryBusy}
                      value={filter}
                      onChange={(e) => {
                        setFilter(e.target.value);
                        setResult(null);
                      }}
                    >
                      <option value="">{t.all}</option>
                      {files.map((f) => (
                        <option key={f.name}>{f.name}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="primary"
                    type="submit"
                    disabled={
                      !chunks.length || question.trim().length < 3 || queryBusy
                    }
                  >
                    {queryBusy ? "…" : t.search} ↗
                  </button>
                </div>
                {!chunks.length && <p className="muted">{t.noDocs}</p>}
              </form>
            </section>
            {result && (
              <>
                <section className="panel answer-panel">
                  <h2>{t.answer}</h2>
                  <h3>{result.context.length ? t.found : t.absent}</h3>
                  <p>{result.context.length ? t.extract : t.refusal}</p>
                  <div className="citations">
                    {result.context.map((h, i) => (
                      <button key={h.chunk.id} onClick={() => show(h)}>
                        <span className="citation-id">{i + 1}</span>
                        <span>
                          <strong>
                            {h.chunk.file} · {t.page} {h.chunk.page}
                          </strong>
                          <q>
                            {h.chunk.text.slice(0, 360)}
                            {h.chunk.text.length > 360 ? "…" : ""}
                          </q>
                          <small>{t.read} ↗</small>
                        </span>
                      </button>
                    ))}
                  </div>
                  {result.context.length > 0 && (
                    <p className="coverage">{t.coverage}</p>
                  )}
                  <div className="nvidia">
                    <h3>
                      {t.ai}
                      <span className="chip">openai/gpt-oss-20b</span>
                    </h3>
                    <p>{t.unavailable}</p>
                    <label className="consent">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                      />
                      {t.consent}
                    </label>
                    <button className="primary" disabled>
                      {t.generate}
                    </button>
                  </div>
                </section>
                <section className="panel inspector">
                  <h2>{t.engine}</h2>
                  <div className="analysis-grid">
                    <div>
                      <span className="section-kicker">{t.normalized}</span>
                      <p>{result.normalized}</p>
                    </div>
                    <div>
                      <span className="section-kicker">{t.terms}</span>
                      <p>{result.terms.join(" · ") || "—"}</p>
                    </div>
                  </div>
                  <p className="score-note">{t.note}</p>
                  <div
                    className="table-scroll"
                    tabIndex={0}
                    role="region"
                    aria-label="Retrieval"
                  >
                    <table>
                      <caption>
                        {lang === "fr"
                          ? "Classements et contributions par passage"
                          : "Rankings and contributions per passage"}
                      </caption>
                      <thead>
                        <tr>
                          <th>{t.file}</th>
                          <th>
                            {lang === "fr" ? "Cosinus" : "Cosine"}
                            <small>
                              {lang === "fr" ? "Rang" : "Rank"} · 1/(60+r)
                            </small>
                          </th>
                          <th>
                            BM25
                            <small>
                              {lang === "fr" ? "Rang" : "Rank"} · 1/(60+r)
                            </small>
                          </th>
                          <th>RRF</th>
                          <th>{lang === "fr" ? "Contexte" : "Context"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.hits.map((h) => (
                          <tr key={h.chunk.id}>
                            <td>
                              <button onClick={() => show(h)}>
                                {h.chunk.file}
                                <small>
                                  {t.page} {h.chunk.page} · #{h.chunk.id} ·{" "}
                                  {h.chunk.tokens} tokens
                                </small>
                              </button>
                            </td>
                            <td>
                              {h.cosine.toFixed(4)}
                              <small>
                                #{h.denseRank} · {h.denseRRF.toFixed(5)}
                              </small>
                            </td>
                            <td>
                              {h.bm25.toFixed(4)}
                              <small>
                                {h.lexicalRank ? "#" + h.lexicalRank : "—"} ·{" "}
                                {h.lexicalRRF.toFixed(5)}
                              </small>
                            </td>
                            <td>{h.rrf.toFixed(5)}</td>
                            <td>
                              <span
                                className={
                                  h.selected ? "selection yes" : "selection"
                                }
                              >
                                {h.selected ? t.selected : t.excluded}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="context-budget">
                    {result.context.length}/4 {t.passages} · {result.budget}
                    /1600 tokens
                  </p>
                </section>
              </>
            )}
          </div>
        </div>
        <footer>
          <span className="pdf-brand">Source.</span>
          <span>{t.footer}</span>
          <span>RAG · PDF</span>
        </footer>
      </main>
      <dialog ref={dialog} onCancel={() => setPicked(null)}>
        <div className="dialog-heading">
          <h2>{t.sourcePassage}</h2>
          <button
            onClick={() => {
              dialog.current?.close();
              setPicked(null);
            }}
          >
            {t.close} ×
          </button>
        </div>
        {picked && (
          <>
            <p className="source-location">
              {picked.chunk.file} · {t.page} {picked.chunk.page} · #
              {picked.chunk.id}
            </p>
            <blockquote>{picked.chunk.text}</blockquote>
            <p>
              {picked.selected
                ? t.why
                : picked.reason === "threshold"
                  ? lang === "fr"
                    ? "Cosinus inférieur au seuil de 0,78."
                    : "Cosine below the 0.78 threshold."
                  : picked.reason === "count"
                    ? lang === "fr"
                      ? "Quatre passages admissibles ont déjà été retenus."
                      : "Four eligible passages already selected."
                    : picked.reason === "budget"
                      ? lang === "fr"
                        ? "Le budget de 1 600 tokens serait dépassé."
                        : "Would exceed the 1,600-token budget."
                      : lang === "fr"
                        ? "Hors des 20 premiers de chaque classement."
                        : "Outside the top 20 of both rankings."}
            </p>
            <dl>
              <dt>{t.shared}</dt>
              <dd>{picked.common.join(", ") || "—"}</dd>
              <dt>Cosinus ≥ 0.78</dt>
              <dd>{picked.cosine.toFixed(4)}</dd>
              <dt>RRF</dt>
              <dd>
                {picked.denseRRF.toFixed(5)} + {picked.lexicalRRF.toFixed(5)} ={" "}
                {picked.rrf.toFixed(5)}
              </dd>
              <dt>OCR</dt>
              <dd>{picked.chunk.ocr ? "✓" : "—"}</dd>
            </dl>
          </>
        )}
      </dialog>
    </div>
  );
}
