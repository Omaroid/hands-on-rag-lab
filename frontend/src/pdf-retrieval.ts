export type PageText = {
  file: string;
  page: number;
  text: string;
  ocr: boolean;
};
export type Passage = PageText & {
  id: string;
  tokens: number;
  vector: number[];
};
export type Hit = {
  chunk: Passage;
  cosine: number;
  bm25: number;
  denseRank: number;
  lexicalRank: number | null;
  denseRRF: number;
  lexicalRRF: number;
  rrf: number;
  common: string[];
  selected: boolean;
  reason: string;
};
const stop = new Set(
  "le la les un une des du de et en à au aux pour par sur avec ce cette ces est sont dans que qui qu il elle ils elles a the an and of in to for on with is are what how does do quel quelle quels quelles comment pourquoi".split(
    " ",
  ),
);
export function terms(text: string) {
  return (
    text
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu)
      ?.filter((x) => x.length > 1 && !stop.has(x)) || []
  );
}
export function normalize(text: string) {
  return text.normalize("NFKC").replace(/\s+/g, " ").trim();
}
export function retrieve(
  chunks: Passage[],
  question: string,
  vector: number[],
  filter: string,
) {
  const candidates = chunks.filter((c) => !filter || c.file === filter),
    query = [...new Set(terms(question))];
  const docs = candidates.map((c) => terms(c.text)),
    avg = docs.reduce((n, d) => n + d.length, 0) / (docs.length || 1);
  const rows = candidates.map((chunk, i) => {
    const doc = docs[i];
    let bm25 = 0;
    for (const t of query) {
      const tf = doc.filter((x) => x === t).length,
        df = docs.filter((d) => d.includes(t)).length;
      if (tf)
        bm25 +=
          (Math.log(1 + (docs.length - df + 0.5) / (df + 0.5)) * tf * 2.2) /
          (tf + 1.2 * (0.25 + (0.75 * doc.length) / (avg || 1)));
    }
    return {
      chunk,
      cosine: chunk.vector.reduce((s, v, j) => s + v * vector[j], 0),
      bm25,
      denseRank: 0,
      lexicalRank: null,
      denseRRF: 0,
      lexicalRRF: 0,
      rrf: 0,
      common: query.filter((t) => doc.includes(t)),
      selected: false,
      reason: "threshold",
    } as Hit;
  });
  [...rows]
    .sort((a, b) => b.cosine - a.cosine || a.chunk.id.localeCompare(b.chunk.id))
    .forEach((r, i) => {
      r.denseRank = i + 1;
      if (i < 20) r.denseRRF = 1 / (60 + i + 1);
    });
  [...rows]
    .filter((r) => r.bm25 > 0)
    .sort((a, b) => b.bm25 - a.bm25 || a.chunk.id.localeCompare(b.chunk.id))
    .forEach((r, i) => {
      r.lexicalRank = i + 1;
      if (i < 20) r.lexicalRRF = 1 / (60 + i + 1);
    });
  rows.forEach((r) => (r.rrf = r.denseRRF + r.lexicalRRF));
  rows.sort((a, b) => b.rrf - a.rrf || a.chunk.id.localeCompare(b.chunk.id));
  let budget = 0,
    count = 0;
  for (const r of rows) {
    r.reason =
      r.cosine < 0.78
        ? "threshold"
        : !r.rrf
          ? "candidate"
          : count >= 4
            ? "count"
            : budget + r.chunk.tokens > 1600
              ? "budget"
              : "selected";
    if (r.reason === "selected") {
      r.selected = true;
      count++;
      budget += r.chunk.tokens;
    }
  }
  return {
    normalized: normalize(question),
    terms: query,
    hits: rows,
    context: rows.filter((r) => r.selected),
    budget,
  };
}
