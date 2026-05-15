# SIRINX OS

Internal full-stack agentic production platform scaffold.

Current mode: Production Hardening -> Safety Gates -> Dry-run Integration -> Staging -> Production Approval.

## Scope

- SIRINX OS Core, excluding AGM.
- `dev.sirinx.co` internal Developer Command Center.
- Local-only development until human approval is recorded.
- Dry-run adapters only in this scaffold.

## PR Set

### PR-001: Governance + Monorepo

- Canonical operating protocol lives in `AGENTS.md`.
- Workspace boundaries are declared in `pnpm-workspace.yaml`.
- Turborepo pipeline is declared in `turbo.json`.
- Environment examples live in `.env.example`; real `.env` files are intentionally ignored by policy.

### PR-002: Mac Live Baseline

- Baseline notes live in `docs/mac-live-baseline.md`.
- No cloud mutation, paid API calls, customer messages, public exposure, or destructive MCP actions are allowed.

### PR-003: Developer Command Dashboard

- Dashboard scaffold: `apps/dev-dashboard`.
- Local control API scaffold: `services/dev-control-api`.
- Runbook: `docs/dev-dashboard-runbook.md`.
- Browser QA checklist: `devtools/chrome-mcp-dev-dashboard-qa.md`.

## Local Commands

```bash
node services/dev-control-api/server.mjs
node apps/dev-dashboard/server.mjs
```

Then open:

```text
http://localhost:8710
```

The dashboard expects the control API at:

```text
http://localhost:8711
```

## Verify

```bash
node --check apps/dev-dashboard/server.mjs
node --check apps/dev-dashboard/src/app.js
node --check services/dev-control-api/server.mjs
node --check services/dev-control-api/src/gates.mjs
```

## Safety

Do not deploy, push Git, mutate cloud resources, edit real `.env`, create real secrets, trigger paid APIs, send customer messages, expose local AI publicly, or run destructive MCP tools without explicit human approval.
