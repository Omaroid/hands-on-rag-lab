import { ready } from "../../server/config.js";
import { respond } from "../../server/http.js";
export default function handler(req, res) {
  if (req.method !== "GET") return respond(res, 405, { ready: false });
  return respond(res, 200, { ready: ready() });
}
