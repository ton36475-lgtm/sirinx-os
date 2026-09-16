# A2A2A P107 Dashboard Status Card Contract Check

## Status

`PASS_LOCAL_SAFE_CONTRACT_CHECK_READY`

## Scope

P107 adds a deterministic local smoke check for the P106 GhostClaw
control-plane dashboard card. It verifies that the local dev dashboard keeps the
required DOM targets, renderer, read-only API route, fallback state, and closed
guardrail checks.

This packet does not start workers, execute queue packets, send Telegram
messages, call providers, read secrets, install packages, commit, push, deploy,
mutate Cloudflare/R2, or run database migrations.

## Files Changed

- `apps/dev-dashboard/package.json`
- `apps/dev-dashboard/scripts/check-control-plane-status-card.mjs`
- `reports/mission/A2A2A_P107_DASHBOARD_STATUS_CARD_CONTRACT_CHECK_20260705.md`

## Contract Assertions

- The dashboard HTML exposes all required `controlPlane*` DOM IDs.
- The dashboard JavaScript binds selectors for those IDs.
- The renderer `renderGhostClawControlPlaneStatus` exists.
- The fallback object `fallbackGhostClawControlPlaneStatus` exists.
- The route remains:
  `GET /api/ghostclaw/control-plane/status?include_receipts=true&include_paths=false&limit=3`
- The card checks `dry_run=true`, `live_execution=false`, and `read_only=true`.
- The card explicitly watches the closed guardrails:
  - `worker_execution`
  - `live_telegram_send`
  - `provider_call`
  - `secret_read`
  - `install`
  - `push`
  - `deploy`
  - `cloudflare_r2_mutation`
  - `database_migration`

## Verification

- `pnpm --filter @sirinx/dev-dashboard control-plane-status-card:test` passed.
- `pnpm --filter @sirinx/dev-dashboard verify` passed.
- Focused Vitest for the P104/P105 status route passed: 2 files, 9 tests.
- Scoped `git diff --check` passed for the P106/P107 dashboard bundle.

## Next Safe Action

P108 can add a local visual smoke fixture or screenshot checklist for the
dashboard card. Keep it local-only; do not open live worker execution.
