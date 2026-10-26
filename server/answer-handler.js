import { randomUUID } from "node:crypto";
import { ready } from "./config.js";
import {
  validateQuestion,
  generateAnswer,
  InvalidRequest,
  ProviderUnavailable,
} from "./pdf-answer.js";
import { readJSON, respond, RequestError } from "./http.js";
export function createAnswerHandler({
  isReady = ready,
  generate = generateAnswer,
  report = (event) => console.warn(JSON.stringify(event)),
} = {}) {
  return async function handler(req, res) {
    if (!isReady())
      return respond(res, 503, { error: "generation_unavailable" });
    const requestId = randomUUID(),
      start = Date.now();
    let stage = "validation";
    res.setHeader("X-Request-ID", requestId);
    try {
      const question = validateQuestion(await readJSON(req));
      stage = "provider";
      const answer = await generate(question, {
        apiKey: process.env.NVIDIA_API_KEY,
      });
      return respond(res, 200, answer);
    } catch (error) {
      if (error instanceof RequestError)
        return respond(res, error.status, { error: "invalid_request" });
      if (error instanceof InvalidRequest)
        return respond(res, 422, { error: "invalid_question_or_context" });
      const details = error instanceof ProviderUnavailable ? error.details : {};
      report({
        event: "pdf_generation_failed",
        entryPoint: "pdf_answer",
        requestId,
        stage,
        code: error instanceof ProviderUnavailable ? error.code : "unexpected",
        durationMs: Date.now() - start,
        ...(Number.isInteger(details.httpStatus)
          ? { providerHttpStatus: details.httpStatus }
          : {}),
        ...(details.timeout === true ? { timeout: true } : {}),
        ...(["stop", "length", "tool_calls", "content_filter"].includes(
          details.finishReason,
        )
          ? { finishReason: details.finishReason }
          : {}),
        ...(Number.isInteger(details.toolCallCount)
          ? { toolCallCount: details.toolCallCount }
          : {}),
        ...(typeof details.roleValid === "boolean"
          ? { roleValid: details.roleValid }
          : {}),
      });
      return respond(res, 503, { error: "generation_unavailable" });
    }
  };
}
