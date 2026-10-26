import { mkdir, copyFile, readdir } from "node:fs/promises";
const assets = [
  ["node_modules/tesseract.js/dist/worker.min.js", "public/ocr/worker.min.js"],
  ...["eng", "fra"].map((l) => [
    `node_modules/@tesseract.js-data/${l}/4.0.0_best_int/${l}.traineddata.gz`,
    `public/ocr/lang/${l}.traineddata.gz`,
  ]),
];
for (const f of await readdir("node_modules/tesseract.js-core"))
  if (f.includes("lstm") && (f.endsWith(".wasm.js") || f.endsWith(".wasm")))
    assets.push([
      `node_modules/tesseract.js-core/${f}`,
      `public/ocr/core/${f}`,
    ]);
for (const f of [
  "ort-wasm-simd-threaded.mjs",
  "ort-wasm-simd-threaded.wasm",
  "ort-wasm-simd-threaded.jsep.mjs",
  "ort-wasm-simd-threaded.jsep.wasm",
  "ort-wasm-simd-threaded.asyncify.mjs",
  "ort-wasm-simd-threaded.asyncify.wasm",
])
  assets.push([`node_modules/onnxruntime-web/dist/${f}`, `public/onnx/${f}`]);
for (const [src, dest] of assets) {
  await mkdir(dest.slice(0, dest.lastIndexOf("/")), { recursive: true });
  await copyFile(src, dest);
}
for (const [pkg, label] of [
  ["tesseract.js", "tesseract"],
  ["tesseract.js-core", "tesseract-core"],
  ["@huggingface/transformers", "transformers"],
  ["pdfjs-dist", "pdfjs"],
]) {
  await mkdir("public/licenses", { recursive: true });
  await copyFile(
    `node_modules/${pkg}/${pkg === "tesseract.js" ? "LICENSE.md" : "LICENSE"}`,
    `public/licenses/${label}.txt`,
  );
}

await copyFile("notices/onnxruntime.txt", "public/licenses/onnxruntime.txt");
await copyFile("notices/THIRD_PARTY.md", "public/licenses/THIRD_PARTY.md");

await copyFile("notices/shadcn-ui.txt", "public/licenses/shadcn-ui.txt");
