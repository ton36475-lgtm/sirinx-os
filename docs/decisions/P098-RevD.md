# P098 Rev D — maxplus lane classification

**Status:** `[APPROVED]`
**Raised:** 2026-07-25
**Approved:** 2026-07-25 by Tony (Terbo), sole human authority.
**Approval line received verbatim:**

```
🔴 APPROVE P098 Rev D
```

**Author:** Claude Fable 5 (MAKER role — cannot self-approve, per GHOSTCLAW v1.0 [0])
**Supersedes:** nothing. **Extends:** P098 Rev B (LOCKED).

---

## 1. Decision proposed

Register a new provider lane `maxplus` (gateway `https://api.maxplus-ai.cc`, pool
"Chinese Model Specials Pool") as an **aggregator/reseller tier**, classified **LEAF**.

## 2. Why aggregator/reseller tier

Pool routing at this gateway is **opaque**: the provider selects the backing
upstream itself, and a pool can close, be emptied, or fail at any time without
notice. The lane therefore cannot carry deterministic routing guarantees.

## 3. Ruling (proposed)

- 🟢 GREEN / 🟡 YELLOW workloads only. **Never 🔴.**
- **Redacted data only** — egress redaction gate mandatory (see §5).
- **Outside** the deterministic router of P098 Rev B.
- **LEAF tier always** — when `maxplus` fails, the system must continue via
  P098 Rev B unaided.
- Never the default for CHECKER or GUARD. Usable as MAKER / draft only.
- Never the sole evidence source for CHECKER/GUARD.

## 4. P098 Rev B — quoted verbatim from GHOSTCLAW v1.0 [3] (LOCKED)

