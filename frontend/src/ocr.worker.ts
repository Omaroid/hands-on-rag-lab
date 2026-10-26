import { createWorker, OEM } from "tesseract.js";
let engine: Awaited<ReturnType<typeof createWorker>> | null = null;
self.onmessage = async (e: MessageEvent<ArrayBuffer>) => {
  try {
    if (!engine)
      engine = await createWorker(["fra", "eng"], OEM.LSTM_ONLY, {
        workerPath: "/ocr/worker.min.js",
        corePath: "/ocr/core",
        langPath: "/ocr/lang",
        workerBlobURL: false,
        gzip: true,
        cacheMethod: "none",
        logger: (m) => {
          if (m.status === "recognizing text")
            self.postMessage({ type: "progress", progress: m.progress });
        },
      });
    const output = await engine.recognize(
      new Blob([e.data], { type: "image/png" }),
    );
    self.postMessage({ type: "text", text: output.data.text });
  } catch {
    self.postMessage({ type: "error" });
  }
};
