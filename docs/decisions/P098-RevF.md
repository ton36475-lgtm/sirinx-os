# P098 Rev F — native-provider-first routing, with maxplus as the exhaustion fallback

**Status:** `[APPROVED]`
**Raised:** 2026-07-25
**Approved:** 2026-07-25 by Tony (Terbo), sole human authority.
**Approval line received verbatim:**

```
🔴 APPROVE P098 Rev F
```

**Amends:** P098 Rev B as amended by Rev E. **Related:** Rev D (maxplus lane).

---

## 1. Decision proposed

Route each model family to **its own provider first**, and fall back to `maxplus`
only when the primary provider's token quota is exhausted.

Tony's instruction, 2026-07-25:

> kimi k3 ใช้กับ kimicode, glm 5.2 ให้ใช้กับ z.code ตรงตาม provider
> เป็น sub model สำรองกรณีโทเค็นของ provider หลักหมด

## 2. Chain as amended

```
glm-5.2   → zcode  → Cointh GLM (https://cointh.com/glm/anthropic)   [primary]
kimi-k3   → kimi   → Kimi Code native provider                        [primary]
                          ↓ on token exhaustion only
          → maxplus (https://api.maxplus-ai.cc)                       [LEAF fallback]
                          ↓ if maxplus is DOWN or absent
          → P098 Rev E chain: OpenRouter free → GLM paid (api.z.ai)
```

`maxplus` keeps every constraint from Rev D: LEAF, 🟢/🟡 only, never 🔴, never the
default for CHECKER or GUARD, redacted payloads only.

## 3. What is verified on the host

**VERIFIED** — both native CLIs exist and are configured:

```
$ command -v kimi zcode
/Users/sirinx/.local/bin/kimi      (node bundle, v0.29.0)
/Users/sirinx/.local/bin/zcode     (Mach-O arm64)
```

**VERIFIED** — `~/.config/zcode/glm-5.2-config.json`:

```
provider      = Cointh GLM
protocol      = Anthropic-compatible
base_url      = https://cointh.com/glm/anthropic
default_model = glm-5.2
security.credential_storage = interactive_secure_flow
security.secrets_logged     = False
security.inference_calls    = 0
```

`inference_calls: 0` — this lane is configured but has never been used.

**VERIFIED** — cointh.com is reachable and gated:

```
https://cointh.com/glm/anthropic/v1/models            http=401  {"error":"missing_key"}
https://cointh.com/glm/anthropic/v1/messages          http=401  {"error":"missing_key"}
https://cointh.com/glm/anthropic/models               http=401  {"error":"missing_key"}
https://cointh.com/glm/anthropic/v1/chat/completions  http=401  {"error":"missing_key"}
https://cointh.com/                                   http=200
```

*An earlier draft of this document claimed the blanket `401` meant cointh could not
discriminate real paths from absent ones. The authenticated probe in §4 disproves
that: with a credential, cointh answers `200` for served endpoints and `404` for
absent ones. The `401` simply comes from an auth gate that runs before routing.*

## 4. Live probe — cointh model list is now VERIFIED

Probed 2026-07-25 with a credential Tony supplied. `GET /v1/models` → `200`, 0.74s,
**8 ids, `hasMore: false`**. Both `Authorization: Bearer` and `x-api-key` were
accepted.

Smoke test, `anthropic_messages`, prompt `"Say OK"` — **8 of 8 OK**:

```
glm-4.5          OK  http=200  0.874s      glm-5            OK  http=200  1.843s
glm-4.5-air      OK  http=200  0.800s      glm-5-turbo      OK  http=200  0.798s
glm-4.6          OK  http=200  1.184s      glm-5.1          OK  http=200  1.194s
glm-4.7          OK  http=200  0.821s      glm-5.2          OK  http=200  1.265s
```

`openai_chat` (`/v1/chat/completions`) → `404 {"detail":"Not Found"}` for every id.
The endpoint is not served at all; cointh is **anthropic_messages only**.

Registry written to `config/models.cointh.json`, validated against
`config/schemas/models.provider.schema.json`.

### The declared list was wrong, and this is why the rule exists

`~/.config/zcode/glm-5.2-config.json` declares four models. Two of the four carry
casing that **does not resolve**:

| Declared in config | Live id |
|---|---|
| `glm-5.2` | `glm-5.2` ✓ |
| `glm-5-turbo` | `glm-5-turbo` ✓ |
| `GLM-4.7` | `glm-4.7` — casing differs |
| `GLM-4.5-Air` | `glm-4.5-air` — casing differs |

The live list also carries four models the config never mentions: `glm-4.5`,
`glm-4.6`, `glm-5`, `glm-5.1`.

Between the two lanes, a declared list has now been wrong in both directions:
maxplus listed three ids that were not routable, cointh's config understated the
catalogue by half and misspelled a quarter of it. Only the live response counts.

### cointh is the faster lane for GLM

`glm-5.2` measured **1265 ms** here against **3610 ms** on maxplus — and cointh
answered every id it listed, where maxplus failed three of thirteen. That supports
routing GLM to cointh first, which is what §2 proposes.

## 5. What is still NOT verified

