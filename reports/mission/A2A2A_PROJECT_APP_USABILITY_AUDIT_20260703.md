# A2A2A Project App Usability Audit - 2026-07-03

## Status

PASS: the active-focus project apps have local build/check usability evidence.

## Purpose

This audit proves the current operator-approved focus is usable locally. Active focus is limited to `sirinx.co` and AGM AutoFlow. Kusala and Phitsanulok News are paused/out-of-focus and are intentionally excluded from this audit.

## Evidence

- Script: `scripts/ghostclaw_project_app_usability_audit.mjs`
- Evidence JSON: `.ghostclaw_runtime/a2a2a/evidence/A2A2A-P059-PROJECT-APP-USABILITY-AUDIT-20260703.json`
- Receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P059-PROJECT-APP-USABILITY-AUDIT-20260703.json`

## Local Checks

| Package | Checks |
|---|---|
| `@sirinx/site` | build, check |
| `@agm/site` | build, check, local browser smoke |
| `@sirinx/agm-autoglow-dashboard` | verify |
| `@sirinx/autoglow-core` | tests |

## Validation Commands

```bash
node scripts/ghostclaw_project_app_usability_audit.mjs --json .ghostclaw_runtime/a2a2a/evidence/A2A2A-P059-PROJECT-APP-USABILITY-AUDIT-20260703.json
./node_modules/.bin/vitest run scripts/ghostclaw_project_app_usability_audit.test.mjs
node --check scripts/ghostclaw_project_app_usability_audit.mjs
node --check scripts/ghostclaw_project_app_usability_audit.test.mjs
```

## Result

- Usability audit: PASS
- Focused tests: PASS
- Syntax checks: PASS
- Active focus only: `sirinx.co` and AGM AutoFlow
- Excluded from active focus: Kusala, Phitsanulok News
- External requests in AGM smoke: none reported

## Policy

No install, provider call, customer-data external routing, Telegram live send, commit, push, deploy, Cloudflare/R2 mutation, secret value print, key printing, or `.env` read was performed by this audit.

## Next Safe Action

Include this report in the explicit-path local commit gate, then open a separate local commit execution gate if desired.
