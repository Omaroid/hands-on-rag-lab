import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyState,
  nextState,
  reserveQuota,
  QuotaExceeded,
  QuotaUnavailable,
  clientHash,
  blobConfigured,
  STORE_ID,
} from "../server/quota.js";
function memoryCAS() {
  let state = emptyState(),
    version = 0;
  return {
    read: async () => ({
      state: structuredClone(state),
      etag: String(version),
    }),
    write: async (_p, next, etag) => {
      if (etag !== String(version)) {
        const e = new Error();
        e.conflict = true;
        throw e;
      }
      state = next;
      version++;
    },
    isConflict: (e) => e.conflict,
    inspect: () => state,
  };
}
const client = clientHash("192.0.2.20", "a".repeat(32)),
  now = Date.parse("2026-10-26T10:00:00Z");
test("CAS under concurrent reservations never exceeds the global cap", async () => {
  const store = memoryCAS();
  const outcomes = await Promise.allSettled(
    Array.from({ length: 12 }, () =>
      reserveQuota({
        client,
        store,
        now,
        limits: { minute: 3, day: 3, month: 3, clientDay: 3 },
      }),
    ),
  );
  assert.equal(outcomes.filter((x) => x.status === "fulfilled").length, 3);
  assert.equal(store.inspect().monthly, 3);
  assert.equal(JSON.stringify(store.inspect()).includes("192.0.2.20"), false);
});
test("rollover, global monthly cap and client cap are independent", () => {
  const limits = { minute: 20, day: 20, month: 3, clientDay: 1 };
  let s = nextState(emptyState(), client, now, limits);
  assert.throws(() => nextState(s, client, now, limits), QuotaExceeded);
  s = nextState(s, clientHash("b", "a".repeat(32)), now, limits);
  s = nextState(s, client, now + 86400000, limits);
  assert.throws(
    () =>
      nextState(s, clientHash("c", "a".repeat(32)), now + 2 * 86400000, limits),
    QuotaExceeded,
  );
  assert.equal(
    nextState(s, client, Date.parse("2026-11-01T10:00:00Z"), limits).monthly,
    1,
  );
  assert.throws(
    () => nextState(s, client, now - 86400000, limits),
    QuotaUnavailable,
  );
});
test("no implicit counter creation and no write after corrupt/failed reads", async () => {
  let writes = 0;
  for (const read of [
    async () => {
      throw new Error("offline");
    },
    async () => ({ state: { version: 1 }, etag: "x" }),
  ])
    await assert.rejects(
      reserveQuota({
        client,
        now,
        store: { read, write: () => writes++, isConflict: () => false },
      }),
    );
  assert.equal(writes, 0);
});
test("conditional writes and contention are bounded", async () => {
  let writes = 0;
  await assert.rejects(
    reserveQuota({
      client,
      now,
      store: {
        read: async () => ({ state: emptyState(), etag: "stale" }),
        write: async () => {
          writes++;
          throw new Error();
        },
        isConflict: () => true,
      },
    }),
    QuotaUnavailable,
  );
  assert.equal(writes, 4);
});
test("only the dedicated blob store can be selected", () => {
  assert.equal(blobConfigured({ BLOB_STORE_ID: STORE_ID }), true);
  assert.equal(blobConfigured({ BLOB_STORE_ID: "store_other" }), false);
  assert.equal(
    blobConfigured({
      BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_etqnqyg3va5gtf18_test",
    }),
    true,
  );
  assert.equal(
    blobConfigured({ BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_other_test" }),
    false,
  );
});
test("invalid period fields and inconsistent totals fail closed without a write", async () => {
  const valid = nextState(emptyState(), client, now);
  let writes = 0;
  const invalid = [
    { ...valid, month: "" },
    {
      ...valid,
      day: "2026-02-31",
      month: "2026-02",
      minute: "2026-02-31T10:00",
    },
    { ...valid, daily: 2 },
    { ...valid, monthly: 0 },
    { ...valid, clients: {} },
    { ...valid, unexpected: 0 },
    { ...emptyState(), monthly: 1 },
  ];
  for (const state of invalid) {
    await assert.rejects(
      reserveQuota({
        client,
        now,
        store: {
          read: async () => ({ state, etag: "x" }),
          write: async () => writes++,
          isConflict: () => false,
        },
      }),
    );
  }
  assert.equal(writes, 0);
});
