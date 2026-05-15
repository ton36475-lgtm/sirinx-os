# P1 Human Approval Queue

Status: completed
Date: 2026-05-16
Scope:

- `services/dev-control-api/src/approval-queue.mjs`
- `services/dev-control-api/src/gates.mjs`
- `services/dev-control-api/server.mjs`
- `apps/dev-dashboard/src/index.html`
- `apps/dev-dashboard/src/app.js`
- `apps/dev-dashboard/src/styles.css`
- `tests/browser/dev-dashboard.spec.mjs`

## Purpose

Add a local-only approval queue so risky actions are visible before they can proceed.

## API

The control API now exposes:

- `GET /api/approval-queue`

The queue includes pending, approved, rejected, and blocked example states. These are local dry-run records only.

## Dry-Run Enforcement

Dry-run actions can now declare:

- `requiresApproval`
- `requiredSwitches`

Behavior:

- Normal low-risk dry-runs return `simulated_only`.
- Approval-gated actions return `queued_for_approval`.
- Actions blocked by disabled kill switches return `blocked_by_kill_switch`.
- All outcomes keep `externalWrites: false`.

## Dashboard

The dashboard now includes:

- Human Approval Queue panel.
- Item count and pending count.
- Action, source, risk, status, and reason for each item.
- Live refresh after approval-gated dry-run actions.

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

- Source code changes: yes, local control API and dashboard only.
- Runtime configuration changes: no.
- External writes: no.
- Secrets included: no.
- Deployment: no.
- Git push: no.
- Customer messages: no.
