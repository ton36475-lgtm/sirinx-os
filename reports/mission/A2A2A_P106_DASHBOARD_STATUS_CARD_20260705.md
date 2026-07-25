# A2A2A P106 Dashboard Status Card

## Status

`PASS_LOCAL_SAFE_DASHBOARD_READ_MODEL_READY`

## Scope

P106 wires the existing local dev dashboard to the P105 read-only control-plane
status route:

`GET /api/ghostclaw/control-plane/status?include_receipts=true&include_paths=false&limit=3`

This packet is dashboard read-model work only. It does not start workers, execute
packets, send Telegram messages, call model providers, read secrets, install
dependencies, commit, push, deploy, mutate Cloudflare/R2, or run migrations.

## Files Changed

- `apps/dev-dashboard/src/index.html`
- `apps/dev-dashboard/src/styles.css`
- `apps/dev-dashboard/src/app.js`
- `reports/mission/A2A2A_P106_DASHBOARD_STATUS_CARD_20260705.md`

## Dashboard Behavior

- Adds a `GhostClaw Control Plane / Status Read Model` panel.
- Shows active projects, current packets, guardrails, receipts, dashboard
  counters, and next safe action.
- Uses path-hidden API query parameters to avoid exposing artifact paths in the
  UI card.
- Falls back to a locked `api-offline` state when the local control API is not
  available.
- Treats guardrail drift as a warning and keeps the UI in review-only mode.

## Verification

- `pnpm --filter @sirinx/dev-dashboard verify` passed.
- Focused Vitest for the P104/P105 status route passed: 2 files, 9 tests.
- Scoped `git diff --check` passed for the dashboard/status route bundle.
- Scoped trailing-whitespace scan passed for the P106 dashboard files.
- Scoped strict secret-like scan passed for the P106 dashboard files with no
  findings.

## Guardrails Confirmed

- `dry_run=true`
- `live_execution=false`
- `worker_execution=false`
- `live_telegram_send=false`
- `provider_call=false`
- `secret_read=false`
- `install=false`
- `push=false`
- `deploy=false`
- `cloudflare_r2_mutation=false`
- `database_migration=false`

## Next Safe Action

P107 can add a small dashboard contract test or visual smoke fixture for the
P106 read model. Keep it local-only and do not start live worker execution.
