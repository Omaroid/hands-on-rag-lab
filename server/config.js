import { blobConfigured, STORE_ID } from "./quota.js";
export function ready(env = process.env) {
  return (
    env.RAG_PUBLIC_GENERATION === "true" &&
    env.RAG_QUOTA_VERIFIED === STORE_ID + ":cas-v1" &&
    env.RAG_HOBBY_ONLY === "true" &&
    env.RAG_NVIDIA_FREE_CONFIRMED === "true" &&
    !!env.NVIDIA_API_KEY &&
    !/[\[\]]/.test(env.NVIDIA_API_KEY) &&
    typeof env.RAG_QUOTA_SALT === "string" &&
    env.RAG_QUOTA_SALT.length >= 32 &&
    blobConfigured(env)
  );
}
