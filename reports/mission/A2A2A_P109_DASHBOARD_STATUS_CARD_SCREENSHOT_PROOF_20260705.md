# A2A2A P109 Dashboard Status Card Screenshot Proof

## Status

`PASS_LOCAL_FILE_BROWSER_SCREENSHOT_PROOF_READY`

## Scope

P109 adds a local browser screenshot proof for the GhostClaw control-plane
dashboard card. The capture uses the static P108 fixture through a `file://`
URL, blocks non-local network requests, and screenshots only
`.control-plane-panel`.

This packet does not start a server, execute workers, send Telegram messages,
call providers, read secrets, install packages, commit, push, deploy, mutate
Cloudflare/R2, or run database migrations.

## Files Changed

- `apps/dev-dashboard/package.json`
- `apps/dev-dashboard/scripts/capture-control-plane-status-card-screenshot.mjs`
- `apps/dev-dashboard/fixtures/control-plane-status-card-visual-smoke.html`
- `reports/screenshots/control-plane-status-card-p109-20260705.png`
- `reports/screenshots/control-plane-status-card-p109-20260705.json`
- `reports/mission/A2A2A_P109_DASHBOARD_STATUS_CARD_SCREENSHOT_PROOF_20260705.md`

## Evidence

- Screenshot:
  `reports/screenshots/control-plane-status-card-p109-20260705.png`
- Screenshot manifest:
  `reports/screenshots/control-plane-status-card-p109-20260705.json`
- Manifest result:
  - `status=passed`
  - `mode=local_file_fixture_browser_capture`
  - `network_policy=file_and_data_urls_only`
  - `server_started=false`
  - `live_actions=false`
  - `provider_call=false`
  - `live_telegram_send=false`
  - `deploy=false`
  - `cloudflare_r2_mutation=false`
  - `database_migration=false`

## Screenshot Assertions

- `GhostClaw Control Plane` title visible.
- `Status Read Model` heading visible.
- `Active Projects` heading visible.
- `Guardrails` heading visible.
- Local-only copy visible.
- `provider call=false` visible.
- `deploy=false` visible.
- `cloudflare r2 mutation=false` visible.
- Captured panel bounds are larger than the minimum visual proof threshold.
- PNG size exceeds the minimum screenshot byte threshold.

## Debug Note

The first capture attempts failed closed due to strict selector collisions in
the visual fixture (`Guardrails` and `provider call` appeared both in the panel
and in stop-point copy). The script now uses role/exact selectors where needed,
then passed and wrote the final screenshot manifest.

## Verification

- `pnpm --filter @sirinx/dev-dashboard control-plane-status-card:screenshot`
  passed.
- `pnpm --filter @sirinx/dev-dashboard control-plane-status-card:visual-smoke`
  passed.
- `pnpm --filter @sirinx/dev-dashboard verify` passed.
- Focused Vitest for the P104/P105 status route passed: 2 files, 9 tests.

## Next Safe Action

P110 can add a read-only dashboard evidence index that links P105-P109 reports,
manifest, and screenshot paths. Keep it local-only and do not open live worker
execution.
