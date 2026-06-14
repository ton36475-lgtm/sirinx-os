# PRE_APPROVAL_PACKET_CLOUDFLARE_DEV

Status: READY FOR HUMAN REVIEW - NOT APPROVED

Last Updated: 2026-05-30

## Current Local Evidence

The local-only prototype `CF_LOCAL_AGENT_PROTOTYPE_001` has been implemented and verified before this Cloudflare gate.

- Local prototype evidence: `.hermes/reports/CF_LOCAL_AGENT_PROTOTYPE_001_EVIDENCE.md`
- Local prototype status: `.hermes/reports/CF_LOCAL_AGENT_PROTOTYPE_001_STATUS_2026-05-30.md`
- Local prototype result: `done_local_evidence_only`
- `cloudflareApiCall: false`
- `externalWrite: false`
- `secretRequired: false`
- `deployAttempted: false`
- `resourceCreated: false`

## Requested Action

Approve the next phase to prepare a private Cloudflare dev preview plan for the SIRINXDev Edge Agent Team.

This packet does not authorize deployment by itself. It defines the approval boundary and required evidence before any Cloudflare mutation.

## Scope

- `dev.sirinx.co` behind Cloudflare Access.
- `agents.sirinx.co` behind Cloudflare Access.
- `mcp.sirinx.co` behind Cloudflare Access plus scoped MCP auth.
- No public anonymous internal access.

## Cloudflare Services

- Workers
- Agents SDK
- Durable Objects
- Workflows
- Queues
- D1
- R2
- Vectorize / AI Search
- AI Gateway
- Access / Zero Trust
- Workers Logs

## Mutation Requested

None yet.

Allowed before explicit deploy approval:

- Local Wrangler config draft.
- Access policy draft.
- Binding names draft.
- D1/R2/Queue/Vectorize schema and naming plan.
- Remote MCP permission matrix draft.
- Cost and rollback plan.
- Local dry-run and evidence packet.

Still not allowed:

- `wrangler deploy`
- DNS edit
- Access policy write
- token creation
- secret write
- D1/R2/Queue/Vectorize creation
- AI Gateway mutation
- Remote MCP registration
- Cloudflare API MCP mutation

## Secrets Required

None for this planning packet.

Future private preview may require secret names only, never values:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_ZONE_ID`
- `SIRINX_ACCESS_SERVICE_TOKEN_ID`
- `SIRINX_ACCESS_SERVICE_TOKEN_SECRET`

## Risk

- Medium if deployed publicly.
- Low if kept local and planning-only.
- Critical if any internal endpoint is deployed without Cloudflare Access.
- Critical if Remote MCP can mutate Cloudflare without an approval ID.

## Rollback Plan

No Cloudflare resources are created by this packet.

If a later deploy packet is approved, rollback must include:

- previous Worker version or disabled route
- Access policy revert
- DNS route removal
- D1 migration rollback or dev database delete plan
- R2 artifact retention/delete policy
- Queue pause/delete plan
- Vectorize index delete plan
- AI Gateway route/rate-limit revert
- evidence artifact retention policy

## Stop Condition

Stop before `wrangler deploy`, DNS edit, Access policy write, token creation, secret write, D1/R2/Queue/Vectorize creation, or Cloudflare API MCP mutation.

## Required Verification Before Any Deploy Packet

- `pnpm cloudflare-agent-team:check`
- `pnpm cloudflare-agent-team:test`
- `pnpm cloudflare-agent-team:demo`
- `git diff --check`
- `pnpm audit:secrets`
- `pnpm check`
- local preview smoke, if a preview UI is added
- Access policy reviewed as private-first
- Remote MCP permission matrix reviewed as read-only by default

## Approval Phrase For Next Step

Use this exact phrase only if you want to allow the next local planning slice:

`APPROVE_CLOUDFLARE_DEV_PLAN_LOCAL_ONLY`

Use this exact phrase only if you later want to allow a real private Cloudflare dev deployment:

`APPROVE_CLOUDFLARE_PRIVATE_DEV_DEPLOY`

## Approval Checkbox

- [ ] Human approved Cloudflare private dev preview.
