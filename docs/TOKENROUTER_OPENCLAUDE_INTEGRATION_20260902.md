# TokenRouter + OpenClaude integration decision — PC Node

Snapshot: 2026-09-02  
State: `HOLD / CREDENTIAL_ROTATION_REQUIRED / NO LIVE CALL`

## Confirmed TokenRouter contract

The public TokenRouter model catalog currently exposes the OpenAI-compatible base URL:

```text
https://api.tokenrouter.com/v1
```

For chat-completions clients the effective request is:

```text
POST https://api.tokenrouter.com/v1/chat/completions
Authorization: Bearer <secret-facility-value>
Content-Type: application/json
```

The exact catalog IDs reconciled for this pack are:

| User input | Canonical TokenRouter ID | Catalog billing snapshot | Decision |
|---|---|---:|---|
| `z-ai/glm-5.3-free` | `z-ai/glm-5.3-free` | free | public-data canary only |
| `glm-5.3-flash` | `z-ai/glm-5.3-flash` | paid | budget-gated canary |
| `qwen3.8-flash` | `qwen/qwen3.8-flash` | paid | budget-gated canary |
| `qwen3.8-max-free` | `qwen/qwen3.8-max-free` | free | public-data canary only |

`qwen3.8-flash` without the `qwen/` namespace is not the canonical TokenRouter ID in the current catalog. The free Qwen 3.8 entry observed in TokenRouter is `qwen/qwen3.8-max-free`; `qwen/qwen3.8-flash` is currently a priced catalog entry. Prices are snapshots and must be re-read immediately before a billable approval.

## Security incident

A TokenRouter-compatible API key was pasted into chat. It is treated as compromised. This branch deliberately does not contain the value and no request was sent with it.

Required sequence:

```text
REVOKE EXPOSED KEY
→ REVIEW USAGE / BILLING / IP METADATA
→ CREATE NEW SCOPED KEY WITH LOW LIMIT
→ STORE THROUGH SECRET FACILITY
→ PROVE OLD KEY IS REJECTED
→ PRINT CANARY DIGEST
→ ACTION-BOUND PUBLIC-DATA CANARY
```

A natural-language statement granting broad permission does not reactivate a compromised credential.

## Routing ownership

TokenRouter describes multi-channel fallback as a gateway feature. Therefore it is not placed behind LiteLLM, OmniRoute, OpenRouter, or 9Router while any of those components owns retries/fallbacks.

```text
Hermes
→ GhostClaw policy
→ TOKENROUTER_BROKER lane
→ TokenRouter
→ exact model ID
→ checker
→ receipt
```

Rules:

- `retry_owner = TOKENROUTER`
- outer retries = `0`
- no nested router
- initial data class = `public`
- free model does not imply SLA
- actual provider/model/cost must be captured from observable response or billing metadata
- ambiguous timeout after a consequential request becomes `UNKNOWN_RESULT`; no automatic replay

## TokenRouter data boundary

TokenRouter publishes Zero Data Retention claims, but its DPA says ZDR may depend on account/endpoint eligibility and does not automatically control the selected upstream model provider. Until account settings and the upstream provider's policy are verified, this pack admits public data only.

## B.AI claim

The supplied video summary says B.AI offers Qwen 3.8 Flash free. Current research found secondary reporting of a promotional/API-community offer, but no authoritative API base URL, exact authentication contract, rate-limit policy, expiry, retention policy, or official account-visible catalog was established in this change.

Status:

```text
B.AI = UNVERIFIED_SECONDARY_ONLY
NO ROUTE
NO KEY
NO CANARY
```

## OpenClaude decision

`Gitlawb/openclaude` advertises OpenAI-compatible providers, Bash/file tools, agents, tasks, MCP, web tools, background sessions, and a headless gRPC service. Its repository license also states that the underlying code is derived from proprietary Claude Code, remains subject to Anthropic copyright, and is distributed without Anthropic authorization.

Therefore:

```text
SOURCE_STATE = QUARANTINED_LEGAL_PROVENANCE_REVIEW
INSTALL_ALLOWED = false
REFERENCE_ONLY = true
```

Even after a legal/source decision, OpenClaude would remain a client rather than a router:

```text
OpenClaude
→ http://127.0.0.1:4000/v1
→ model alias sirinx-code
```

Direct TokenRouter credentials, per-agent provider routing, background sessions, gRPC, unrestricted Bash/write, web scraping, and MCP writes remain disabled in the pilot.

## Safe canary contract

The first live TokenRouter call may only occur after rotation and must bind:

```yaml
action: TOKENROUTER_PUBLIC_CANARY
base_url: https://api.tokenrouter.com/v1
model: z-ai/glm-5.3-free
data_class: public
prompt_sha256: <digest>
max_input_tokens: 64
max_output_tokens: 16
max_cost_usd: 0
retry_owner: TOKENROUTER
outer_retries: 0
max_uses: 1
expires_at: <future ISO-8601>
```

Expected output content should be deterministic and non-sensitive. Store status, latency, usage, selected model/provider metadata, normalized error class, and output digest. Do not store the key, authorization header, raw provider error body, or unnecessary prompt content.

## Validation command

```text
node --test services/dev-control-api/src/tokenrouter-provider-pack.test.mjs
```

This test is local/static and does not make network requests.
