import { ready } from "./config.js";
import {
  validateQuestion,
  generateAnswer,
  InvalidRequest,
} from "./pdf-answer.js";
import { reserveQuota, clientHash, QuotaExceeded } from "./quota.js";
import { readJSON, respond, RequestError } from "./http.js";
export function createAnswerHandler({
  isReady = ready,
  reserve = reserveQuota,
  generate = generateAnswer,
} = {}) {
  return async function handler(req, res) {
    if (!isReady())
      return respond(res, 503, { error: "generation_unavailable" });
    try {
      const question = validateQuestion(await readJSON(req));
      const client = clientHash(
        req.headers["x-vercel-forwarded-for"] ||
          req.socket?.remoteAddress ||
          "unknown",
        process.env.RAG_QUOTA_SALT,
      );
      await reserve({ client });
      const answer = await generate(question, {
        apiKey: process.env.NVIDIA_API_KEY,
      });
      return respond(res, 200, answer);
    } catch (error) {
      if (error instanceof RequestError)
        return respond(res, error.status, { error: "invalid_request" });
      if (error instanceof InvalidRequest)
        return respond(res, 422, { error: "invalid_question_or_context" });
      if (error instanceof QuotaExceeded) {
        res.setHeader("Retry-After", "60");
        return respond(res, 429, { error: "quota_reached" });
      }
      return respond(res, 503, { error: "generation_unavailable" });
    }
  };
}
