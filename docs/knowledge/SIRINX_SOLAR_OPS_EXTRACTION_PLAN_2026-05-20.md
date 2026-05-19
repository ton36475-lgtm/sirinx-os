# SIRINX Solar Ops Extraction Plan

Date: 2026-05-20
Source repo: `/Users/sirinx/restore-sources/github-audit/sirinx-solar-energy`
Target system: `/Users/sirinx/sirinx-os`
Mode: read-only source review, no runtime merge
External writes: none
Secrets read or printed: none

## Goal

Extract the useful solar-operations design from `sirinx-solar-energy` into the SIRINX Command Center backlog without changing the public website, Supabase, Cloudflare, Telegram, LINE, or production runtime.

This source repo is valuable because it contains a solar-oriented admin app, customer app, contractor app, Cloudflare worker sketches, SEO/province components, and Supabase-style schema. It is not safe to import as-is because it also contains deploy scripts, experimental future folders, and separate runtime assumptions.

## Reviewed Source Files

| Source | Finding | Extraction decision |
| --- | --- | --- |
| `database/schema.sql` | Defines `leads`, `customers`, `installations`, `contractors`, `seo_pages`, `agent_tasks`, `campaigns`, and `system_metrics`. | Use as entity map only; do not apply migration. |
| `sirinx-app/src/services/leads.ts` | Provides Supabase-backed lead list/create/update/delete with mock fallback. | Use service-boundary pattern for future read model; current production lead path remains Cloudflare D1. |
| `sirinx-app/src/services/customers.ts` | Provides customer read/create/update with MRR and system-size fields. | Candidate for future customer profile read model after CRM gate. |
| `sirinx-app/src/app/calculator/page.tsx` | Contains simple bill/province/roof-area ROI calculator with NPV/payback chart. | Use to cross-check local ROI assumptions only; do not replace current ESS package model. |
| `sirinx-customer/src/**` | Customer portal components for production, billing, warranty, support, and status. | Candidate for future `customer.sirinx.co` after auth/data contract. |
| `sirinx-contractor/src/**` | Contractor portal components for jobs, checklist, inventory, earnings, and photo upload. | Candidate for future `contractor.sirinx.co` after role/access model. |
| `cloudflare/worker-*/index.js` | SEO/image/API proxy worker sketches exist. | Route overlap must be reviewed before any worker import. |

## Entity Mapping

| Source entity | Current SIRINX target | Action |
| --- | --- | --- |
| `leads` | `/api/lead-health`, lead D1 handler, `lead-qualification.mjs` | Keep current public intake; map additional fields as proposal only. |
| `customers` | future CRM/customer profile module | Add after customer data policy and CRM workspace are approved. |
| `installations` | future project/install tracker | Useful after contractor workflow is scoped. |
| `contractors` | future contractor portal | Needs role-based auth, checklist, photo upload, and evidence storage design. |
| `seo_pages` | public website 77 province SEO/AEO system | Reference only; public website routes are already deployed and protected. |
| `agent_tasks` | Command Center agent/backlog lane | Candidate for local-only task status, not external task execution. |
| `campaigns` | marketing/CRM schema comparison | Merge conceptually with marketing repo comparison before DB change. |
| `system_metrics` | Command Center health cards | Candidate for local read-only metrics model. |

## Implementation Sequence

1. Keep `sirinx-solar-energy` as read-only source under `github-audit`.
2. Create a target entity contract for SIRINX OS before moving code:
   - lead
   - customer profile
   - installation/project
   - contractor
   - campaign
   - system metric
3. Cross-check ROI assumptions:
   - current SIRINX packages: OG-5, OG-10, H-5, H-10, H-15, H-20
   - legacy calculator variables: bill, effective tariff, province peak hours, roof area, system cost per kWp, NPV, degradation
4. Do not change Supabase or D1 until the schema contract is reviewed.
5. Do not run Cloudflare worker deploy scripts from the source repo.
6. Add only local API/read-model modules after tests exist.

## Acceptance Gates

| Gate | Required evidence |
| --- | --- |
| Source safety | No `.env`, token, private key, or deploy script execution. |
| Schema safety | All source entities mapped to SIRINX targets before migration. |
| Lead safety | Public website lead path remains unchanged unless exact task says otherwise. |
| ROI safety | Any reused calculator logic must label assumptions and pass local tests. |
| Cloudflare safety | Worker import requires route ownership and deploy approval. |
| Portal safety | Customer/contractor portals require auth and data boundary review. |

## Next Local Task

Create a local-only entity contract module for solar operations, then expose it in Command Center as read-only planning data. The module should not connect to Supabase or production data.
