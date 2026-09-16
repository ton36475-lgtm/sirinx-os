# Decision Artifact: A2A Sync Hermes `/goal` `/mission` `/brainstorm` Project

**Status:** APPROVED_FOR_SCOPED_IMPLEMENTATION
**Decision ID:** DA-2026-06-29-A2A-GMB
**Branch:** `staging/godmode-master-os-v2`
**Committed evidence base:** `432f382` (bridge v2 probe evidence)
**Autonomy Level:** A4 (bounded agent chooses tools inside allowlist) + A5 gate for any real Codex CLI execution
**Tool Class:** T0–T2 read/local-test only; T5–T7 blocked pending explicit approval

---

## 1. Goal

Add A2A packet types and bridge routing so that Hermes can receive and dispatch three new first-class intents to the Codex sidecar:

- `/goal` — declare a high-level objective, produce a scoped task packet.
- `/mission` — create a bounded mission packet with constraints, lane, and deliverables.
- `/brainstorm` — trigger multi-agent deliberation packet that returns a decision-ready proposal (NOT auto-execution).

These packets live in `_A2A_QUEUE/inbox/` and are processed by the existing A2A Hermes-Codex Bridge v2 in dry-run mode by default.

---

## 2. Constraints

### Hard Rules
- No real Codex CLI execution by default.
- No deploy, push, cloud mutation, customer send, secret read, or paid/provider call.
- No LANE_2 authorization unless a separate explicit `R0` approval packet exists.
- All `/goal`, `/mission`, `/brainstorm` actions start as Tier A/B read/plan packets; any resulting write action must pass the existing tier resolver and broker.
- `brainstorm` MUST NOT produce simulated/draft MoA votes and claim them as A2A evidence. Real A2A evidence requires `job_id`/`source`/`status`/`timestamp`.

### Scope Boundaries
- **Allowed paths:**
  - `GHOSTCLAW/a2a-hermes-codex-bridge/`
  - `_A2A_QUEUE/`
  - `.ghostclaw_runtime/manifests/`
  - `docs/superpowers/decisions/`
  - `docs/superpowers/plans/`
- **Forbidden paths:**
  - `.env` / secrets
  - `infra/cloudflare/`
  - `production/` / `deploy/`
  - customer-facing send adapters

### Naming Convention
- Use canonical term **"Brainstorm"** for multi-agent deliberation. Legacy "BestStorm" and typo "beststrom" are invalid.

---

## 3. Expected Result

1. Three new `action_requested` values recognized by `tier-resolver.ts`:
   - `goal_define` → `PLAN` / Tier B
   - `mission_create` → `PLAN` / Tier B
   - `brainstorm_deliberate` → `PLAN` / Tier B
2. `codex-sidecar.ts` can route these actions into dry-run previews and outbox packets.
3. Helper functions to generate `/goal`, `/mission`, `/brainstorm` inbox packets from CLI or script.
4. Tests covering all three packet types and broker verdicts.
5. A plan document under `docs/superpowers/plans/` describing the next implementation steps.

---

## 4. Verification

- [ ] `npx vitest run` in `GHOSTCLAW/a2a-hermes-codex-bridge/` passes ≥ current 21 tests.
- [ ] New tests for `/goal`, `/mission`, `/brainstorm` routing pass.
- [ ] Dry-run probe creates outbox packets for all three actions without real execution.
- [ ] `npx tsc --noEmit` in bridge directory remains clean.
- [ ] No `.env` or secret files modified or created.

---

## 5. Risk & Mitigation

| Risk | Mitigation |
|------|-----------|
| `/brainstorm` auto-executes instead of deliberates | Tier resolver classifies it as `PLAN` (not `WRITE_LANE`); sidecar produces preview only. |
| Packet storm / infinite loop | TTL on every packet; bridge rejects duplicate `correlation_id` within TTL window. |
| Scope creep into real coding without approval | All generated write actions must pass existing broker; no blanket auto-execute. |
| Secret leakage in packet context | Broker forbids `.env` / secret path prefixes; packet bus filters are advisory only. |

---

## 6. Rollback

- Remove new action mappings from `tier-resolver.ts`.
- Delete any probe packets from `_A2A_QUEUE/inbox/` or `outbox/`.
- Revert to commit `432f382` if necessary.

---

## 7. Next Action

Proceed with scaffold implementation of `/goal`, `/mission`, `/brainstorm` packet types and broker routing in `GHOSTCLAW/a2a-hermes-codex-bridge/`, then verify with tests and a live dry-run probe.

Approved by: user explicit directive "A2A packet types ใน `_A2A_QUEUE/inbox/` ที่ bridge จะ route ไป Codex" + "Commit probe evidence เหล่านี้ทั้งหมดก่อนเริ่มทำ"
Approved at: 2026-06-29T09:58:00Z
