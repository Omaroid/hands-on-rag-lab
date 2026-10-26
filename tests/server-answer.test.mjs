import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import {
  validateQuestion,
  parseAnswer,
  generateAnswer,
  InvalidRequest,
  ProviderUnavailable,
  ENDPOINT,
  MODEL,
} from "../server/pdf-answer.js";
import { readJSON, RequestError } from "../server/http.js";
import { ready } from "../server/config.js";
const body = () => ({
  question: "Combien de jours de conges ?",
  language: "fr",
  consent: true,
  passages: [
    {
      id: "1",
      file: "guide.pdf",
      page: 1,
      text: "Les salaries ont 25 jours de conges.",
    },
  ],
});
const completed = (
  text = '{"status":"supported","answer":"25 jours [1].","citations":[1]}',
  extra = {},
) =>
  new Response(
    JSON.stringify({
      choices: [
        {
          finish_reason: "stop",
          message: {
            role: "assistant",
            content: text,
            reasoning_content: "DO NOT EXPOSE",
            ...extra,
          },
        },
      ],
    }),
    { status: 200 },
  );
test("strict consent, source bounds and no model or URL overrides", () => {
  assert.equal(validateQuestion(body()).passages[0].page, 1);
  for (const b of [
    { ...body(), consent: false },
    { ...body(), model: "evil" },
    { ...body(), passages: [] },
    { ...body(), passages: [{ ...body().passages[0], page: 41 }] },
    {
      ...body(),
      passages: [{ ...body().passages[0], url: "https://example.com" }],
    },
    { ...body(), passages: [...body().passages, ...body().passages] },
  ])
    assert.throws(() => validateQuestion(b), InvalidRequest);
});
test("status and citation IDs are validated without trusting model sources", () => {
  assert.equal(
    parseAnswer(
      '{"status":"incomplete","answer":"25 jours [1], duree du contrat absente.","citations":[1]}',
      body().passages,
    ).citations[0].file,
    "guide.pdf",
  );
  for (const text of [
    "{}",
    '{"status":"supported","answer":"invented [8]","citations":[1]}',
    '{"status":"supported","answer":"answer","citations":[]}',
    '{"status":"absent","answer":"absent","citations":[1]}',
  ])
    assert.throws(
      () => parseAnswer(text, body().passages),
      ProviderUnavailable,
    );
});
test("one fixed provider call, structured answer, no tools or reasoning returned", async () => {
  let calls = 0;
  const answer = await generateAnswer(validateQuestion(body()), {
    apiKey: "test-only-placeholder",
    fetchImpl: async (url, options) => {
      calls++;
      assert.equal(url, ENDPOINT);
      assert.equal(options.redirect, "error");
      const data = JSON.parse(options.body);
      assert.equal(data.model, MODEL);
      assert.equal(data.max_tokens, 1024);
      assert.equal(data.tools, undefined);
      assert.equal(options.body.includes("test-only-placeholder"), false);
      return completed();
    },
  });
  assert.equal(calls, 1);
  assert.equal(answer.answer, "25 jours [1].");
  assert.equal(JSON.stringify(answer).includes("DO NOT EXPOSE"), false);
});
test("provider failure, redirects, secret echo, tool calls and oversized output never retry", async () => {
  for (const response of [
    new Response("private provider error", { status: 401 }),
    new Response("", {
      status: 302,
      headers: { location: "https://example.com" },
    }),
    completed("test-only-placeholder"),
    completed(undefined, { tool_calls: [{}] }),
    new Response("x".repeat(131073), { status: 200 }),
  ]) {
    let calls = 0;
    await assert.rejects(
      generateAnswer(validateQuestion(body()), {
        apiKey: "test-only-placeholder",
        fetchImpl: async () => {
          calls++;
          return response;
        },
      }),
      ProviderUnavailable,
    );
    assert.equal(calls, 1);
  }
});
test("actual streamed bytes are bounded without Content-Length", async () => {
  const req = Readable.from([Buffer.alloc(24001)]);
  req.method = "POST";
  req.headers = { "content-type": "application/json" };
  await assert.rejects(
    readJSON(req),
    (e) => e instanceof RequestError && e.status === 413,
  );
});
test("cross-origin and unexpected methods rejected before parsing", async () => {
  for (const [method, headers, code] of [
    ["GET", {}, 405],
    [
      "POST",
      { "content-type": "application/json", origin: "https://evil.example" },
      403,
    ],
    ["POST", { "content-type": "text/plain" }, 415],
  ])
    await assert.rejects(
      readJSON({ method, headers }),
      (e) => e.status === code,
    );
});
test("generation gate remains closed for missing policy, proxy placeholders and wrong store", () => {
  assert.equal(ready({}), false);
  assert.equal(ready({ NVIDIA_API_KEY: "[proxy]" }), false);
});
