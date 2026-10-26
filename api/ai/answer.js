// No provider call, secret access or request-body parsing while the global gate is closed.
export default function handler(_req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.status(503).json({ error: "generation_unavailable" });
}
