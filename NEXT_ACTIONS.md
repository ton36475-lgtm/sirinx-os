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

- [ ] Task 1.7: Implement local lead-event/audit proposal
  - Goal: define local lead event evidence shape before any CRM/Supabase/production lead writes.
  - File scope: `services/dev-control-api/src/`, tests, docs if needed.
  - Verification: unit tests, `pnpm verify`, no production POST.

- [ ] Implement local lead-event/audit proposal after lead qualification v2.
- [ ] Add Command Center view for lead v2 reasons/risk flags if more sales detail is needed.
- [ ] Map `sirinx-solar-energy` entities into a local-only solar ops contract.
- [ ] Map `oz-corp-omega-dual-node` safe-command and memory ideas into a docs-only policy.
- [ ] Compare marketing/CRM schemas against SIRINX lead entity before any database work.

## Approval-Gated

- [ ] Codex Mobile QR/MFA pairing.
- [ ] Telegram/LINE token and recipient setup.
- [ ] Solis consent, credential storage, and station mapping.
- [ ] Cloudflare Bot Management official review.
- [ ] GitHub push/PR for `sirinx-os` branch.

## Backlog

- [ ] Create `RELEASE_GATE.md`.
- [ ] Create `VALIDATION_MATRIX.md`.
- [ ] Create `HANDOFF_PROTOCOL.md`.
- [ ] Create `RUNBOOK_LIVE_START.md`.
- [ ] Create `KNOWN_ISSUES.md`.
