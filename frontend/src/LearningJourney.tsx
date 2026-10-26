import { useState } from "react";
import type { PageText, Passage, retrieve } from "./pdf-retrieval";
import "./learning-journey.css";
export type Activity = {
  phase:
    | "waiting"
    | "reading"
    | "ocr"
    | "model"
    | "splitting"
    | "encoding"
    | "ready"
    | "query"
    | "results"
    | "stopped"
    | "error";
  done: number;
  total: number;
  file?: string;
  detail?: string;
  draftCount: number;
  encoded: number;
  drafts: { text: string; tokens: number }[];
};
export const emptyActivity: Activity = {
  phase: "waiting",
  done: 0,
  total: 0,
  draftCount: 0,
  encoded: 0,
  drafts: [],
};
export default function LearningJourney({
  lang,
  activity,
  pages,
  chunks,
  result,
  busy,
  onArchitecture,
}: {
  lang: "fr" | "en";
  activity: Activity;
  pages: PageText[];
  chunks: Passage[];
  result: ReturnType<typeof retrieve> | null;
  busy: boolean;
  onArchitecture: () => void;
}) {
  const fr = lang === "fr",
    a = activity;
  const current = ["waiting", "reading", "ocr"].includes(a.phase)
    ? 0
    : ["model", "splitting"].includes(a.phase)
      ? 1
      : a.phase === "encoding"
        ? 2
        : a.phase === "ready"
          ? 2
          : a.phase === "query"
            ? 3
            : result
              ? 4
              : 0;
  const [inspected, setInspected] = useState<number | null>(null),
    [sample, setSample] = useState(0),
    [guess, setGuess] = useState<string | null>(null);
  const selected = inspected ?? current,
    items = fr
      ? [
          "Ouvrir les pages",
          "Fabriquer les cartes",
          "Créer les boussoles",
          "Suivre les indices",
          "Composer la réponse",
        ]
      : [
          "Open the pages",
          "Make the cards",
          "Build the compasses",
          "Follow the clues",
          "Compose the answer",
        ];
  const intros = fr
    ? [
        "On transforme le PDF en texte lisible. S’il s’agit d’une image, l’OCR reconnaît les caractères sur cet appareil.",
        "Chaque page devient de petites cartes de texte. On garde le fichier et la page au dos de chaque carte pour pouvoir revenir à la source.",
        "E5 transforme chaque carte en 384 nombres : une adresse dans un espace de sens. Des sens proches pointent dans des directions proches.",
        "Deux détectives travaillent : E5 cherche un sens proche ; BM25 cherche les mots utiles. RRF réunit leurs classements.",
        "Les cartes retenues forment le contexte. Après ton accord, NVIDIA peut rédiger une réponse à partir de ces extraits. Chaque citation te ramène à une carte.",
      ]
    : [
        "Turn the PDF into readable text. For an image, local OCR recognizes its characters.",
        "Each page becomes small text cards. File and page stay attached so you can return to the source.",
        "E5 turns each card into 384 numbers: an address in a space of meaning. Similar meanings point in similar directions.",
        "Two detectives work together: E5 finds similar meaning; BM25 finds useful words. RRF merges their rankings.",
        "Selected cards form the context. After consent, NVIDIA can compose an answer from these excerpts. Each citation returns to a card.",
      ];
  const phases: Record<string, string> = fr
    ? {
        waiting: "À toi de jouer : ajoute tes PDF pour démarrer.",
        reading: "Lecture des pages en cours",
        ocr: "Reconnaissance des caractères de l’image",
        model: "Préparation de la boussole E5",
        splitting: "Découpage du texte en cartes",
        encoding: "Calcul des vrais vecteurs",
        ready: "Ton index est prêt à explorer",
        query: "Encodage de la question, puis recherche",
        results: "Les indices sont réunis : explore le résultat",
        stopped: "Parcours arrêté ; données de travail effacées",
        error: "Parcours interrompu ; consulte le message ci-dessous",
      }
    : {
        waiting: "Your turn: add PDFs to begin.",
        reading: "Reading pages",
        ocr: "Recognizing characters in the image",
        model: "Preparing the E5 compass",
        splitting: "Splitting text into cards",
        encoding: "Computing actual vectors",
        ready: "Your index is ready to explore",
        query: "Encoding the question, then retrieving",
        results: "Clues collected: explore the result",
        stopped: "Stopped; working data cleared",
        error: "Interrupted; see the message below",
      };
  const page = pages[Math.min(sample, pages.length - 1)],
    card =
      chunks[Math.min(sample, chunks.length - 1)] ||
      a.drafts[Math.min(sample, a.drafts.length - 1)],
    vector = "vector" in (card || {}) ? (card as Passage).vector : [],
    max = Math.max(...vector.slice(0, 16).map(Math.abs), 0.001);
  return (
    <section className="lab-journey" aria-labelledby="lab-title">
      <div className="lab-heading">
        <div>
          <span className="section-kicker">
            {fr ? "L’ATELIER DES PREUVES" : "THE EVIDENCE WORKSHOP"}
          </span>
          <h2 id="lab-title">
            {fr
              ? "Regarde tes documents prendre forme."
              : "Watch your documents take shape."}
          </h2>
          <p>
            {fr
              ? "Un parcours à explorer. Des données réelles à chaque étape."
              : "A journey to explore. Real data at every step."}
          </p>
        </div>
        <span className="lab-live">
          <span className={busy ? "pulse" : "green-dot"} />
          {fr ? "Sur cet appareil" : "On this device"}
        </span>
      </div>
      <ol className="lab-track">
        {items.map((label, i) => (
          <li key={label}>
            <button
              aria-pressed={selected === i}
              onClick={() => {
                setInspected(i);
                setSample(0);
              }}
            >
              <span className="lab-step-number">
                {i < current ? "✓" : `0${i + 1}`}
              </span>
              <strong>{label}</strong>
              <small>
                {i === current
                  ? busy
                    ? fr
                      ? "En cours"
                      : "Working"
                    : fr
                      ? "À explorer"
                      : "Explore"
                  : fr
                    ? "Voir comment"
                    : "See how"}
              </small>
            </button>
          </li>
        ))}
      </ol>
      <div className="lab-now">
        <span>{phases[a.phase]}</span>
        {a.file && (
          <small>
            {a.file}
            {a.total > 0 ? ` · ${a.done}/${a.total}` : ""}
          </small>
        )}
        {a.phase === "encoding" && a.total > 0 && (
          <progress
            max={a.total}
            value={a.done}
            aria-label={fr ? "Passages encodés" : "Encoded passages"}
          />
        )}
        {a.phase === "model" && a.total > 0 && (
          <>
            <small>
              {a.detail} · {Math.round(a.done)}%
            </small>
            <progress
              max={100}
              value={a.done}
              aria-label={
                fr ? "Téléchargement du fichier modèle" : "Model file download"
              }
            />
          </>
        )}
      </div>
      <div
        className="lab-stats"
        aria-label={fr ? "Compteurs réels" : "Actual counts"}
      >
        {[
          [pages.length, fr ? "pages lues" : "pages read"],
          [
            chunks.length || a.draftCount,
            fr ? "cartes de texte" : "text cards",
          ],
          [
            chunks.length || a.encoded,
            fr ? "vecteurs calculés" : "vectors computed",
          ],
          [
            result?.context.length ?? 0,
            fr ? "preuves retenues" : "selected sources",
          ],
        ].map(([n, label]) => (
          <div key={label}>
            <strong>{n}</strong>
            <span>
              {n === 1
                ? String(label)
                    .replace("pages lues", "page lue")
                    .replace("cartes de texte", "carte de texte")
                    .replace("vecteurs calculés", "vecteur calculé")
                    .replace("preuves retenues", "preuve retenue")
                    .replace("pages read", "page read")
                    .replace("text cards", "text card")
                    .replace("vectors computed", "vector computed")
                    .replace("selected sources", "selected source")
                : label}
            </span>
          </div>
        ))}
      </div>
      <div className="lab-explorer">
        <div className="lab-explanation">
          <span className="section-kicker">
            {fr ? "ZOOM SUR L’ÉTAPE" : "INSIDE STEP"} 0{selected + 1}
          </span>
          <h3>{items[selected]}</h3>
          <p>{intros[selected]}</p>
          <button
            className="text-button"
            onClick={() => {
              setInspected(null);
              setSample(0);
            }}
          >
            {fr ? "Suivre l’étape en cours" : "Follow the current step"}
          </button>
          <button className="text-button" onClick={onArchitecture}>
            {fr
              ? "Voir les formules et le schéma →"
              : "See formulas and architecture →"}
          </button>
        </div>
        <div className="lab-object">
          {selected === 0 ? (
            page ? (
              <>
                <span className="lab-object-label">
                  {page.file} · {fr ? "page" : "page"} {page.page} ·{" "}
                  {page.ocr ? "OCR" : fr ? "texte natif" : "native text"}
                </span>
                <pre tabIndex={0}>
                  {page.text.slice(0, 500)}
                  {page.text.length > 500 ? "…" : ""}
                </pre>
                {pages.length > 1 && (
                  <label>
                    {fr ? "Changer de page" : "Choose page"}
                    <select
                      value={Math.min(sample, pages.length - 1)}
                      onChange={(e) => setSample(Number(e.target.value))}
                    >
                      {pages.map((p, i) => (
                        <option key={i} value={i}>
                          {p.file} · {p.page}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </>
            ) : (
              <div className="lab-empty">
                <span aria-hidden="true">▤ → Aa</span>
                <p>
                  {fr
                    ? "Le texte de ta première page apparaîtra ici dès qu’elle sera lue."
                    : "Your first page’s text will appear here once read."}
                </p>
              </div>
            )
          ) : selected === 1 ? (
            card ? (
              <>
                <span className="lab-object-label">
                  {fr
                    ? "UNE VRAIE CARTE DE TON DOCUMENT"
                    : "AN ACTUAL CARD FROM YOUR DOCUMENT"}
                </span>
                <div className="lab-text-card">
                  <b>
                    {"file" in card
                      ? `${card.file} · ${fr ? "page" : "page"} ${card.page}`
                      : fr
                        ? "Passage en préparation"
                        : "Passage being prepared"}
                  </b>
                  <p>
                    {card.text.slice(0, 400)}
                    {card.text.length > 400 ? "…" : ""}
                  </p>
                  <small>
                    {card.tokens} tokens E5 ·{" "}
                    {fr ? "préfixe compris" : "including prefix"}
                  </small>
                </div>
                <p className="lab-note">
                  {fr
                    ? "Un token est un morceau de texte pour le modèle, pas forcément un mot. La carte complète reste consultable dans « Les transformations réelles »."
                    : "A token is a piece of text for the model, not necessarily a word. Inspect the full card under “The actual transformations”."}
                </p>
              </>
            ) : (
              <div className="lab-empty">
                <span aria-hidden="true">▤ → ▱ ▱ ▱</span>
                <p>
                  {fr
                    ? "Tes cartes apparaîtront après la lecture et la préparation du tokenizer."
                    : "Your cards appear after reading and tokenizer preparation."}
                </p>
              </div>
            )
          ) : selected === 2 ? (
            vector.length ? (
              <>
                <span className="lab-object-label">
                  {fr
                    ? "16 COORDONNÉES SUR 384 · VRAI VECTEUR"
                    : "16 OF 384 COORDINATES · ACTUAL VECTOR"}
                </span>
                <svg
                  className="lab-vector"
                  viewBox="0 0 360 130"
                  role="img"
                  aria-label={
                    fr
                      ? "Extrait des coordonnées du premier vecteur ; barres positives et négatives autour de zéro"
                      : "Sample of actual vector coordinates; positive and negative bars around zero"
                  }
                >
                  <line x1="0" x2="360" y1="65" y2="65" stroke="#a7b8ad" />
                  {vector.slice(0, 16).map((n, i) => (
                    <rect
                      key={i}
                      x={i * 22 + 3}
                      y={n >= 0 ? 65 - (Math.abs(n) / max) * 48 : 65}
                      width="13"
                      height={(Math.abs(n) / max) * 48}
                      rx="2"
                      fill={n >= 0 ? "#176b58" : "#b68349"}
                    />
                  ))}
                </svg>
                <code>
                  [
                  {vector
                    .slice(0, 5)
                    .map((n) => n.toFixed(4))
                    .join(", ")}
                  , …]
                </code>
                <p className="lab-note">
                  {fr
                    ? "Ces nombres ne sont ni des mots ni des pourcentages de confiance. Ensemble, ils permettent de comparer le sens."
                    : "These numbers are neither words nor confidence percentages. Together, they let us compare meaning."}
                </p>
              </>
            ) : (
              <div className="lab-empty">
                <span aria-hidden="true">Aa → [ · · · ]</span>
                <p>
                  {fr
                    ? "Le vrai vecteur apparaîtra dès que ton index sera prêt."
                    : "An actual vector appears once your index is ready."}
                </p>
              </div>
            )
          ) : selected === 3 ? (
            result ? (
              <>
                <span className="lab-object-label">
                  {fr
                    ? "LA COURSE DES INDICES · CLASSEMENT RÉEL"
                    : "THE CLUE RACE · ACTUAL RANKING"}
                </span>
                <div className="lab-race">
                  {result.hits.slice(0, 3).map((h, i) => (
                    <article key={h.chunk.id}>
                      <b>0{i + 1}</b>
                      <div>
                        <strong>
                          {h.chunk.file} · p. {h.chunk.page}
                        </strong>
                        <small>
                          E5 #{h.denseRank} · BM25{" "}
                          {h.lexicalRank ? `#${h.lexicalRank}` : "—"} · RRF{" "}
                          {h.rrf.toFixed(4)}
                        </small>
                      </div>
                      <span>{h.selected ? "✓" : "—"}</span>
                    </article>
                  ))}
                </div>
                <p className="lab-note">
                  {fr
                    ? "Le rang fusionné ne suffit pas : le seuil et le budget décident ensuite de l’admission."
                    : "Merged rank is not enough: threshold and budget decide admission next."}
                </p>
              </>
            ) : (
              <div className="lab-empty">
                <span aria-hidden="true">E5 ＋ BM25 → RRF</span>
                <p>
                  {fr
                    ? "Pose une question pour voir les vrais candidats et leurs rangs."
                    : "Ask a question to see actual candidates and ranks."}
                </p>
              </div>
            )
          ) : (
            <>
              <span className="lab-object-label">
                {fr ? "LE PANIER DE PREUVES" : "THE EVIDENCE BASKET"}
              </span>
              <strong className="lab-basket">
                {result ? result.context.length : "—"}{" "}
                <small>{fr ? "passages retenus" : "selected passages"}</small>
              </strong>
              <p>
                {result
                  ? `${result.budget} / 1 600 tokens E5`
                  : fr
                    ? "Il se remplit après ta recherche."
                    : "It fills after your search."}
              </p>
              <p className="lab-note">
                {fr
                  ? "L’indexation et la recherche n’appellent pas NVIDIA. Seul le bouton de génération envoie ta question et ce panier après consentement."
                  : "Indexing and retrieval do not call NVIDIA. Only the generation button sends your question and this basket after consent."}
              </p>
            </>
          )}
        </div>
      </div>
      <details className="lab-quiz">
        <summary>
          {fr
            ? "Petit défi : qui fait quoi ?"
            : "Quick challenge: who does what?"}
        </summary>
        <p>
          {fr
            ? "Quand E5 transforme ton passage en vecteur, que fait-il ?"
            : "When E5 turns your passage into a vector, what does it do?"}
        </p>
        <div>
          {[
            [
              "search",
              fr
                ? "Il prépare la recherche de sens"
                : "It prepares meaning-based retrieval",
            ],
            [
              "write",
              fr ? "Il rédige déjà la réponse" : "It already writes the answer",
            ],
          ].map(([id, label]) => (
            <button
              key={id}
              aria-pressed={guess === id}
              onClick={() => setGuess(id)}
            >
              {label}
            </button>
          ))}
        </div>
        {guess && (
          <p className="lab-feedback">
            {guess === "search"
              ? fr
                ? "Exact ! E5 est la boussole. NVIDIA sera le rédacteur, uniquement après ton accord."
                : "Exactly! E5 is the compass. NVIDIA becomes the writer only after consent."
              : fr
                ? "Presque : E5 ne rédige rien. Il encode le sens pour retrouver les passages. NVIDIA intervient plus tard."
                : "Not quite: E5 writes nothing. It encodes meaning to retrieve passages. NVIDIA comes later."}
          </p>
        )}
      </details>
    </section>
  );
}
