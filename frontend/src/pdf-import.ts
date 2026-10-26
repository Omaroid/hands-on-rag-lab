import {
  getDocument,
  GlobalWorkerOptions,
  PasswordException,
} from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { PageText } from "./pdf-retrieval";
GlobalWorkerOptions.workerSrc = pdfWorker;
import { validateFiles } from "./pdf-limits";
export async function readPDFs(
  files: File[],
  signal: AbortSignal,
  progress: (message: {
    file: string;
    page: number;
    total: number;
    kind: "text" | "ocr";
    progress?: number;
    completedPage?: PageText;
  }) => void,
) {
  validateFiles(files);
  const result: PageText[] = [];
  let totalPages = 0,
    totalText = 0;
  let ocr: Worker | null = null;
  let activeTask: ReturnType<typeof getDocument> | null = null;
  const stop = () => {
    void activeTask?.destroy();
    ocr?.terminate();
  };
  signal.addEventListener("abort", stop);
  try {
    for (const file of files) {
      signal.throwIfAborted();
      const data = new Uint8Array(await file.arrayBuffer());
      if (new TextDecoder().decode(data.slice(0, 5)) !== "%PDF-")
        throw Error("format");
      const task = getDocument({
        data,
        useSystemFonts: true,
        stopAtErrors: true,
        maxImageSize: 8_000_000,
      });
      activeTask = task;
      const pdf = await task.promise;
      totalPages += pdf.numPages;
      if (totalPages > 40) throw Error("pages");
      for (let number = 1; number <= pdf.numPages; number++) {
        signal.throwIfAborted();
        progress({
          file: file.name,
          page: number,
          total: pdf.numPages,
          kind: "text",
        });
        const page = await pdf.getPage(number),
          content = await page.getTextContent();
        let text = "";
        let previousY: number | null = null,
          previousHeight = 0;
        for (const item of content.items) {
          if (!("str" in item)) continue;
          const y = item.transform[5],
            height = Math.abs(item.height);
          if (
            previousY !== null &&
            Math.abs(y - previousY) >
              1.5 * Math.max(height, previousHeight, 1) &&
            !text.endsWith("\n\n")
          )
            text += "\n\n";
          text += item.str + (item.hasEOL ? "\n" : " ");
          previousY = y;
          previousHeight = height;
        }
        let usedOCR = false;
        if (text.replace(/\s/g, "").length < 30) {
          usedOCR = true;
          progress({
            file: file.name,
            page: number,
            total: pdf.numPages,
            kind: "ocr",
            progress: 0,
          });
          if (!ocr)
            ocr = new Worker(new URL("./ocr.worker.ts", import.meta.url), {
              type: "module",
            });
          const base = page.getViewport({ scale: 1 }),
            scale = Math.min(
              2,
              Math.sqrt(4_000_000 / (base.width * base.height)),
            ),
            view = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(view.width);
          canvas.height = Math.ceil(view.height);
          const ctx = canvas.getContext("2d");
          if (!ctx) throw Error("canvas");
          await page.render({ canvas, canvasContext: ctx, viewport: view })
            .promise;
          const blob = await new Promise<Blob>((resolve, reject) =>
            canvas.toBlob(
              (b) => (b ? resolve(b) : reject(Error("canvas"))),
              "image/png",
            ),
          );
          const buffer = await blob.arrayBuffer();
          const activeOCR = ocr;
          text = await new Promise<string>((resolve, reject) => {
            const abort = () =>
              reject(new DOMException("Aborted", "AbortError"));
            const finish = () => signal.removeEventListener("abort", abort);
            signal.addEventListener("abort", abort, { once: true });
            activeOCR.onerror = () => {
              finish();
              reject(Error("ocr"));
            };
            activeOCR.onmessage = (e) => {
              if (e.data.type === "progress")
                progress({
                  file: file.name,
                  page: number,
                  total: pdf.numPages,
                  kind: "ocr",
                  progress: e.data.progress,
                });
              else {
                finish();
                if (e.data.type === "text") resolve(e.data.text);
                else reject(Error("ocr"));
              }
            };
            if (signal.aborted) {
              abort();
              return;
            }
            activeOCR.postMessage(buffer, [buffer]);
          });
          canvas.width = 0;
          canvas.height = 0;
        }
        signal.throwIfAborted();
        totalText += text.length;
        if (totalText > 150_000) throw Error("text");
        if (text.trim())
          result.push({
            file: file.name,
            page: number,
            text: text.trim(),
            ocr: usedOCR,
          });
        if (text.trim())
          progress({
            file: file.name,
            page: number,
            total: pdf.numPages,
            kind: usedOCR ? "ocr" : "text",
            completedPage: result[result.length - 1],
          });
        page.cleanup();
      }
      await task.destroy();
      activeTask = null;
    }
    if (!result.length) throw Error("empty");
    return result;
  } catch (e) {
    if (e instanceof PasswordException) throw Error("password");
    throw e;
  } finally {
    signal.removeEventListener("abort", stop);
    await activeTask?.destroy();
    ocr?.terminate();
  }
}