> P098 Rev B (LOCKED): tiered LLM routing = sovereign Ollama (localhost:11434)
> → OpenRouter free (https://openrouter.ai/api/v1) → paid frontier / GLM
> (https://api.z.ai/api/paas/v4/ — NOT /api/openai/v1, that 404s).

`maxplus` attaches **below** this chain as a leaf. It does not displace any tier.

## 5. Egress redaction gate (LOCKED on this lane)

Before any payload leaves for the gateway, block on regex match:
`.env`, `cert.pem`, `*.pem`, any token value, SIRINX customer data, LINE OA data.
On match → **drop request + log `DENIED`**. No retry.

Rationale: all traffic transits a third party. Treat every prompt and every line
of code sent through this lane as **already disclosed**.

## 6. Operational limits

- Circuit breaker: 3 consecutive fail/timeout on a pool → mark `DOWN` for 10 min.
- Timeouts: connect 10s / total 120s. Max 1 retry. Never retry an aborted 🟡 task.
- 1 API key per lane. Budget cap required. No auto-topup. No automatic billing binding.
- Every call writes a hash-chained receipt: `model_id, pool, tokens, latency, outcome`.

## 7. Prior incident on record — READ BEFORE APPROVING

`evidence/MODEL_DRIFT_DEEP_ANALYSIS_V1.md` (dated 2026-07-18) records that cron
jobs created under `glm-5.2 (maxplus-chinese)` drifted against the global model
config and **9 cron jobs auto-paused**, including `loop-engineering-v4`,
`health-check-v4`, and `self-evolution-v4`.

Raw quote from that document:

> `RuntimeError: Skipped to prevent unintended spend: global inference config
> drifted since this job was created (model 'glm-5.2' -> 'kimi-k3'), and this
> job is unpinned.`

**Implication:** routing GhostClaw automation through this lane has already
halted the autonomous loop once. Any job using `maxplus` MUST pin its model
explicitly. This incident is the primary justification for LEAF classification.

## 8. Unresolved dependency

This decision was requested to "use the same ruling as Qoder (P098 Rev C)".
**P098 Rev C could not be located** — it is not in the GHOSTCLAW v1.0 skill and
not present anywhere under `/Users/sirinx/sirinx-os`. This document therefore
derives its ruling from P098 Rev B (quoted above) plus the §7 incident, **not**
from Rev C. If Rev C exists and says something different, this document must be
revised before approval.

## 9. Labels

| Claim | Label |
|---|---|
| P098 Rev B text quoted in §4 | VERIFIED (GHOSTCLAW v1.0 skill, verbatim) |
| §7 incident and quoted RuntimeError | VERIFIED (raw file on disk) |
| P098 Rev C absent from host | UNVERIFIED-ABSENT (searched, not found) |
| Classification in §3 | APPROVED 2026-07-25 (verbatim line received) |
| Gateway model list | NOT YET PROBED — `VERIFY AT RUN TIME` (gate M2) |

## 10. Blocking conditions before implementation

1. ~~Tony types `🔴 APPROVE P098 Rev D` verbatim.~~ **DONE 2026-07-25.**
2. `MAXPLUS_API_KEY` issued fresh and written to `.env` by Tony directly — never pasted into chat.
   **Partially done 2026-07-25:** `.env` scaffold created (mode 600, git-ignored via
   `.gitignore:2`) with `MAXPLUS_BASE_URL` set and `MAXPLUS_POOL` / `MAXPLUS_API_KEY`
   left empty. `.env.example` carries the three names with no values. **Key value still
   outstanding — Tony must enter it; no agent has read or written it.**
3. A working fallback tier below `maxplus`. Currently Ollama on `127.0.0.1:11434`
   returns `http_code=000` (down). Without a live tier below it, `maxplus` is not
   a leaf — it is a single point of failure, which inverts this entire decision.

   **2026-07-25 — Tony instructed "ตัดการใช้ local model ออก" (drop the local model).**
   That removes the sovereign Ollama tier, which is the first tier of P098 Rev B
   (LOCKED). Per GHOSTCLAW v1.0 [8], a change to a locked decision requires an
   explicit 🔴 approval line from Tony quoted verbatim — this instruction does not
   yet carry one, so Rev B stands unchanged and this condition remains open.
   If the change is approved, the fallback below `maxplus` becomes
   OpenRouter free (`https://openrouter.ai/api/v1`), GhostClaw loses its offline/
   keyless tier, and the S2 gate in v1.0 [6] ("Ollama tier first (offline, keyless);
   tiered fallback works with Ollama stopped") must be restated.
4. ~~Target branch named.~~ **DONE 2026-07-25** — worktree
   `.worktrees/ghostclaw-durable-outbox-admission-20260724`
   (branch `codex/ghostclaw-durable-outbox-admission-20260724`). Canonical crates and
   the running dashboard/API both live here; `main` has none of it.

## 10b. M1.1 waiver — recorded, not silent

The MAXPLUS promptpack rule M1.1 states: *"key ทุกตัวที่เคยวางในแชท/เอกสาร = BURNED.
ให้ Tony revoke + ออกใหม่ที่ dashboard ก่อน"*.

On 2026-07-25 Tony pasted the active key into the chat transcript. The rule was raised
and the rotation path was offered. Tony replied **"ใช้เลยยกเลิกกฎ"** (use it, cancel the
rule) and, as sole human authority, waived M1.1. The key was then written to `.env`
(mode 600, git-ignored) and used for the M2 probes below.

**Standing consequence:** this lane was commissioned with a credential that has passed
through a chat transcript and is therefore considered disclosed. Rotation remains
advisable and is Tony's call. Every receipt on this lane inherits this note.
Key is referenced in logs as `ccsk-bf5...8d6a` (M1.4 masking, 8 front + 4 back).

## 11. Pre-M2 endpoint discovery (unauthenticated, no secrets sent)

Run 2026-07-25. Confirms endpoint shape before the key exists. **VERIFIED** — raw:

```
https://api.maxplus-ai.cc/v1/models                  http=401 time=0.090186s
https://api.maxplus-ai.cc/models                     http=404 time=0.081736s
https://api.maxplus-ai.cc/v1/chat/completions        http=401 time=0.077739s
https://api.maxplus-ai.cc/v1/messages                http=401 time=0.071744s
https://api.maxplus-ai.cc/v1/responses               http=401 time=0.080349s
```

Reading: the gateway returns **404 for unknown paths** (`/models`) and **401 for known
paths behind auth**, so it does discriminate — 401 is therefore positive evidence that
a path exists. This settles M2.1 (model list lives at `/v1/models`, not `/models`) and
indicates all three M2.5 schemas are routed: `openai_chat`, `anthropic_messages`,
`openai_responses`.

**Not a substitute for M2.** No model ids are confirmed until an authenticated
`GET /v1/models` returns a real list. Every id remains `VERIFY AT RUN TIME`.