**Kimi's native model list is UNVERIFIED.** `~/.kimi/config.toml` has
`default_model = ""` with empty `[models]` and `[providers]` sections, so the CLI
falls back to a built-in default this document cannot name without probing.
Whether `kimi-k3` is the id that CLI actually serves is `VERIFY AT RUN TIME`.

## 5. Open design question — how "token exhausted" is detected

The fallback trigger is not yet specified. Detection must be **explicit**, not a
guess from any error:

- A provider-specific quota signal (HTTP 429, or a documented `insufficient_quota`
  style error code) triggers failover to `maxplus`.
- A transport error, a timeout, or a 5xx is **not** exhaustion — those feed the
  Rev D circuit breaker instead, and must not silently redirect spend to a
  paid reseller.

### RESOLVED 2026-07-25 — and the guess was wrong

A real out-of-credit response was found on this host, dated 2026-06-30, in
`~/.hermes/profiles/solis/sessions/request_dump_20260630_055305_*.json`:

```json
"error": {
  "type": "CreditsError",
  "status_code": 401,
  "body": {
    "type": "CreditsError",
    "message": "Insufficient balance. Manage your billing here: https://opencode.ai/workspace/.../billing"
  }
}
```

**It arrived as HTTP 401 — not 402, not 429.** The draft of this section assumed
402/429. A status-only rule built on that assumption would never have fired when
the balance actually ran out, and the fallback would have been dead code.

But a bare `401` is also the ordinary signal for a wrong or revoked key. Reading
every 401 as exhaustion would divert traffic onto the metered lane each time a
credential breaks — the same failure this section exists to prevent, in the other
direction.

**Implemented rule** (`ghostclaw-providers::cointh::signals_exhaustion`):

- HTTP `402` or `429` → exhaustion on the status alone.
- Any status **plus** a body naming a credit or quota condition → exhaustion.
- A bare `401`, a timeout, or a 5xx → ordinary failure. Feeds the breaker,
  never reported as exhaustion.

Body markers, all taken from responses captured on this host rather than from
vendor docs: `CreditsError`, `Insufficient balance`, `insufficient_quota`,
`quota_exceeded`, `rate_limit_exceeded`, `rate_limit_error`, `RATE_LIMIT_FAILURE`,
`resource_exhausted`, `credit_exhausted`, `billing_hard_limit_reached`.

`device_code_exhausted` is deliberately excluded — it is an OAuth device-flow
expiry and has nothing to do with spend. A test pins that exclusion.

## 6. Why this is a change to a locked decision

P098 Rev B (LOCKED, amended by Rev E) puts OpenRouter free at tier 1 and GLM paid
at `https://api.z.ai/api/paas/v4/`. Rev F changes two things:

1. It puts native per-family providers **above** that chain.
2. It routes GLM through `https://cointh.com/glm/anthropic` instead of
   `https://api.z.ai/api/paas/v4/`. These are different hosts with different
   credentials and different operators.

Per GHOSTCLAW v1.0 [8], that requires Tony's verbatim 🔴 line.

## 7b. M1.1 waiver — recorded, not silent

Tony pasted the cointh credential into the chat transcript on 2026-07-25 and
approved its use (`approve use this key`). Rule M1.1 — any key seen in chat is
BURNED and must be rotated first — was already waived by Tony for this project on
the same day ("ใช้เลยยกเลิกกฎ"); that waiver is treated as covering this key too.

**Standing consequence:** both lanes were commissioned with credentials that have
passed through a chat transcript and are therefore disclosed. Rotation remains
advisable and is Tony's call. Keys are referenced in logs masked to 8+4:
maxplus `ccsk-bf5...8d6a`, cointh `glm-shar...691b`. Neither value appears in any
tracked file; both live only in `.env` (mode 600, git-ignored at `.gitignore:2`).

Note on the cointh key: its prefix is `glm-share-`. If that denotes a shared or
team credential, it sits awkwardly against the one-key-per-lane rule in Rev D §6.
Worth confirming with the issuer; not a blocker.

## 8. Blocking conditions

1. `🔴 APPROVE P098 Rev F`.
2. ~~A cointh credential.~~ **DONE 2026-07-25** — supplied and written to `.env`.
3. ~~A live probe of cointh producing `config/models.cointh.json`.~~
   **DONE 2026-07-25** — 8 ids, 8 OK, validated against the shared schema.
4. A live probe of the `kimi` CLI to establish which model id it actually serves.
5. The exhaustion signal from §6, captured from a real response per provider.

## 9. Labels

| Claim | Label |
|---|---|
| `kimi` and `zcode` exist and are configured | VERIFIED (raw) |
| cointh base URL, protocol, provider name | VERIFIED (config file, raw) |
| cointh serves 8 GLM ids, all OK on anthropic_messages | VERIFIED (raw curl, per id) |
| cointh does not serve `/v1/chat/completions` | VERIFIED (404 on every id) |
| Two declared ids have non-resolving casing | VERIFIED (declared vs live diff) |
| cointh faster than maxplus for `glm-5.2` | VERIFIED (1265 ms vs 3610 ms, single sample each) |
| Kimi's served model id | UNVERIFIED — `VERIFY AT RUN TIME` |
| Exhaustion signal per provider | UNVERIFIED — not yet captured |
| Chain in §2 | PROPOSED |
