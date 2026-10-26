// Fail closed until a free durable atomic global quota store is connected and tested.
export default function handler(_req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ ready: false, reason: "durable_quota_unavailable" });
}
