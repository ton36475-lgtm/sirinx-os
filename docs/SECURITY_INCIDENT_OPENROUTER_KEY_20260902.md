# Security Incident — Exposed OpenRouter Application Key

Incident ID: `SEC-OPENROUTER-KEY-EXPOSED-20260902`  
State: `ROTATION_REQUIRED / PROVIDER_ACTIVATION_BLOCKED`

## Scope

A credential matching an OpenRouter application-key format was included in an
operator chat. The value is intentionally omitted from this file and must not be
copied into issues, commits, screenshots, logs, model prompts, receipts, or
training datasets.

## Required human response

1. Revoke/delete the exposed key in the OpenRouter workspace.
2. Review activity, model usage, spend, source metadata, and unexpected calls.
3. Create a replacement key.
4. Apply a small spending limit and a descriptive environment-specific name.
5. Store it in the approved secret facility.
6. Update only secret references used by the gateway.
7. Run one negative-auth test with the old key and one bounded canary with the
   new key.
8. Record key hashes/fingerprints only; never record secret values.
9. Search repositories, logs, screenshots, chat exports, and shell history for
   accidental copies.
10. Close this incident only after the old key is rejected and the new route has
    an action-bound canary receipt.

## Blocks

Until closed:

- OpenRouter provider calls;
- `openrouter/free` activation;
- explicit `:free` model activation;
- OpenRouter BYOK setup;
- automatic provider catalog refresh using the exposed credential;
- inclusion of the key in DSH, jcode, AutoClaw, LiteLLM, OmniRoute, 9Router,
  Serena, or tunnel-client configuration.

## Replacement-key policy

- one key per environment/application;
- minimum necessary spend limit;
- no client-side/browser embedding;
- no plaintext `.env` committed to Git;
- no key forwarding into local model prompts;
- no automatic fallback that hides which key/provider was used;
- usage receipt records key ID/hash, route, actual model, token count, and cost,
  but never the key value.
