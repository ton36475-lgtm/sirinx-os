# P1 Command Center Hardening

Status: completed
Date: 2026-05-16
Scope:

- `apps/dev-dashboard/src/app.js`
- `apps/dev-dashboard/src/styles.css`
- `tests/browser/dev-dashboard.spec.mjs`

## Purpose

Harden the local Developer Command Center so it remains safe and usable when optional local services are offline.

## Changes

- The Hermes gateway helper text now reports `Gateway stopped - no dispatch active` when the gateway is offline.
- E2E accepts safe degraded mode when optional Hermes services are offline.
- Mobile layout overflow in the brain panel is fixed.
- Fallback mode is tested with the API offline.
- Dashboard output is tested for absence of public production endpoint references.

## Verification

Commands:

```bash
pnpm verify
pnpm dashboard:e2e
```

Final result:

```text
8 passed
```

## Safety Result

- Source code changes: yes, frontend-only.
- Runtime configuration changes: no.
- External writes: no.
- Secrets included: no.
- Deployment: no.
- Git push: no.

## Remaining P1 Work

- Add local kill switches.
- Add local human approval queue.
- Add Solar claim guard.
- Document MCP and connector operating rules.
