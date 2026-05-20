# NEXT_ACTIONS

Date: 2026-05-20
Mode: strict ordered queue
Source of truth: `AGENTS.md` plus `PROJECT_STATE.md`

## Completed This Session

- [x] Task 0.1: Verify Phase 0/1 operating file stack
  - Goal: confirm root operating files exist and match safety posture.
  - File scope: root markdown files, `scripts/check-operating-files.mjs`.
  - Verification: `pnpm project-os:check`, `pnpm verify`, `git diff --check`.
  - Stop rule: stop if any file claims external writes are allowed by default.

- [x] Task 0.2: Keep current local control plane healthy
  - Goal: maintain local Command Center availability for review.
  - File scope: no code changes unless a test fails.
  - Verification: `pnpm dashboard:run`, `curl http://127.0.0.1:8711/health`, `pnpm dashboard:e2e`.
  - Stop rule: do not expose local ports publicly.

- [x] Task 1.2: Implement policy-core contract
  - Goal: define gate decisions, autonomy levels, external-write decisions, and audit outputs.
  - File scope: `packages/policy-core/`, `services/dev-control-api/src/policy-core-status.mjs`.
  - Verification: `pnpm policy-core:test`, `pnpm policy-core:api-test`, `pnpm verify`, `pnpm dashboard:e2e`.
  - Stop rule: external actions still return `approval_required` or `blocked` until exact target evidence exists.

- [x] Task 1.1: Design Hermes inbox before runtime code
  - Goal: define local `POST /hermes/inbox` contract, auth/HMAC strategy, audit event shape, and dry-run behavior.
  - File scope: `docs/knowledge/SIRINX_HERMES_INBOX_CONTRACT_2026-05-20.md`, `services/hermes-api/README.md`.
  - Verification: design review, `pnpm verify`, `git diff --check`.
  - Stop rule: do not connect Telegram/LINE until recipient/token evidence exists.

- [x] Task 1.3: Implement Hermes inbox dry-run normalizer
  - Goal: add pure request normalization and tests for the locked Hermes inbox contract.
  - File scope: `services/hermes-api/src/inbox.mjs`, `services/dev-control-api/server.mjs`.
  - Verification: unit tests plus `pnpm verify`, `pnpm dashboard:e2e`.
  - Stop rule: no Telegram/LINE/Solis/Cloudflare adapter execution.

- [x] Task 1.4: Add dashboard presentation for Hermes inbox dry-run
  - Goal: show local inbox decisions and audit result in Command Center UI.
  - File scope: `apps/dev-dashboard/`, browser tests.
  - Verification: `pnpm dashboard:e2e`, local mobile width check.
  - Stop rule: no external connector execution.

## Immediate

- [x] Task 1.5: Implement Hermes inbox approval packet integration
  - Goal: map `approval_required` inbox decisions into the existing local approval queue format.
  - File scope: `services/hermes-api/`, `services/dev-control-api/src/approval-queue.mjs`, tests.
  - Verification: unit tests, `pnpm verify`, `pnpm dashboard:e2e`.
  - Stop rule: no external connector execution.

## Scheduled

- [x] Task 1.6: Add durable approval evidence files
  - Goal: write local approval queue snapshots into Obsidian only when requested.
  - File scope: `services/dev-control-api/src/approval-evidence.mjs`, `scripts/approval-evidence-write-local.mjs`.
  - Verification: `pnpm approval-evidence:test`, `pnpm approval-evidence:dry-run`, local confirmed Obsidian write, no external writes.

- [x] Task 1.7: Implement local lead-event/audit proposal
  - Goal: define local lead event evidence shape before any CRM/Supabase/production lead writes.
  - File scope: `services/dev-control-api/src/lead-event-audit.mjs`, tests, API route.
  - Verification: `pnpm lead-event-audit:test`, `pnpm verify`, API smoke, no production POST.

