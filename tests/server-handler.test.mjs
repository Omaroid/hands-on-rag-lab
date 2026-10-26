import test from "node:test";
import assert from "node:assert/strict";
import { createAnswerHandler } from "../server/answer-handler.js";
import { QuotaExceeded } from "../server/quota.js";
const question = () => ({
  question: "How many days of leave?",
  language: "en",
  consent: true,
  passages: [
    { id: "1", file: "guide.pdf", page: 1, text: "25 days of leave." },
  ],
});
const req = (body) => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body,
  socket: { remoteAddress: "192.0.2.10" },
});
function res() {
  return {
    headers: {},
    setHeader(k, v) {
      this.headers[k] = v;
    },
    status(n) {
      this.statusCode = n;
      return this;
    },
    json(v) {
      this.body = v;
      return this;
    },
  };
}
process.env.RAG_QUOTA_SALT = "test-only-salt-".repeat(4);
test("route validates consent and context before quota or provider", async () => {
  let calls = 0;
  const handler = createAnswerHandler({
    isReady: () => true,
    reserve: () => calls++,
    generate: () => calls++,
  });
  for (const bad of [
    { ...question(), consent: false },
    { ...question(), model: "other" },
  ]) {
    const out = res();
    await handler(req(bad), out);
    assert.equal(out.statusCode, 422);
  }
  assert.equal(calls, 0);
});
test("quota reservation precedes the only provider call", async () => {
  const order = [];
  const handler = createAnswerHandler({
    isReady: () => true,
    reserve: async () => order.push("quota"),
    generate: async () => {
      order.push("provider");
      return { answer: "25 days [1]." };
    },
  });
  const out = res();
  await handler(req(question()), out);
  assert.deepEqual(order, ["quota", "provider"]);
  assert.equal(out.statusCode, 200);
});
test("exceeded or unavailable durable quotas never contact NVIDIA", async () => {
  for (const error of [
    new QuotaExceeded("limit"),
    new Error("private storage details"),
  ]) {
    let calls = 0;
    const handler = createAnswerHandler({
      isReady: () => true,
      reserve: async () => {
        throw error;
      },
      generate: () => calls++,
    });
    const out = res();
    await handler(req(question()), out);
    assert.equal(out.statusCode, error instanceof QuotaExceeded ? 429 : 503);
    assert.equal(calls, 0);
    assert.equal(JSON.stringify(out.body).includes("private storage"), false);
  }
});
test("closed policy does not parse input or reserve quota", async () => {
  let calls = 0;
  const handler = createAnswerHandler({
    isReady: () => false,
    reserve: () => calls++,
    generate: () => calls++,
  });
  const out = res();
  await handler(req("bad JSON"), out);
  assert.equal(out.statusCode, 503);
  assert.equal(calls, 0);
});
test("diagnostic fields never include provider messages, body, IP or credentials", async () => {
  const events = [];
  const handler = createAnswerHandler({
    isReady: () => true,
    reserve: async () => {},
    generate: async () => {
      throw new Error("private text and key");
    },
    report: (e) => events.push(e),
  });
  const out = res();
  await handler(req(question()), out);
  assert.equal(events.length, 1);
  assert.equal(events[0].stage, "provider");
  assert.equal(events[0].code, "unexpected");
  assert.equal(events[0].requestId, out.headers["X-Request-ID"]);
  assert.equal(JSON.stringify(events).includes("private text"), false);
  assert.equal(JSON.stringify(events).includes("192.0.2.10"), false);
});
