# Night Watch Status

## Timestamp
2026-05-28 01:00:13 +07

## Command
`perl -e 'alarm 110; exec @ARGV' pnpm night-watch`

## Result
- Exit code: `0`
- Final status: `WARN`
- Latest local report: `.hermes/logs/night-watch-latest.md`
- Obsidian report: `/Users/sirinx/Documents/Obsidian Vault/SIRINX/06_OPERATIONS/Hermes Night Watch Log.md`

## WARN Details
- Local stack has degraded services.
- Hermes Desktop probe is offline.
- Hermes gateway is loaded/running.
- Public SIRINX website probes returned HTTP `200`.

## Telegram Callback Contract
- `exit=0` and `Final Status=OK`: completed.
- `exit=0` and `Final Status=WARN`: completed with warning.
- `exit!=0` or `Final Status=FAILED`: failed, include log path and next required action.

## Next Action
Patch only the Telegram callback wrapper if it still treats `WARN` as failure. Do not change the Night Watch script unless a future run returns `FAILED` from a true core break.

## V4 Refresh - 2026-05-28 01:09 +07
- `night-watch` is still defined as `./scripts/hermes-night-watch-snapshot.sh`.
- Latest report file exists at `.hermes/logs/night-watch-latest.md`.
- Latest `Final Status` remains `WARN`.
- Callback contract remains: `OK` and `WARN` are completed states; `FAILED` is failure.

## Implementation - 2026-05-28 01:19 +07
- Added `classifyNightWatchCallback()` to `services/hermes-api/src/adaptive-command-gateway.mjs`.
- Added `extractNightWatchFinalStatus()` to parse either CLI output or Markdown report text.
- `exitCode=0` plus `Final Status=WARN` now classifies as `completed_with_warning`, not failed.
- Gateway status now exposes `nightWatchCallbackPolicy` with `OK`, `WARN`, and `FAILED` examples.

## Verification - 2026-05-28 01:19 +07
- `pnpm adaptive-command-gateway:test`: passed with Night Watch WARN callback regression coverage.
