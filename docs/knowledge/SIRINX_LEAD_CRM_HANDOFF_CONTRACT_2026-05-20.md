# SIRINX Lead CRM Handoff Contract

Date: 2026-05-20
Sources:
- `/Users/sirinx/restore-sources/github-audit/automated-marketing-agency`
- `/Users/sirinx/restore-sources/github-audit/chokma-growth-os`
Target repo: `/Users/sirinx/sirinx-os`
Contract version: `2026-05-20.lead-crm-handoff-contract.v1`
Mode: local schema comparison only
External writes: none
Database work: blocked

## Purpose

Create a SIRINX-owned lead handoff contract before any CRM, Supabase, Notion, ClickUp, Google Sheet, HubSpot, Meta, Telegram, LINE, or production lead-write integration.

The old marketing repos are useful as schema references, but they are not migration sources.

## Current SIRINX Lead Baseline

| Layer | Current source | Status |
| --- | --- | --- |
| Public intake | Cloudflare main-router lead handler | production path exists; writes remain gate-controlled |
| Local health | `/api/lead-health` | local self-test and safe GET probe |
| Qualification | `lead-qualification.mjs` | v2 reasons, risk flags, attribution, package lane |
| Audit packet | `/api/lead-event-audit` | local-only event/evidence packet, no raw contact storage |
| Handoff target | CRM/Supabase/Notion/ClickUp | not enabled |

## Field Groups

| Group | SIRINX fields | Old-repo pattern retained | Rule |
| --- | --- | --- | --- |
| Contact | `name`, `phone`, `email`, `lineUserId`, `telegramHandle` | CRM contact channels | Raw values stay in approved lead store only. Audit/preview shows evidence only. |
| Solar qualification | `monthlyBill`, `systemType`, `bessInterest`, `backupPriority`, `phaseType`, `roofArea`, `timeline` | Intent and value scoring pattern | Rewrite into solar/ESS semantics only. |
| Attribution | `utmSource`, `utmMedium`, `utmCampaign`, `utmContent`, `utmTerm`, `referrer`, `landingPage`, `deviceType` | campaign and UTM model | No cookies, access credentials, or ad tokens in lead entity. |
| Quality | `score`, `priority`, `workflowLane`, `packageLane`, `trafficStatus`, `solarSegment`, `riskFlags`, `reasons` | deterministic scoring and review flags | Deterministic, explainable, non-customer-facing until reviewed. |
| Audit | `leadEvents`, `automationRuns`, `lastContactedAt`, `reviewNotes`, `approvalEvidence` | event and automation run records | Append-only summaries; no raw chat logs or message bodies. |

## Handoff Stages

| Stage | API or owner | External write | Approval |
| --- | --- | --- | --- |
| Local intake | `/api/lead-health` | no | no |
| Local qualification | `/api/lead-health` | no | no |
| Local audit preview | `/api/lead-event-audit` | no | no |
| Target-specific approval packet | `/api/approval-queue` | no | yes |
| External CRM/database handoff | not enabled | no by default | yes |

## Rejected Runtime Dependencies

| Dependency | Decision |
| --- | --- |
| Direct CRM credential fields | blocked; credentials belong in approved secret storage only. |
| Direct ad-platform credential fields | blocked; connector approval required. |
| Broadcast/customer-message queues | blocked until recipient/channel/send approval exists. |
| Non-solar conversion statuses | rewrite into SIRINX solar lifecycle states. |
| Old MySQL/Drizzle migrations | blocked; SIRINX database target and RLS are not approved. |

## Local API

```bash
GET /api/lead-crm-contract
pnpm lead-crm-contract:test
```

The endpoint reports:

- `externalWrites=false`
- `crmWrites=false`
- `supabaseWrites=false`
- `customerVisible=false`
- `summary.databaseWorkReady=false`

## Acceptance Gates

- Do not migrate old MySQL/Drizzle schemas.
- Do not store CRM or ad-platform credentials in lead schema, docs, or memory.
- Do not enable broadcast/customer-message queues without recipient and send approval.
- Do not write external CRM/Supabase/Notion/ClickUp until target workspace/table/list/page is approved.
- Do not convert local scoring into customer-facing claims or quotes without sales/engineering review.

## Next Step

Use `/api/lead-event-audit` as the evidence packet before any CRM handoff. Create a target-specific approval packet before any external CRM or database write.
