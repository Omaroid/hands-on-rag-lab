// Temporary operator-only verification route. No client-controlled paths, limits or provider calls.
import {
  operatorAuthorized,
  readJSON,
  respond,
  RequestError,
} from "../../server/http.js";
import {
  STORE_ID,
  productionStore,
  initializeQuota,
  reserveQuota,
  clientHash,
  QUOTA_PATH,
  QuotaExceeded,
} from "../../server/quota.js";
const PROBE = "verification/cas-probe-v1.json";
export default async function handler(req, res) {
  if (!operatorAuthorized(req))
    return respond(res, 404, { error: "not_found" });
  try {
    const body = await readJSON(req, 256);
    const store = productionStore();
    if (Object.keys(body).length !== 1)
      return respond(res, 422, { error: "invalid_request" });
    if (body.action === "initialize") {
      await initializeQuota(store);
      await initializeQuota(store, PROBE);
      return respond(res, 200, { store: STORE_ID, initialized: true });
    }
    if (body.action === "probe") {
      await reserveQuota({
        client: clientHash("operator-probe", process.env.RAG_QUOTA_SALT),
        store,
        path: PROBE,
        limits: { minute: 3, day: 3, month: 3, clientDay: 3 },
      });
      return respond(res, 200, { reserved: true });
    }
    if (body.action === "inspect") {
      const { state } = await store.read(PROBE, AbortSignal.timeout(7000));
      const { state: global } = await store.read(
        QUOTA_PATH,
        AbortSignal.timeout(7000),
      );
      return respond(res, 200, {
        probeCount: state.monthly,
        probeRevision: state.revision,
        globalCount: global.monthly,
        store: STORE_ID,
      });
    }
    return respond(res, 422, { error: "invalid_request" });
  } catch (error) {
    if (error instanceof QuotaExceeded)
      return respond(res, 429, { error: "quota_reached" });
    if (error instanceof RequestError)
      return respond(res, error.status, { error: "invalid_request" });
    return respond(res, 503, { error: "quota_verification_unavailable" });
  }
}
