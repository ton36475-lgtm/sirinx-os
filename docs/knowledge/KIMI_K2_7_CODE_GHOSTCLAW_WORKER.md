# Kimi K2.7 Code GHOSTCLAW Worker — Phase 7

**Status:** Canonical documentation
**Phase:** 7 — Kimi Worker Lane
**Effective Date:** 2026-06-30
**Canonical terminology:** `brainstorm` = canonical, `beststorm` = legacy alias, `beststrom` = invalid typo

---

## 1. Overview

The Kimi K2.7 Code Worker is the coding and tool-use worker lane in GHOSTCLAW. It is assigned to the `code_patch` task lane by the Model Auto Swap Router (Phase 6) and participates in Mixture-of-Agents (MoA) reference voting.

The Kimi worker is a **read-only, code-generation, planning, and review** agent. It does not execute code, deploy, push, or access secrets.

---

## 2. Worker Identity

| Field | Value |
|---|---|
| Worker Name | `kimi_coding_worker` |
| Model | Kimi K2.7 Code (`kimi_k2_7_code`) |
| Provider | Moonshot AI |
| Autonomy Level | A2 (LLM-assisted draft only) |
| Lane | `code_patch` |
| Role | `coding_tool_use_reference` |

---

## 3. Allowed Roles

The Kimi worker serves in these capacities:

1. **Coding Tool-Use Reference** — Provides structured code patch plans referencing the tool-use format. Outputs are drafts only — never executed directly.
2. **Coding Worker** — Generates code patches, refactored snippets, and implementation drafts within an allowed path scope.
3. **Patch Planner** — Breaks down code tasks into ordered patch steps. Each patch step is a metadata artifact (file path, scope, description) — not a live mutation.
4. **Test Planner** — Plans test coverage: identifies test files, test names, and expected behaviors. Does not run tests.
5. **MoA Reference Vote Worker** — Participates in Mixture-of-Agents reference voting by providing a reference vote on proposed solutions from other agents. The vote is a structured record (see schema).

---

## 4. Blocked Operations (Immutable)

The following operations are **blocked** for the Kimi worker. These constraints are enforced by `kimi-worker.policy.yaml` and are consistent with `action-tier-cap.yaml`:

| Blocked Operation | Tier | Reason |
|---|---|---|
| Model download | X | No model fetch/pull |
| GPU live inference | X | No local GPU execution |
| Secret access | X | No `.env`, API key, token, or credential reads |
| Deploy | X | No production deployment |
| Push | X | No `git push` |
| Production action | X | No production system mutations |
| Live provider call | X | No paid/provider call from this lane |

Additional constraints:

- The worker does not read `.env` files
- The worker does not access the filesystem outside its allowed paths
- The worker does not make live provider API calls
- The worker does not run shell commands
- The worker does not install dependencies
- The worker does not self-approve or bypass `action_tier_cap`

---

## 5. Files

| File | Purpose |
|---|---|
| `GHOSTCLAW/workers/kimi/kimi-worker.policy.yaml` | Policy constraint file |
| `GHOSTCLAW/workers/kimi/kimi-reference-vote.schema.json` | JSON schema for MoA reference vote |
| `GHOSTCLAW/workers/registry/worker-registry.json` | Worker registry entry |
| `docs/knowledge/KIMI_K2_7_CODE_GHOSTCLAW_WORKER.md` | This documentation |

---

## 6. MoA Reference Vote

When participating in Mixture-of-Agents (MoA) voting, the Kimi worker produces a structured reference vote following `kimi-reference-vote.schema.json`.

The vote includes:

- `vote_id` — unique identifier
- `voter` — `kimi_coding_worker`
- `proposal_id` — the proposal being voted on
- `vote` — one of `approve`, `reject`, `abstain`
- `confidence` — float 0.0–1.0
- `rationale` — reasoning text
- `code_quality_score` — float 0.0–1.0 (specific to coding proposals)
- `safety_check` — boolean (whether the proposal passes safety constraints)
- `decision_id` — approval decision that authorized producing the vote artifact
- `evidence_pack` — source context used for the advisory vote
- `requester_agent` / `approver_agent` — non-self approval pair
- `receipt_required` — always `true`
- `timestamp` — ISO-8601

The vote does not execute, deploy, or mutate any system. It is a metadata-only advisory record.

---

## 7. Workflow Integration

```
Hermes Mission Commander
    ↓
Codex Build Captain → dispatches code_patch task
    ↓
ModelRouter.route("code_patch") → kimi_k2_7_code lane
    ↓
Kimi Worker → produces patch plan / code draft / test plan / MoA vote
    ↓
Codex Build Captain → reviews and routes to execution (if approved)
    ↓
KOB Validator → validates test output
```

The Kimi worker never bypasses the authority chain. It reports to Codex Build Captain.

---

## 8. Escalation

- If the Kimi worker detects a safety violation, it returns a `blocked` result and escalates to Codex.
- If the Kimi worker lacks context to produce a plan, it returns an `insufficient_context` result and requests additional context from Codex.
- If an action would require D/X tier operations, the worker auto-blocks and does not proceed.

---

## 9. Testing

The Kimi worker lane is validated via:

- Model router tests (`model-router.test.mjs`) — confirms `code_patch` routes to `kimi_k2_7_code`
- Worker registry — confirms `kimi_coding_worker` is registered
- Policy validation — confirms blocked operations are enforced
- Focused Kimi lane tests (`kimi-reference-vote.test.mjs`) — confirm schema, policy, registry, and skill contract markers

---

## 10. Terminology

- **brainstorm** = canonical term for ideation sessions
- **beststorm** = legacy alias (historical)
- **beststrom** = invalid typo (rejected)
