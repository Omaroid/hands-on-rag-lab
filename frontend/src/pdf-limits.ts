export const MAX_BYTES = 5_000_000;
export function validateFiles(files: File[]) {
  if (!files.length || files.length > 10) throw Error("file_count");
  if (files.reduce((n, f) => n + f.size, 0) > MAX_BYTES) throw Error("size");
  if (
    files.some(
      (f) =>
        !f.name.toLowerCase().endsWith(".pdf") ||
        (f.type && f.type !== "application/pdf") ||
        !f.size,
    )
  )
    throw Error("format");
}
