import test from "node:test";
import assert from "node:assert/strict";
import { createAnswerHandler } from "../server/answer-handler.js";
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
test("route validates consent and context before provider", async () => {
  let calls = 0;
  const handler = createAnswerHandler({
    isReady: () => true,
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
test("valid requests are never capped by application request counts", async () => {
  let calls = 0;
  const handler = createAnswerHandler({
    isReady: () => true,
    generate: async () => {
      calls++;
      return { answer: "25 days [1]." };
    },
  });
  for (let i = 0; i < 25; i++) {
    const out = res();
    await handler(req(question()), out);
    assert.equal(out.statusCode, 200);
  }
  assert.equal(calls, 25);
});
test("closed policy does not parse input or call provider", async () => {
  let calls = 0;
  const handler = createAnswerHandler({
    isReady: () => false,
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
