# A2A2A P108 Dashboard Status Card Visual Smoke

## Status

`PASS_LOCAL_SAFE_VISUAL_SMOKE_READY`

## Scope

P108 adds a local visual smoke fixture and deterministic checker for the
GhostClaw control-plane dashboard status card. This is a static local artifact
and checklist-style smoke test. It does not open a browser, start a server,
execute workers, call providers, send Telegram messages, read secrets, install
dependencies, commit, push, deploy, mutate Cloudflare/R2, or run migrations.

## Files Changed

- `apps/dev-dashboard/package.json`
- `apps/dev-dashboard/fixtures/control-plane-status-card-visual-smoke.html`
- `apps/dev-dashboard/scripts/check-control-plane-status-card-visual-smoke.mjs`
- `reports/mission/A2A2A_P108_DASHBOARD_STATUS_CARD_VISUAL_SMOKE_20260705.md`

## Visual Smoke Coverage

- Confirms the dashboard card appears after `CenterBrain Hub` and before
  `Hermes Team + Qwen + Antigravity`.
- Confirms visible labels for:
  - `GhostClaw Control Plane`
  - `Status Read Model`
  - `Active Projects`
  - `Packets`
  - `Guardrails`
  - `Receipts`
- Confirms runtime summary-card calls for:
  - `Projects`
  - `Missions`
  - `Packets`
  - `Approvals`
  - `Receipts`
- Confirms the static fixture includes responsive layout rules and local-safe
  guardrail copy.
- Confirms safety words remain visible in script/fixture:
  - `live_execution`
  - `provider_call`
  - `live_telegram_send`
  - `cloudflare_r2_mutation`
  - `database_migration`

## Verification

- `pnpm --filter @sirinx/dev-dashboard control-plane-status-card:visual-smoke`
  passed.
- `pnpm --filter @sirinx/dev-dashboard verify` passed.
- Focused Vitest for the P104/P105 status route passed: 2 files, 9 tests.
- Scoped `git diff --check` passed for the P106/P107/P108 dashboard bundle.
- Scoped trailing-whitespace scan passed.
- Scoped strict secret-like scan passed with no findings.

## Next Safe Action

P109 can add an optional local-only screenshot runbook or Playwright-backed
browser proof if the operator wants visual evidence from a real browser. Keep it
local-only and do not start live worker execution.
