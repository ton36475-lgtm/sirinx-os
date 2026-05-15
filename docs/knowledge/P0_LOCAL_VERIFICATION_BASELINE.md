# P0 Local Verification Baseline

Status: passed
Date: 2026-05-16
Branch: `codex/urgent-backlog-execution`

## Purpose

Verify the local SIRINX Developer Command Center baseline before feature implementation continues.

## Commands Run

```bash
pnpm verify
pnpm dashboard:run
pnpm dashboard:status
curl -fsS http://127.0.0.1:8711/health
curl -fsS http://127.0.0.1:8710
pnpm dashboard:e2e
```

## Results

| Check | Result |
| --- | --- |
| Dependencies present | Pass |
| Node version available | Pass |
| pnpm available | Pass |
| Syntax verification | Pass |
| API health | Pass |
| Dashboard HTTP response | Pass |
| Dry-run API flag | Pass |
| External writes flag | Pass |
| Playwright desktop | Pass |
| Playwright mobile | Pass |
| Mobile overflow smoke check | Pass |

## API Health Evidence

The control API returned:

```json
{
  "status": "ok",
  "service": "sirinx-dev-control-api",
  "dryRunOnly": true,
  "externalWrites": false
}
```

## Issues Found And Fixed

### Optional Hermes Dependency In E2E

Initial e2e expected `HQ live`, `Hermes Dashboard Online`, and `Hermes Gateway Running`. The P0 baseline starts only the SIRINX dashboard and control API, so the dashboard correctly displayed `HQ partial` when optional Hermes services were offline.

Fix:

- Updated e2e to accept safe degraded status: `HQ live` or `HQ partial`.
- Updated e2e to accept Hermes dashboard `Online` or `Offline`.
- Updated e2e to accept Hermes gateway `Running` or `Stopped`.

### Gateway Status Copy

The UI showed gateway helper copy that could imply dispatch activity even when the gateway was stopped.

Fix:

- When the gateway is stopped, the UI now shows `Gateway stopped - no dispatch active`.

### Mobile Overflow

Mobile layout had horizontal overflow in the brain panel.

Fix:

- Added `min-width: 0` to direct children of the brain layout.
- Added wrapping rules for brain title/meta/note content.
- Added `min-width: 0` to the brain preview panel.

## Final Verification

Final `pnpm dashboard:e2e` result:

```text
4 passed
```

Mobile overflow smoke check:

```json
{
  "scrollWidth": 393,
  "clientWidth": 393,
  "overflow": 0
}
```

## Runtime Impact

The changes remain local-only:

- No deployment.
- No Git push.
- No cloud mutation.
- No customer message.
- No paid API call.
- No migration.
- No real secret access.

## Next Required Step

Proceed to P1 Developer Command Center hardening with the verified local baseline.
