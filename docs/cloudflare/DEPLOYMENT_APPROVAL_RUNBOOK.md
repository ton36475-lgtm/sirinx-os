# Cloudflare Deployment Approval Runbook

Status: DRAFT ONLY - DO NOT DEPLOY

## Required Packet

Use `00_COMMAND_CENTER/PRE_APPROVAL_PACKET_CLOUDFLARE_DEV.md` before any Cloudflare mutation.

## Required Evidence

- Target domain and environment.
- Wrangler config diff.
- Access policy draft.
- Secrets required by name only.
- D1/R2/Vectorize binding names.
- Risk level.
- Rollback plan.
- Expected cost.
- Verification plan.
- Human approval checkbox.

## Stop Before These Commands

```bash
wrangler deploy
wrangler secret put
wrangler d1 create
wrangler r2 bucket create
wrangler queues create
wrangler vectorize create
```

## Post-approval Minimum Smoke

- Access blocks anonymous internal routes.
- Approved operator can open private preview.
- Mutation endpoints reject missing approval ID.
- Workers Logs show correlation ID.
- Evidence summary returns to M2 vault.
- Rollback target is documented.

