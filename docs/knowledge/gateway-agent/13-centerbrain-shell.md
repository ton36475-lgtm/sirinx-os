# 13 - CenterBrain Shell

Status: local-only Next.js shell

## Contract

CenterBrain Shell is a consumer UI. It reads CenterBrain status from the local dev-control API and renders a controlled operator surface for AI nodes, devices, connectors, and stack lanes.

It does not replace:

- `apps/dev-dashboard`
- `services/dev-control-api`
- Agent Launch Gate
- Agent Driver
- Connector Registry

## Routes

```text
GET  /api/centerbrain-hub
POST /api/centerbrain-hub/sync/dry-run
```

Both routes return JSON and deny new execution capabilities at the shell boundary.

## Runtime

```bash
pnpm centerbrain-shell:dev
```

Default local URL:

```text
http://127.0.0.1:8720
```

## Verification

```bash
pnpm centerbrain-shell:test
pnpm centerbrain-shell:check
```

## Stop

```text
CENTERBRAIN SHELL READY - LOCAL ONLY - WAITING FOR UI SMOKE APPROVAL
```
