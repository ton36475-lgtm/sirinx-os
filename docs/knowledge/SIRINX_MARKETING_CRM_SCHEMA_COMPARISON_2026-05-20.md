# SIRINX Marketing And CRM Schema Comparison

Date: 2026-05-20
Sources:
- `/Users/sirinx/restore-sources/github-audit/automated-marketing-agency`
- `/Users/sirinx/restore-sources/github-audit/chokma-growth-os`
Target system: `/Users/sirinx/sirinx-os`
Mode: schema comparison only, no migration
External writes: none
Secrets read or printed: none

## Goal

Compare old marketing/CRM repositories against the current SIRINX lead qualification and sales-engineering workflow so the useful parts can be integrated later without breaking the public lead backend.

## Current SIRINX Baseline

| Area | Current source | Current behavior |
| --- | --- | --- |
| Public lead intake | Cloudflare main-router lead handler | Accepts public lead payload, writes D1 only in production handler path. |
| Local health | `services/dev-control-api/src/lead-health.mjs` | Runs local mock D1 self-test and safe production GET probe. |
| Qualification | `services/dev-control-api/src/lead-qualification.mjs` | Scores bill, battery/backup intent, source, contact channels, system size, and timeline. |
| ROI | `services/dev-control-api/src/roi-preview.mjs` | Computes local planning preview from current package list and assumptions. |
| Proposal | proposal draft/review modules | Local-only; external send is blocked. |

## Source Schema Comparison

| Concept | `automated-marketing-agency` | `chokma-growth-os` | SIRINX decision |
| --- | --- | --- | --- |
| Campaigns | Campaign objective, status, budget, audience, KPI, Meta ids, ROAS/CPA. | Campaign slug, channel, landing path, spend, target CPA/ROI. | Use as future marketing-campaign model, not immediate DB migration. |
| Leads | Contact fields, source, status, score, HubSpot/Meta ids, enriched data. | Full name, phone, LINE, Telegram, source type, status, UTM fields, intent, predicted value, acquisition cost. | Use SIRINX-specific subset: contact, source, UTM, bill/intent, qualification score, workflow lane. |
| Lead events | Not primary in inspected schema section. | `leadEvents` captures page view, form submit, contact, status change, AI action, broadcast events. | Strong candidate for future audit/event model. |
| Customer profile | Not primary in inspected schema section. | `customerProfiles` links lead to follow-up status, segment, value profile. | Adapt to solar customer profile after CRM approval. |
| Automation runs | Agent tasks exist for marketing agents. | `automationRuns` tracks lead scoring, broadcast follow-up, campaign optimizer, CRM summary. | Candidate for Command Center automation status, local-only first. |
| Broadcast queues | Not primary in inspected schema section. | LINE/Telegram/SMS queue model. | Keep blocked until Telegram/LINE recipient/token gate is solved. |
| Quality scoring | Agent-led lead scoring task. | `leadQuality.ts` implements deterministic scoring with risk flags and notification content. | Useful scoring pattern, but rewrite for solar/ESS semantics. |

## Useful Patterns To Keep

1. UTM attribution fields should be added to the future SIRINX lead read model.
2. Lead events should become an append-only audit trail before CRM writes.
3. Lead quality should keep deterministic reasons and risk flags so sales can trust it.
4. Automation runs should record planned action, actual action, status, review notes, and target entity.
5. Broadcast queues must stay separate from lead scoring because messaging is externally visible.

## Patterns To Reject Or Rewrite

| Pattern | Reason |
| --- | --- |
| Lottery/casino/VIP terminology from `chokma-growth-os` | Not SIRINX solar domain. Rewrite into residential, home office, C&I, hotel, factory, EV/BESS segments. |
| Generic agency assumptions from `automated-marketing-agency` | Needs SIRINX-specific service model and consent path. |
| HubSpot/Meta write fields as direct runtime dependency | External SaaS write gate not approved. |
| Broadcast send flow | Telegram/LINE gate remains blocked. |
| MySQL schema as direct migration | Current SIRINX public backend uses Cloudflare/D1 path and local docs; migration target is not approved. |

## Proposed SIRINX Lead Entity Upgrade

Add only after a separate schema task:

| Field group | Candidate fields |
| --- | --- |
| Contact | `name`, `phone`, `email`, `lineUserId`, `telegramHandle` |
| Solar qualification | `monthlyBill`, `systemType`, `bessInterest`, `backupPriority`, `phaseType`, `roofArea`, `timeline` |
| Attribution | `utmSource`, `utmMedium`, `utmCampaign`, `utmContent`, `utmTerm`, `referrer`, `landingPage`, `deviceType` |
| Quality | `score`, `priority`, `workflowLane`, `packageLane`, `riskFlags`, `reasons` |
| Audit | `leadEvents`, `automationRuns`, `lastContactedAt`, `reviewNotes` |

## Implementation Sequence

1. Do not migrate old MySQL schemas.
2. Extend current `lead-qualification.mjs` only after adding tests for UTM, risk flags, and solar segment reasons.
3. Add local-only lead event/audit proposal before CRM writes.
4. Keep notification content local until Telegram/LINE recipient/token gates pass.
5. Add CRM handoff only after target workspace/list and schema ownership are approved.

## Acceptance Gates

| Gate | Required evidence |
| --- | --- |
| Domain rewrite | No lottery/casino terminology remains in SIRINX solar lead model. |
| Test coverage | New scoring fields must have deterministic unit tests. |
| PII safety | Contact fields are not printed in logs beyond local test fixtures. |
| Messaging safety | No LINE/Telegram send without recipient/token approval. |
| CRM safety | No HubSpot/ClickUp/Notion/Supabase write without target approval. |
| Public website safety | Existing production lead path remains stable. |

## Next Local Task

Create a SIRINX-specific lead-quality v2 proposal with UTM/risk/reason fields, then implement it locally behind tests before any CRM or messaging integration.
