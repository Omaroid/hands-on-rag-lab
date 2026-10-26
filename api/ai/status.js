import { ready } from "../../server/config.js";
import { productionStore, QUOTA_PATH } from "../../server/quota.js";
import { respond } from "../../server/http.js";
export default async function handler(req, res) {
  if (req.method !== "GET") return respond(res, 405, { ready: false });
  if (!ready())
    return respond(res, 200, {
      ready: false,
      reason: "configuration_or_quota_unavailable",
    });
  try {
    await productionStore().read(QUOTA_PATH, AbortSignal.timeout(5000));
    return respond(res, 200, { ready: true });
  } catch {
    return respond(res, 200, {
      ready: false,
      reason: "durable_quota_unavailable",
    });
  }
}
