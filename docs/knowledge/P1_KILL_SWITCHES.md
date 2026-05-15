# P1 Kill Switches

Status: completed
Date: 2026-05-16
Scope:

- `services/dev-control-api/src/switches.mjs`
- `services/dev-control-api/src/gates.mjs`
- `services/dev-control-api/server.mjs`
- `apps/dev-dashboard/src/index.html`
- `apps/dev-dashboard/src/app.js`
- `apps/dev-dashboard/src/styles.css`
- `tests/browser/dev-dashboard.spec.mjs`

## Purpose

Add local kill-switch visibility and enforcement before expanding external adapters or customer-facing workflows.

## Switches Added

- Cloud mutation: `CLOUDFLARE_MUTATION_ENABLED`
- Customer messaging: `CUSTOMER_MESSAGE_SEND_ENABLED`
- Paid API calls: `PAID_API_CALLS_ENABLED`
- Public AI exposure: `PUBLIC_AI_EXPOSURE_ENABLED`
- Destructive MCP tools: `DESTRUCTIVE_MCP_TOOLS_ENABLED`
- Render and export: `RENDER_EXPORT_ENABLED`

All switches default to off unless the matching environment variable is explicitly set to `true`.

## Enforcement

The control API now exposes:

- `GET /api/switches`

The dry-run action evaluator now blocks actions with disabled required switches and returns:

```json
{
  "result": "blocked_by_kill_switch",
  "externalWrites": false,
  "requiresHumanApproval": true
}
```

## Dashboard

The dashboard now includes a Kill Switches panel showing each switch, environment flag, description, and on/off state.

## Test Coverage

E2E now verifies:

- Kill switches render in the dashboard.
- Switches default off.
- A risky external adapter dry-run is blocked by kill switches.
- API offline fallback still renders safe controls.
- No public production endpoints appear in dashboard text or links.

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
