export function ready(env = process.env) {
  return (
    env.RAG_PUBLIC_GENERATION === "true" &&
    typeof env.NVIDIA_API_KEY === "string" &&
    !!env.NVIDIA_API_KEY &&
    !/[\[\]]/.test(env.NVIDIA_API_KEY)
  );
}
