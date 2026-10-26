import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { labels } from "./pdf-labels";
import { validateFiles } from "./pdf-limits";
import {
  normalize,
  retrieve,
  type Passage,
  type Hit,
  type PageText,
} from "./pdf-retrieval";
import "./pdf.css";
import PdfGeneration from "./PdfGeneration";
const ArchitecturePage = lazy(() => import("./ArchitecturePage"));
const TheoryPage = lazy(() => import("./TheoryPage"));
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "./components/ui/accordion";
import {
  Layers,
  Upload,
  ShieldCheck,
  Workflow,
  ArrowUpRight,
  ArrowRight,
  Plus,
} from "lucide-react";
import "./professional.css";
import LearningJourney, {
  emptyActivity,
  type Activity,
} from "./LearningJourney";
export default function PdfApp() {
  const routeView = () =>
    location.pathname.startsWith("/theory")
      ? "theory"
      : location.pathname.startsWith("/architecture")
        ? "architecture"
        : "documents";
  const [view, setView] = useState(routeView);
  const [workshop, setWorkshop] = useState("");
  useEffect(() => {
    const sync = () => setView(routeView());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  function navigate(next: string) {
    if (next !== view)
      history.pushState({}, "", next === "documents" ? "/" : "/" + next);
    setView(next);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  const [activity, setActivity] = useState<Activity>(emptyActivity);
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
    [drag, setDrag] = useState(false);
  useEffect(() => {
    if (busy || queryBusy) setWorkshop("workshop");
  }, [busy, queryBusy]);
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
    document.title = `Source — ${view === "theory" ? (lang === "fr" ? "Théorie du RAG" : "RAG theory") : view === "architecture" ? "Architecture" : lang === "fr" ? "Documents et réponses" : "Documents and answers"}`;
  }, [lang, view]);
  function reset() {
    setActivity(emptyActivity);
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
    setActivity({ ...emptyActivity, phase: "stopped" });
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
    setActivity({ ...emptyActivity, phase: "reading" });
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
        if (generation.current === id) {
          if (p.completedPage)
            setPages((previous) => [...previous, p.completedPage!]);
          setActivity((previous) => ({
            ...previous,
            phase: p.kind === "ocr" ? "ocr" : "reading",
            file: p.file,
            done: p.page,
            total: p.total,
          }));
          setStatus(
            `${p.kind === "ocr" ? "OCR" : t.reading} · ${p.file} · ${p.page}/${p.total}${p.progress !== undefined ? " · " + Math.round(p.progress * 100) + "%" : ""}`,
          );
        }
      });
      if (generation.current !== id) return;
      setActivity((previous) => ({
        ...previous,
        phase: "model",
        done: 0,
        total: 0,
        file: undefined,
      }));
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
        setActivity({ ...emptyActivity, phase: "error" });
        setError(t.errors[code as keyof typeof t.errors] || t.errors.default);
      };
      w.onerror = () => fail();
      w.onmessage = (e) => {
        if (generation.current !== id) return;
        const d = e.data;
        if (d.type === "download" && d.detail.status === "progress") {
          setActivity((previous) => ({
            ...previous,
            phase: "model",
            done: d.detail.progress || 0,
            total: 100,
            detail: d.detail.file,
          }));
          setStatus(
            `${t.loading} · ${d.detail.file} · ${Math.round(d.detail.progress || 0)}%`,
          );
        }
        if (d.type === "drafts")
          setActivity((previous) => ({
            ...previous,
            phase: "splitting",
            draftCount: d.total,
            drafts: d.preview,
            done: 0,
            total: d.total,
          }));
        if (d.type === "encoded") {
          setActivity((previous) => ({
            ...previous,
            phase: "encoding",
            done: d.done,
            total: d.total,
            encoded: d.done,
          }));
          setStep(2);
          setStatus(`${t.encoding} · ${d.done}/${d.total}`);
        }
        if (d.type === "index") {
          if (timer.current) clearTimeout(timer.current);
          setChunks(d.chunks);
          setActivity((previous) => ({
            ...previous,
            phase: "ready",
            done: d.chunks.length,
            total: d.chunks.length,
            encoded: d.chunks.length,
          }));
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
      setActivity({ ...emptyActivity, phase: "error" });
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
    setActivity((previous) => ({
      ...previous,
      phase: "query",
      done: 0,
      total: 0,
    }));
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
        setActivity((previous) => ({ ...previous, phase: "results" }));
        setStep(7);
      } else {
        setActivity((previous) => ({ ...previous, phase: "error" }));
        setError(
          t.errors[e.data.code as keyof typeof t.errors] || t.errors.default,
        );
      }
    };
    w.postMessage({ type: "query", question: q });
  }
  function show(hit: Hit) {
    setPicked(hit);
    dialog.current?.showModal();
  }
  const total = files.reduce((s, f) => s + f.size, 0);
  return (
    <div className="pdf-app refined-app">
      <a className="skip-link" href="#content">
        {lang === "fr" ? "Aller au contenu" : "Skip to content"}
      </a>
      <header className="topbar">
        <a
          className="pdf-brand"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            navigate("documents");
          }}
        >
          <span className="brand-symbol">
            <Layers size={19} />
          </span>
          Source
          <span className="brand-dot">.</span>
        </a>
        <nav
          className="pdf-topnav"
          aria-label={
            lang === "fr" ? "Navigation principale" : "Main navigation"
          }
        >
          {["documents", "theory", "architecture"].map((v) => (
            <a
              key={v}
              href={v === "documents" ? "/" : "/" + v}
              aria-current={view === v ? "page" : undefined}
              onClick={(e) => {
                if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
                  e.preventDefault();
                  navigate(v);
                }
              }}
            >
              {v === "documents"
                ? "Documents"
                : v === "theory"
                  ? lang === "fr"
                    ? "Théorie"
                    : "Theory"
                  : "Architecture"}
            </a>
          ))}
        </nav>
        <span className="top-note">
          <span className="green-dot" />
          {t.local}
        </span>
        <div className="language" aria-label="Language">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLang("fr")}
            aria-pressed={lang === "fr"}
          >
            FR
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLang("en")}
            aria-pressed={lang === "en"}
          >
            EN
          </Button>
        </div>
      </header>
      <main id="content">
        <div className="documents-view" hidden={view !== "documents"}>
          <section className="hero">
            <div className="eyebrow">
              <span />
              {lang === "fr" ? "ESPACE DE TRAVAIL" : "WORKSPACE"}
            </div>
            <h1>
              {t.title}
              <br />
              <em>{t.accent}</em>
            </h1>
            <p>{t.intro}</p>
            <div className="privacy">
              <ShieldCheck size={15} /> {t.privacy}
            </div>
            <Button
              variant="ghost"
              className="hero-theory"
              onClick={() => navigate("theory")}
            >
              {lang === "fr"
                ? "Comment fonctionne le RAG ?"
                : "How does RAG work?"}
              <ArrowUpRight size={14} />
            </Button>
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
              <Card className="panel">
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
                    <Upload size={23} />
                  </div>
                  <h3>{t.drop}</h3>
                  <p>{t.limits}</p>
                  <Button
                    variant="outline"
                    className="secondary"
                    disabled={busy || queryBusy}
                    onClick={() => input.current?.click()}
                  >
                    {t.choose} <Plus size={14} />
                  </Button>
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
                  <Button
                    className="primary"
                    onClick={() => void index()}
                    disabled={!files.length || busy || queryBusy}
                  >
                    {t.index} <ArrowRight size={14} />
                  </Button>
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
              </Card>

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
                          #{c.id} · {c.file} · {t.page} {c.page} · {c.tokens}
                          /480 tokens
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
              <Card className="panel">
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
                    <Button
                      className="primary"
                      type="submit"
                      disabled={
                        !chunks.length ||
                        question.trim().length < 3 ||
                        queryBusy
                      }
                    >
                      {queryBusy ? "…" : t.search} <ArrowUpRight size={14} />
                    </Button>
                  </div>
                  {!chunks.length && <p className="muted">{t.noDocs}</p>}
                </form>
              </Card>
              <Accordion
                type="single"
                collapsible
                value={workshop}
                onValueChange={setWorkshop}
                className="workspace-workshop"
              >
                <AccordionItem value="workshop">
                  <AccordionTrigger>
                    <span>
                      <Workflow size={17} />
                      {lang === "fr"
                        ? "L’atelier des preuves"
                        : "The evidence workshop"}
                      <small>
                        {lang === "fr"
                          ? "Suivre et comprendre le traitement"
                          : "Follow and understand the processing"}
                      </small>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    {" "}
                    <LearningJourney
                      lang={lang}
                      activity={activity}
                      pages={pages}
                      chunks={chunks}
                      result={result}
                      busy={busy || queryBusy}
                      onArchitecture={() => navigate("architecture")}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
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
                    <PdfGeneration
                      lang={lang}
                      question={result.normalized}
                      context={result.context}
                      onCitation={show}
                    />
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
        </div>
        <Suspense
          fallback={
            <p className="route-loading">
              {lang === "fr" ? "Chargement…" : "Loading…"}
            </p>
          }
        >
          {view === "theory" && (
            <TheoryPage
              lang={lang}
              onDocuments={() => navigate("documents")}
              onArchitecture={() => navigate("architecture")}
            />
          )}
          {view === "architecture" && (
            <ArchitecturePage
              lang={lang}
              result={result}
              onBack={() => navigate("documents")}
            />
          )}
        </Suspense>
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
