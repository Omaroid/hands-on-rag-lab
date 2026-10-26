# Server-side NVIDIA inference — prepared, not activated

The requested API usage is **inference**, not training or fine-tuning. This change replaces
the local browser model in the prepared code with a same-origin server API. It does not
upload a training dataset or launch a training job.

## Security and request flow

1. The browser searches the corpus as before and requests consent for forwarding the question
   and evidence to NVIDIA. It never receives an API key, model weights or provider URL.
2. POST `/api/ai/answer` accepts a strict question schema and explicit consent. It rejects
   browser-provided contexts, prompts, model overrides and extra fields.
3. The server checks disabled-by-default policy gates and reserves an atomic quota **before**
   retrieval or any inference request. It recomputes evidence on the server and refuses a
   question without citations. The existing serverless guard is unchanged.
4. The adapter uses the fixed destination `https://integrate.api.nvidia.com/v1/responses`
   and model `openai/gpt-oss-20b`, based on the owner's provided Responses example.
   It uses the existing httpx dependency rather than adding an SDK with implicit retries.
   Output is capped at 1,024 tokens and 6,000 characters; response bodies at 128 KiB.
   Redirects, retries and tools are disabled. The endpoint has a 35-second overall timeout.
5. Provider errors are replaced with generic messages. The authorization header is not put
   in the prompt, returned to clients or logged by this code. A response containing the
   configured credential is rejected. Model text is rendered as text, not HTML.
6. The UI displays generated text separately from verified source excerpts. Citation markers
   are not a claim of factual entailment. Stopping the browser request does not guarantee
   cancellation at the provider; requests are not automatically retried or refunded.

`store: false` is requested from the provider. This is not evidence about NVIDIA's actual
retention/training policy; those terms must be reviewed before activation.

## Requirements before activation

- Revoke the credential exposed in chat. This task has not used it, stored it or attempted
  to rotate it. Its value must never be copied into the repository or browser environment.
- Provision a replacement as `NVIDIA_API_KEY` through secure server-side secret configuration.
  Never use a `VITE_*` variable. The task currently has no such secret binding.
- Add `integrate.api.nvidia.com` and relevant NVIDIA documentation domains to the supported
  task network configuration. They are absent from the attached policy. Public documentation
  and model-catalog probes were unsuccessful; no generation probe was made.
- Verify the current model/Responses API contract, account eligibility, free allowance,
  cutoff behavior, expiry and payment/overage conditions. These are **unverified**. The
  provided example and mocked tests do not establish live API support or free availability.
- Deploy a server backend for the dedicated project. The currently published site is static;
  adding a secret to Vercel alone does not create a backend route.
- Connect and test a free durable atomic global limiter before public serverless activation.
  Local SQLite is valid for one durable host only. No bypass or attestation flag opens the
  existing Vercel/serverless guard. No other project's store may be reused.
- Only after those checks may the operator set `NVIDIA_INFERENCE_ENABLED=true` and
  `NVIDIA_FREE_TIER_CONFIRMED=true`. These are explicit operator policy declarations, **not**
  technical proof of free credits or of a strict zero-euro bill. They do not bypass quotas.

Until then GET `/api/ai/status` returns `ready: false` and the UI keeps generation disabled.
The production site has not been redeployed by this change. No credits, payment method,
auto-recharge or plan changes were made.

## Verification

96 offline Python tests and 14 browser tests pass. Provider responses in tests are simulated;
there was **no authenticated NVIDIA request or live model response**. The tests cover consent,
recomputed evidence, quota ordering, missing configuration, serverless closure, malicious
redirects, error sanitization, incomplete/oversized output and accidental credential echoes.
The browser tests cover unavailable service, consent, a simulated response and simulated
failure, in addition to the existing accessibility and search journeys.

Ruff, mypy, the TypeScript/Vite build, frontend credential-signature checks and dependency
audits pass. The browser-model dependency and worker were removed, and the frontend CSP
was restored to same-origin connections without WASM permissions.

The owner reports that NVIDIA inference is free and has no usage limit. Recorded as an
operator report, not contradicted by an observed provider quota. No provider quota was
queried or discovered. The application's existing anti-abuse limits are separate and remain
in place; the original instruction to keep the serverless guard closed has not been removed.
Attached configuration revision 12 is enforced and still has zero NVIDIA secret bindings
and zero NVIDIA egress hosts.
