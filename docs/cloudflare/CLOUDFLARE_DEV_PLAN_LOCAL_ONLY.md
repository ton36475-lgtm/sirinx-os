# Cloudflare Dev Plan - Local Only

Status: LOCAL PLANNING ONLY - NO DEPLOY
Date: 2026-05-30
Approval: `APPROVE_CLOUDFLARE_DEV_PLAN_LOCAL_ONLY`

## Purpose

Prepare the private Cloudflare dev preview plan for SIRINXDev Edge Agent Team without creating or mutating Cloudflare resources.

This plan converts `PRE_APPROVAL_PACKET_CLOUDFLARE_DEV` into local-only artifacts that can be reviewed before a separate deploy approval.

## Source References

- Cloudflare Workers Wrangler configuration docs: use configuration as deployment source of truth, with JSON/JSONC recommended for new projects.
- Cloudflare Workers secrets docs: sensitive values must be secrets, and some secret commands create or deploy Worker versions.
- Cloudflare Agents docs: agents are stateful Durable Object-backed TypeScript classes.
- Cloudflare Access service-token docs: service token Client Secret is displayed only once and must not be written into docs or source.
- Cloudflare MCP docs: remote MCP should use scoped tools and narrow permissions.

## Local Artifacts

| Artifact | Role | Mutation |
| --- | --- | --- |
| `apps/cloudflare-agent-team/wrangler.jsonc.example` | Reviewable future Wrangler config example | none |
| `apps/cloudflare-agent-team/src/bindings.plan.json` | Machine-readable binding, host, and stop-condition plan | none |
| `scripts/check-cloudflare-dev-plan.mjs` | Local guardrail validator | none |
| `.hermes/reports/CLOUDFLARE_DEV_PLAN_LOCAL_ONLY_2026-05-30.md` | Evidence report | none |

## Planned Private Hosts

| Host | Boundary |
| --- | --- |
| `dev.sirinx.co` | Cloudflare Access, approved operator email + MFA |
| `agents.sirinx.co` | Cloudflare Access, approved operator email + MFA, future service token for M2 bridge |
| `mcp.sirinx.co` | Cloudflare Access + OAuth/scoped MCP permissions |

## Planned Bindings

| Binding | Type | Purpose | Creation Status |
| --- | --- | --- | --- |
| `EDGE_ORCHESTRATOR` | Durable Object | EdgeOrchestratorAgent state | not created |
| `SIRINX_AGENT_DB` | D1 | agent runs, approvals, audit events, cost ledger | not created |
| `SIRINX_EVIDENCE_BUCKET` | R2 | private evidence artifacts | not created |
| `AGENT_JOBS` | Queue producer/consumer | async approved jobs | not created |
| `SIRINX_POLICY_MEMORY` | Vectorize | policy/project retrieval memory | not created |
| `AI_GATEWAY_ROUTE` | AI Gateway route reference | model traffic policy/cost control | not created |

## Required Secret Names

Names only. Values must not be written to files, chat, Obsidian, or screenshots.

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_ZONE_ID`
- `SIRINX_ACCESS_SERVICE_TOKEN_ID`
- `SIRINX_ACCESS_SERVICE_TOKEN_SECRET`

## Local Validation

Run:

```bash
pnpm cloudflare-dev-plan:check
```

The validator checks:

- pre-approval packet exists
- JSONC example exists
- binding plan exists and is consistent
- no secret-looking value appears in local plan artifacts
- no deploy/resource-creation command appears outside blocked-command documentation
- deploy approval remains separate from local plan approval

## Stop Conditions

Stop before:

- `wrangler deploy`
- `wrangler secret put`
- DNS edit
- Access policy write
- D1/R2/Queue/Vectorize creation
- AI Gateway mutation
- Remote MCP registration
- Cloudflare API MCP mutation

## Next Gate

The next real deploy gate remains:

`APPROVE_CLOUDFLARE_PRIVATE_DEV_DEPLOY`
