# RUNBOOK_LIVE_START

Date: 2026-05-20
Mode: local live-start runbook
External writes: blocked by default

## Start Local Command Center

```bash
cd /Users/sirinx/sirinx-os
pnpm dashboard:restart
```

Expected:

- API: `http://127.0.0.1:8711/health`
- Dashboard: `http://127.0.0.1:8710`
- API reports `dryRunOnly=true` and `externalWrites=false`.

## Health Check

```bash
curl -fsS http://127.0.0.1:8711/health
pnpm verify
pnpm dashboard:e2e
pnpm external-gates:check
```

## Key Local APIs

| API | Purpose |
| --- | --- |
| `/api/lead-health` | Local lead backend health and qualification status |
| `/api/lead-event-audit` | Local lead event and blocked handoff evidence |
| `/api/lead-crm-contract` | Local CRM handoff contract |
| `/api/solar-ops-contract` | Local solar ops entity contract |
| `/api/hermes-inbox/dry-run` | Hermes inbox policy preview |
| `/api/approval-evidence` | Local approval queue evidence snapshot |

## Stop Conditions

Stop before any deploy, push, DNS change, Cloudflare mutation, Supabase write, CRM write, production POST, customer message, Telegram/LINE send, Solis call, migration, destructive command, or secret read unless exact approval and evidence exist.
