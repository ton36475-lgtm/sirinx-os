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

## Immediate

- [ ] Task 1.1: Design Hermes inbox before runtime code
  - Goal: define local `POST /hermes/inbox` contract, auth/HMAC strategy, audit event shape, and dry-run behavior.
  - File scope: `docs/knowledge/`, `services/hermes-api/README.md`.
  - Verification: design review and no runtime mutation.
  - Stop rule: do not connect Telegram/LINE until recipient/token evidence exists.

- [ ] Task 1.3: Design Hermes inbox policy handoff
  - Goal: define how Hermes inbox calls `policy-core` before any dry-run or future approval queue action.
  - File scope: `docs/knowledge/`, `services/hermes-api/README.md`.
  - Verification: design review plus API contract test before implementation.
  - Stop rule: no Telegram/LINE/Solis/Cloudflare adapter execution.

## Scheduled

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
