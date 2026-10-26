import { useEffect, useRef, useState } from "react";
import type { Hit } from "./pdf-retrieval";
type Reply = {
  status: "supported" | "incomplete" | "absent";
  answer: string;
  citations: { number: number; id: string }[];
  model: string;
};
const words = {
  fr: {
    title: "Synthèse NVIDIA",
    available:
      "Après votre accord, seuls la question et les passages sélectionnés sont envoyés à NVIDIA. Les PDF complets et les vecteurs restent locaux.",
    unavailable:
      "Génération indisponible pour le moment. Aucun extrait ni question n’est transmis ; les sources restent consultables.",
    consent:
      "J’accepte l’envoi de ma question et des passages sélectionnés à NVIDIA pour cette réponse. Ne transmettez pas de données confidentielles.",
    generate: "Générer une réponse sourcée",
    generating: "Rédaction en cours…",
    stop: "Arrêter l’attente",
    stopNote:
      "Arrêter l’attente ne garantit pas l’annulation côté fournisseur. Aucun nouvel essai automatique.",
    failure:
      "La génération n’a pas abouti. Les sources restent consultables. Aucun nouvel essai automatique.",
    cancelled: "Attente arrêtée.",
    statuses: {
      supported: "Réponse étayée par les extraits",
      incomplete: "Réponse partielle · informations manquantes",
      absent: "Les sources ne permettent pas de répondre",
    },
    warning:
      "Texte généré : vérifiez les affirmations et leur portée dans les sources. Les citations ne constituent pas une validation automatique.",
    source: "Consulter",
    page: "page",
  },
  en: {
    title: "NVIDIA synthesis",
    available:
      "After your consent, only the question and selected passages are sent to NVIDIA. Full PDFs and vectors remain local.",
    unavailable:
      "Generation is currently unavailable. No excerpts or questions are transmitted; sources remain available.",
    consent:
      "I agree to send my question and selected passages to NVIDIA for this answer. Do not send confidential information.",
    generate: "Generate a cited answer",
    generating: "Writing…",
    stop: "Stop waiting",
    stopNote:
      "Stopping does not guarantee cancellation at the provider. No automatic retry.",
    failure:
      "Generation did not complete. Sources remain available. No automatic retry.",
    cancelled: "Stopped waiting.",
    statuses: {
      supported: "Answer supported by the excerpts",
      incomplete: "Partial answer · missing information",
      absent: "The sources do not support an answer",
    },
    warning:
      "Generated text: verify claims and their scope in the sources. Citations are not automatic factual validation.",
    source: "Read source",
    page: "page",
  },
};
export default function PdfGeneration({
  lang,
  question,
  context,
  onCitation,
}: {
  lang: "fr" | "en";
  question: string;
  context: Hit[];
  onCitation: (hit: Hit) => void;
}) {
  const t = words[lang];
  const [ready, setReady] = useState(false),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [reply, setReply] = useState<Reply | null>(null);
  const active = useRef<AbortController | null>(null);
  useEffect(() => {
    const c = new AbortController();
    fetch("/api/ai/status", { signal: c.signal })
      .then((r) => (r.ok ? r.json() : { ready: false }))
      .then((d) => {
        if (!c.signal.aborted) setReady(d.ready === true);
      })
      .catch(() => {});
    return () => {
      c.abort();
      active.current?.abort();
    };
  }, []);
  async function generate() {
    if (!ready || !consent || busy || !context.length) return;
    const c = new AbortController();
    active.current = c;
    const timer = setTimeout(() => c.abort(), 35000);
    setBusy(true);
    setError("");
    setReply(null);
    try {
      const r = await fetch("/api/ai/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: c.signal,
        body: JSON.stringify({
          question,
          language: lang,
          consent: true,
          passages: context.map(({ chunk: c }) => ({
            id: c.id,
            file: c.file,
            page: c.page,
            text: c.text,
          })),
        }),
      });
      if (!r.ok) throw Error("unavailable");
      const d = await r.json();
      if (
        !["supported", "incomplete", "absent"].includes(d.status) ||
        typeof d.answer !== "string" ||
        d.answer.length > 5000 ||
        !Array.isArray(d.citations) ||
        d.citations.some(
          (c: { id: string; number: number }) =>
            !Number.isInteger(c.number) ||
            c.number < 1 ||
            c.number > context.length ||
            context[c.number - 1].chunk.id !== c.id,
        )
      )
        throw Error("invalid response");
      if (!c.signal.aborted) setReply(d);
    } catch {
      setError(c.signal.aborted ? t.cancelled : t.failure);
    } finally {
      clearTimeout(timer);
      active.current = null;
      setBusy(false);
    }
  }
  return (
    <div className="nvidia">
      <h3>
        {t.title}
        <span className="chip">openai/gpt-oss-20b</span>
      </h3>
      <p role="status">{ready ? t.available : t.unavailable}</p>
      <label className="consent">
        <input
          type="checkbox"
          checked={consent}
          disabled={busy}
          onChange={(e) => setConsent(e.target.checked)}
        />
        {t.consent}
      </label>
      <button
        type="button"
        className="primary"
        disabled={!ready || !consent || !context.length || busy}
        onClick={() => void generate()}
      >
        {busy ? t.generating : t.generate}
      </button>
      {busy && (
        <button
          type="button"
          className="text-button"
          onClick={() => active.current?.abort()}
        >
          {t.stop}
        </button>
      )}
      <p>{t.stopNote}</p>
      {error && <p role="alert">{error}</p>}
      {reply && (
        <article className="generated-answer" aria-live="polite">
          <h3>{t.statuses[reply.status]}</h3>
          <p className="generated-text">{reply.answer}</p>
          <p>{t.warning}</p>
          <div className="generated-citations">
            {reply.citations.map((c) => {
              const hit = context[c.number - 1];
              return (
                <button
                  type="button"
                  className="secondary"
                  key={c.id}
                  onClick={() => onCitation(hit)}
                >
                  [{c.number}] {t.source} · {hit.chunk.file} · {t.page}{" "}
                  {hit.chunk.page}
                </button>
              );
            })}
          </div>
        </article>
      )}
    </div>
  );
}
