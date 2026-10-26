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
export const RRF_K = 60,
  RETRIEVAL_TOP = 20,
  MIN_COSINE = 0.78,
  CONTEXT_PASSAGES = 4,
  CONTEXT_TOKENS = 1600;
export const BM25_K1 = 1.2,
  BM25_B = 0.75;
export function bm25Breakdown(
  docs: string[][],
  query: string[],
  index: number,
) {
  const doc = docs[index] || [],
    N = docs.length,
    averageLength = docs.reduce((n, d) => n + d.length, 0) / (N || 1);
  const entries = query.map((term) => {
    const tf = doc.filter((t) => t === term).length,
      df = docs.filter((d) => d.includes(term)).length;
    const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
    const denominator =
      tf +
      BM25_K1 * (1 - BM25_B + (BM25_B * doc.length) / (averageLength || 1));
    const contribution = tf ? (idf * tf * (BM25_K1 + 1)) / denominator : 0;
    return { term, tf, df, idf, denominator, contribution };
  });
  return {
    N,
    length: doc.length,
    averageLength,
    entries,
    score: entries.reduce((sum, t) => sum + t.contribution, 0),
  };
}
export function retrieve(
  chunks: Passage[],
  question: string,
  vector: number[],
  filter: string,
) {
  const candidates = chunks.filter((c) => !filter || c.file === filter),
    query = [...new Set(terms(question))];
  const docs = candidates.map((c) => terms(c.text));
  const rows = candidates.map((chunk, i) => {
    const doc = docs[i],
      bm25 = bm25Breakdown(docs, query, i).score;
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
      if (i < RETRIEVAL_TOP) r.denseRRF = 1 / (RRF_K + i + 1);
    });
  [...rows]
    .filter((r) => r.bm25 > 0)
    .sort((a, b) => b.bm25 - a.bm25 || a.chunk.id.localeCompare(b.chunk.id))
    .forEach((r, i) => {
      r.lexicalRank = i + 1;
      if (i < RETRIEVAL_TOP) r.lexicalRRF = 1 / (RRF_K + i + 1);
    });
  rows.forEach((r) => (r.rrf = r.denseRRF + r.lexicalRRF));
  rows.sort((a, b) => b.rrf - a.rrf || a.chunk.id.localeCompare(b.chunk.id));
  let budget = 0,
    count = 0;
  for (const r of rows) {
    r.reason =
      r.cosine < MIN_COSINE
        ? "threshold"
        : !r.rrf
          ? "candidate"
          : count >= CONTEXT_PASSAGES
            ? "count"
            : budget + r.chunk.tokens > CONTEXT_TOKENS
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
    queryVector: vector,
  };
}
