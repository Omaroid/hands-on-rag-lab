export const ORIGIN = "https://hands-on-rag-lab.vercel.app";
export class RequestError extends Error {
  constructor(status) {
    super("Invalid request");
    this.status = status;
  }
}
export function respond(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.status(status).json(body);
}
export async function readJSON(req, max = 24000) {
  if (req.method !== "POST") throw new RequestError(405);
  if (
    req.headers.origin &&
    req.headers.origin !== ORIGIN &&
    (process.env.VERCEL || req.headers.origin !== "http://localhost:8000")
  )
    throw new RequestError(403);
  if (req.headers["sec-fetch-site"] === "cross-site")
    throw new RequestError(403);
  if (!/^application\/json(?:;|$)/i.test(req.headers["content-type"] || ""))
    throw new RequestError(415);
  if (Number(req.headers["content-length"]) > max) throw new RequestError(413);
  let raw;
  if (req.body !== undefined) {
    raw =
      typeof req.body === "string" || Buffer.isBuffer(req.body)
        ? req.body
        : JSON.stringify(req.body);
    if (Buffer.byteLength(raw) > max) throw new RequestError(413);
  } else {
    let size = 0,
      parts = [];
    for await (const part of req) {
      size += part.length;
      if (size > max) throw new RequestError(413);
      parts.push(part);
    }
    raw = Buffer.concat(parts).toString("utf8");
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new RequestError(400);
  }
}
