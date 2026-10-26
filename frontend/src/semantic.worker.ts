import { pipeline, env } from "@huggingface/transformers";
import type { PageText, Passage } from "./pdf-retrieval";
env.allowLocalModels = false;
env.useBrowserCache = false;
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
  env.backends.onnx.wasm.proxy = false;
  env.backends.onnx.wasm.wasmPaths = "/onnx/";
}
const revision = "761b726dd34fb83930e26aab4e9ac3899aa1fa78";
env.remotePathTemplate = "{model}/resolve/" + revision + "/";
let extractor: Awaited<
  ReturnType<typeof pipeline<"feature-extraction">>
> | null = null;
async function load() {
  if (!extractor)
    extractor = await pipeline(
      "feature-extraction",
      "Xenova/multilingual-e5-small",
      {
        revision,
        dtype: "q8",
        device: "wasm",
        progress_callback: (p: unknown) =>
          self.postMessage({ type: "download", detail: p }),
      },
    );
  return extractor;
}
self.onmessage = async (e: MessageEvent) => {
  try {
    const model = await load();
    const tokenCount = (s: string) => model.tokenizer.encode(s).length;
    async function embed(s: string) {
      if (tokenCount(s) > 480) throw Error("token_limit");
      const output = await model(s, { pooling: "mean", normalize: true });
      return Array.from(output.data as Float32Array);
    }
    if (e.data.type === "query") {
      const text = "query: " + e.data.question;
      self.postMessage({ type: "query", vector: await embed(text) });
      return;
    }
    const pages = e.data.pages as PageText[],
      drafts: Omit<Passage, "vector">[] = [];
    function split(text: string): string[] {
      if (tokenCount("passage: " + text) <= 480) return [text];
      const middle = Math.floor(text.length / 2);
      let cut = text.lastIndexOf(" ", middle);
      if (cut < middle / 2) cut = middle;
      return [...split(text.slice(0, cut)), ...split(text.slice(cut))].filter(
        (s) => s.trim(),
      );
    }
    for (const page of pages) {
      // Preserve paragraph/heading boundaries; merge only adjacent short paragraphs on one page.
      let pending = "";
      const emit = () => {
        if (pending.trim())
          for (const text of split(pending.trim()))
            drafts.push({
              ...page,
              text,
              id: String(drafts.length + 1),
              tokens: tokenCount("passage: " + text),
            });
        pending = "";
      };
      for (const paragraph of page.text.split(/\n\s*\n/)) {
        if (!paragraph.trim()) continue;
        if (
          pending &&
          tokenCount("passage: " + pending + "\n\n" + paragraph) > 400
        )
          emit();
        pending += (pending ? "\n\n" : "") + paragraph;
      }
      emit();
    }
    if (drafts.length > 200) throw Error("chunk_limit");
    if (!drafts.length) throw Error("empty");
    self.postMessage({
      type: "drafts",
      total: drafts.length,
      preview: drafts
        .slice(0, 3)
        .map((d) => ({ text: d.text, tokens: d.tokens })),
    });
    const chunks: Passage[] = [];
    for (const draft of drafts) {
      chunks.push({ ...draft, vector: await embed("passage: " + draft.text) });
      self.postMessage({
        type: "encoded",
        done: chunks.length,
        total: drafts.length,
      });
    }
    self.postMessage({ type: "index", chunks });
  } catch (error) {
    const code =
      error instanceof Error &&
      ["chunk_limit", "token_limit", "empty"].includes(error.message)
        ? error.message
        : "encoder_failed";
    self.postMessage({ type: "error", code });
  }
};
