import { createHmac, randomUUID } from "node:crypto";
import { get, put, BlobPreconditionFailedError } from "@vercel/blob";
export const STORE_ID = "store_etqnqyg3va5gtf18";
export const QUOTA_PATH = "quota/global-v1.json";
export class QuotaUnavailable extends Error {}
export class QuotaExceeded extends Error {}
export const LIMITS = Object.freeze({
  minute: 3,
  day: 20,
  month: 200,
  clientDay: 6,
});
const integer = (n) => Number.isSafeInteger(n) && n >= 0;
export function emptyState() {
  return {
    version: 1,
    instance: randomUUID(),
    revision: 0,
    month: "",
    monthly: 0,
    day: "",
    daily: 0,
    minute: "",
    minuteCount: 0,
    clients: {},
  };
}
export function validateState(s) {
  if (
    !s ||
    s.version !== 1 ||
    typeof s.instance !== "string" ||
    !integer(s.revision) ||
    !integer(s.monthly) ||
    !integer(s.daily) ||
    !integer(s.minuteCount) ||
    typeof s.month !== "string" ||
    typeof s.day !== "string" ||
    typeof s.minute !== "string" ||
    !s.clients ||
    Array.isArray(s.clients) ||
    typeof s.clients !== "object" ||
    Object.keys(s.clients).length > 250 ||
    Object.entries(s.clients).some(
      ([k, v]) => !/^[a-f0-9]{64}$/.test(k) || !integer(v),
    )
  )
    throw new QuotaUnavailable("Invalid counter");
  const keys = [
    "version",
    "instance",
    "revision",
    "month",
    "monthly",
    "day",
    "daily",
    "minute",
    "minuteCount",
    "clients",
  ];
  const initial =
    s.revision === 0 &&
    s.monthly === 0 &&
    s.daily === 0 &&
    s.minuteCount === 0 &&
    s.month === "" &&
    s.day === "" &&
    s.minute === "" &&
    Object.keys(s.clients).length === 0;
  const dates =
    /^\d{4}-(0[1-9]|1[0-2])$/.test(s.month) &&
    /^\d{4}-\d{2}-\d{2}$/.test(s.day) &&
    /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(s.minute) &&
    s.day.startsWith(s.month + "-") &&
    s.minute.startsWith(s.day + "T") &&
    new Date(s.day + "T00:00:00.000Z").toISOString().slice(0, 10) === s.day;
  if (
    Object.keys(s).length !== keys.length ||
    Object.keys(s).some((k) => !keys.includes(k)) ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
      s.instance,
    ) ||
    s.revision >= Number.MAX_SAFE_INTEGER ||
    s.monthly > s.revision ||
    s.daily > s.monthly ||
    s.minuteCount > s.daily ||
    Object.values(s.clients).reduce((sum, n) => sum + n, 0) !== s.daily ||
    (!initial &&
      (!dates || s.revision === 0 || !s.monthly || !s.daily || !s.minuteCount))
  )
    throw new QuotaUnavailable("Inconsistent counter");
  return s;
}
export function nextState(state, client, now, limits = LIMITS) {
  if (!/^[a-f0-9]{64}$/.test(client))
    throw new QuotaUnavailable("Invalid client digest");
  const s = structuredClone(validateState(state)),
    iso = new Date(now).toISOString(),
    month = iso.slice(0, 7),
    day = iso.slice(0, 10),
    minute = iso.slice(0, 16);
  // Never roll counters backwards if instance clocks disagree.
  if (s.day > day || s.month > month || s.minute > minute)
    throw new QuotaUnavailable("Clock mismatch");
  if (s.month !== month) {
    s.month = month;
    s.monthly = 0;
  }
  if (s.day !== day) {
    s.day = day;
    s.daily = 0;
    s.clients = {};
  }
  if (s.minute !== minute) {
    s.minute = minute;
    s.minuteCount = 0;
  }
  if (
    s.monthly >= limits.month ||
    s.daily >= limits.day ||
    s.minuteCount >= limits.minute ||
    (s.clients[client] || 0) >= limits.clientDay
  )
    throw new QuotaExceeded("Quota reached");
  s.monthly++;
  s.daily++;
  s.minuteCount++;
  s.clients[client] = (s.clients[client] || 0) + 1;
  s.revision++;
  return s;
}
export function clientHash(ip, salt) {
  if (!salt || salt.length < 32)
    throw new QuotaUnavailable("Missing quota salt");
  return createHmac("sha256", salt)
    .update(String(ip).slice(0, 100))
    .digest("hex");
}
export function blobConfigured(env = process.env) {
  const id = env.BLOB_STORE_ID;
  const token = env.BLOB_READ_WRITE_TOKEN;
  if (id && id !== STORE_ID) return false;
  if (token) return token.split("_")[3] === STORE_ID.slice(6);
  return id === STORE_ID;
}
export function productionStore() {
  if (!blobConfigured()) throw new QuotaUnavailable("Dedicated store missing");
  const auth = {
    storeId: STORE_ID,
    ...(process.env.BLOB_READ_WRITE_TOKEN
      ? { token: process.env.BLOB_READ_WRITE_TOKEN }
      : {}),
  };
  return {
    async read(path, signal) {
      const result = await get(path, {
        ...auth,
        access: "private",
        useCache: false,
        abortSignal: signal,
      });
      if (!result || result.statusCode !== 200 || result.blob.size > 65536)
        throw new QuotaUnavailable("Counter unavailable");
      const reader = result.stream.getReader();
      let bytes = 0,
        parts = [];
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.length;
          if (bytes > 65536) throw new QuotaUnavailable("Counter too large");
          parts.push(value);
        }
      } finally {
        await reader.cancel();
      }
      return {
        state: validateState(JSON.parse(Buffer.concat(parts).toString("utf8"))),
        etag: result.blob.etag,
      };
    },
    async write(path, state, etag, signal) {
      if (!etag) throw new QuotaUnavailable("Missing ETag");
      return put(path, JSON.stringify(state), {
        ...auth,
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
        ifMatch: etag,
        abortSignal: signal,
      });
    },
    async create(path, state, signal) {
      return put(path, JSON.stringify(state), {
        ...auth,
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: false,
        contentType: "application/json",
        abortSignal: signal,
      });
    },
    isConflict: (error) => error instanceof BlobPreconditionFailedError,
  };
}
export async function reserveQuota({
  client,
  store = productionStore(),
  path = QUOTA_PATH,
  limits = LIMITS,
  now = Date.now(),
  signal = AbortSignal.timeout(7000),
}) {
  for (let attempt = 0; attempt < 4; attempt++) {
    signal.throwIfAborted();
    const { state, etag } = await store.read(path, signal);
    const next = nextState(state, client, now, limits);
    try {
      await store.write(path, next, etag, signal);
      return {
        revision: next.revision,
        remainingToday: limits.day - next.daily,
      };
    } catch (error) {
      if (!store.isConflict(error))
        throw new QuotaUnavailable("Counter write failed");
    }
  }
  throw new QuotaUnavailable("Concurrent counter contention");
}
// Only the authenticated operator verification route may initialize a missing counter.
export async function initializeQuota(
  store = productionStore(),
  path = QUOTA_PATH,
) {
  const signal = AbortSignal.timeout(7000);
  try {
    await store.read(path, signal);
    return false;
  } catch {}
  try {
    await store.create(path, emptyState(), signal);
    return true;
  } catch {
    await store.read(path, signal);
    return false;
  }
}