- [x] Task 1.8: Implement current pending-work ledger
  - Goal: expose the remaining work in one ordered local-only ledger so Hermes/Command Center cannot hide or reorder old gates.
  - File scope: `services/dev-control-api/src/pending-work.mjs`, `scripts/pending-work-ledger.mjs`, `apps/dev-dashboard/`, tests, `docs/knowledge/SIRINX_PENDING_WORK_LEDGER_2026-05-20.md`.
  - Verification: `pnpm pending-work:test`, `pnpm pending-work:check`, `pnpm verify`, `pnpm dashboard:e2e`.
  - Stop rule: ledger may report evidence and blockers, but it must never arm external writes.

- [x] Add Command Center view for lead v2 reasons/risk flags if more sales detail is needed.
  - Goal: display lead event audit lane, risk flags, blocked handoffs, and evidence checklist in the Lead Backend panel.
  - File scope: `apps/dev-dashboard/src/`, browser tests.
  - Verification: `pnpm dashboard:e2e`, `pnpm verify`, API smoke.

- [x] Map `sirinx-solar-energy` entities into a local-only solar ops contract.
  - Goal: map legacy solar leads/customers/installations/contractors/SEO/campaign/tasks/metrics into SIRINX-owned local contract before any schema migration.
  - File scope: `services/dev-control-api/src/solar-ops-contract.mjs`, tests, `docs/knowledge/SIRINX_SOLAR_OPS_ENTITY_CONTRACT_2026-05-20.md`.
  - Verification: `pnpm solar-ops-contract:test`, `pnpm verify`, `/api/solar-ops-contract` smoke.

- [x] Map `oz-corp-omega-dual-node` safe-command and memory ideas into a docs-only policy.
  - Goal: extract allowlisted command and continuity-memory rules without importing runtime code.
  - File scope: `docs/knowledge/SIRINX_SAFE_COMMAND_MEMORY_POLICY_2026-05-20.md`, status docs.
  - Verification: `pnpm verify`, `git diff --check`; no runtime command runner added.

- [x] Compare marketing/CRM schemas against SIRINX lead entity before any database work.
  - Goal: map old marketing/CRM source fields to SIRINX lead contact, solar qualification, attribution, quality, and audit groups before any external CRM/database write.
  - File scope: `services/dev-control-api/src/lead-crm-contract.mjs`, tests, `docs/knowledge/SIRINX_LEAD_CRM_HANDOFF_CONTRACT_2026-05-20.md`.
  - Verification: `pnpm lead-crm-contract:test`, `pnpm verify`, `/api/lead-crm-contract` smoke.

## Approval-Gated

- [ ] Codex Mobile QR/MFA pairing.
- [ ] Telegram/LINE token and recipient setup.
- [ ] Solis consent, credential storage, and station mapping.
- [ ] Cloudflare Bot Management official review.
- [ ] GitHub push/PR for `sirinx-os` branch.
  - Current note: this is a separate publish gate, not one of the four Command Center operational gates.
  - Blocker: exact remote/owner/repo/branch/PR target is not recorded; `git remote -v` printed no configured remote.

## Backlog

- [x] Create `RELEASE_GATE.md`.
- [x] Create `VALIDATION_MATRIX.md`.
- [x] Create `HANDOFF_PROTOCOL.md`.
- [x] Create `RUNBOOK_LIVE_START.md`.
- [x] Create `KNOWN_ISSUES.md`.
- [x] Refresh `docs/knowledge/SIRINX_EXTERNAL_GATE_ACTION_PACKETS.md` to the current four-gate execution queue plus the separate `sirinx-os` publish gate.
- [x] Materialize pending evidence files for Codex Mobile, Telegram/LINE, Solis, and Cloudflare Bot Management so the checker reports incomplete evidence instead of missing files.
- [x] Add local `/api/external-gate-evidence` and Command Center Evidence Readiness panel so Hermes/Codex can inspect gate evidence without terminal parsing.
- [x] Add `sirinx-os` GitHub publish evidence into the same evidence checker so the push/PR gate is not tracked outside the system.
- [x] Add local Gate Runner Readiness so Hermes/Codex can see allowed local checks and blocked external actions for each gate.
- [x] Add local Pending Work Ledger so Hermes/Codex can see strict operator order and confirm `hiddenBacklog=false`.
