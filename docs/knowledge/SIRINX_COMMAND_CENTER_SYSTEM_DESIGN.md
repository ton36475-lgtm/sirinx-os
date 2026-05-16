# SIRINX Command Center System Design

Date: 2026-05-17
Status: design locked for review
Scope: documentation and backlog only

## Executive Summary

SIRINX needs two separated operating surfaces:

- `www.sirinx.co` is the public company website and revenue surface.
- SIRINX OS Command Center is the internal control plane for website operations, lead health, release gates, Hermes, Obsidian memory, Solis intelligence, approvals, audits, and marketing execution.

The Command Center must connect to the real website through read-only status, controlled backend APIs, and explicit approval gates. It must not replace, embed, or expose internal operations on the public homepage.

## Non-Negotiable Boundaries

- Public website source of truth: `/Users/sirinx/restore-sources/ton36475-lgtm-sirinx`.
- Command Center source of truth: `/Users/sirinx/sirinx-os`.
- Internal dashboard, Hermes, WarRoom, mobile experiments, and agent control surfaces stay off `www.sirinx.co`.
- Production writes need explicit approval at the moment of action.
- No `.env`, token, credential, or raw chat log may become memory or documentation.
- Solis integration starts as read-only telemetry and recommendation only.

## System Planes

| Plane | Main surface | Source | Purpose | Write policy |
| --- | --- | --- | --- | --- |
| Revenue Plane | `www.sirinx.co` | `ton36475-lgtm/sirinx` | Public solar website, SEO/AEO, assessment, contact, chatbot | Website deploy only after approval |
| Edge Plane | `sirinx.co`, `www.sirinx.co`, future `api.sirinx.co` | `sirinx-os/infra/cloudflare` | Apex redirect, lead capture bridge, routing, Cloudflare Workers | Deploy/DNS/secret changes require approval |
| Control Plane | local Command Center, future `dev.sirinx.co` | `sirinx-os` | Gates, inventory, website health, approvals, audit, Hermes state | Local dry-run by default |
| Intelligence Plane | local solar-intelligence service | `sirinx-os/apps/solar-intelligence` | Proposal, quotation, load taxonomy, Solis read-only logic | No physical control without pilot approval |
| Operations Plane | future internal subdomains | audit clones and selected apps | Admin, customer, contractor, automation, marketing | Build/auth/security review first |
| Memory Plane | Obsidian vault and docs | local markdown only | Runbooks, decisions, summaries, knowledge digest | No secrets, no raw chat logs |

## Current Proven Building Blocks

| Capability | Current file or endpoint | Role |
| --- | --- | --- |
| Public routing | `/Users/sirinx/restore-sources/ton36475-lgtm-sirinx/client/src/App.tsx` | Public route map and admin route exclusion |
| Public lead API | `/Users/sirinx/restore-sources/ton36475-lgtm-sirinx/server/routers.ts` | `lead.submit`, contact audit, admin lead workflow |
| Public schema | `/Users/sirinx/restore-sources/ton36475-lgtm-sirinx/drizzle/schema.ts` | Users, leads, projects, contact submissions, page views, events |
| Contact fallback | `/Users/sirinx/restore-sources/ton36475-lgtm-sirinx/client/src/pages/Contact.tsx` | Email/LINE fallback when backend transport fails |
| Website status | `GET http://127.0.0.1:8711/api/website` | Local management view of public deployment state |
| Repo inventory | `GET http://127.0.0.1:8711/api/project-inventory` | Subdomain map, blockers, dirty repo state |
| Vibe workflow | `GET http://127.0.0.1:8711/api/vibe-command-center` | Existing process lane and function cards |
| Approval queue | `GET http://127.0.0.1:8711/api/approval-queue` | Human approval queue surface |
| Audit trail | `GET http://127.0.0.1:8711/api/audit-events` | Dry-run and future action evidence |
| Solar intelligence | `GET/POST http://127.0.0.1:8720/api/*` | Proposal, quotation, load taxonomy, usage profile |
| Solis guardrail | `apps/solar-intelligence/src/domain/solis-load-control.ts` | Read-only, simulation, approval and pilot-mode decision model |
| Lead edge bridge | `infra/cloudflare/main-router/src/worker.js` | Staged D1 lead capture handler |

## Target Command Center Layout

The Command Center should be organized into operational lanes instead of a single flat dashboard.

1. Website Control
   - `www.sirinx.co` status
   - latest deployment
   - route health
   - lead API health
   - contact fallback status
   - SEO/AEO 77-province coverage
   - PageSpeed/Core Web Vitals status

2. Lead And Revenue Ops
   - new lead count
   - fallback lead queue
   - lead API failure rate
   - qualification stage
   - source attribution
   - LINE/email handoff status
   - owner notification status

3. Solar Intelligence
   - assessment assumptions
   - quotation draft status
   - ROI/payback disclaimer state
   - proposal readiness
   - claim-guard blockers
   - Solis read-only telemetry readiness

4. Subdomain Operations
   - `admin.sirinx.co`
   - `customer.sirinx.co`
   - `contractor.sirinx.co`
   - `automation.sirinx.co`
   - `marketing.sirinx.co`
   - build/check/auth/security status per candidate

5. Approval And Audit
   - pending approvals
   - blocked actions
   - dry-run results
   - kill switch state
   - external-write switches
   - audit evidence

6. Hermes And Obsidian
   - Hermes dashboard state
   - Hermes gateway state
   - kanban state
   - knowledge digest state
   - night-watch snapshots
   - long-running Codex memory rule

## Canonical Data Model

The production data model should be designed before any migration. Minimum entities:

| Entity | Purpose |
| --- | --- |
| `leads` | Website, chatbot, assessment, LINE, partner, and marketing leads |
| `contact_submissions` | Raw contact evidence and fallback audit |
| `customers` | Customer identity, consent state, contact policy |
| `sites` | Site address, utility, timezone, tariff, export limit, service boundary |
| `devices` | Inverters, loggers, meters, batteries, EV chargers, load controllers |
| `telemetry_snapshots` | Normalized read-only site telemetry |
| `site_alarms` | Solis alarms and internal safety events |
| `solar_assessments` | Calculator inputs, assumptions, outputs, disclaimers |
| `quotations` | Draft and approved quote records |
| `approval_requests` | Human approval scope, expiry, channel, evidence |
| `audit_events` | Append-only trace of dry-run, approval, deploy, and control actions |
| `seo_pages` | Province pages, metadata, status, lead count |
| `campaigns` | Marketing campaigns, budgets, source attribution |
| `agent_runs` | Hermes/Codex/AI agent work packets and outcomes |

## Command Center Backlog

| Priority | Work package | Target area | Output | Gate |
| --- | --- | --- | --- | --- |
| P0 | Lock public website baseline | Website Control | `www.sirinx.co` remains public Solar site only | No internal route exposure |
| P0 | Lead backend health card | Website Control | Shows lead API status, fallback state, last successful submission | No DB writes during design |
| P0 | Production blocker board | Approval And Audit | Critical blockers rendered with owner and stop condition | Uses existing inventory first |
| P1 | Lead capture implementation plan | Edge Plane | D1/Worker/API decision and rollback plan | Approval before deploy |
| P1 | Lead fallback queue visibility | Lead And Revenue Ops | View fallback path status and manual follow-up checklist | No PII leak in UI |
| P1 | SEO/AEO 77-province monitor | Website Control | Province route coverage, metadata status, sitemap status | Read-only audit first |
| P1 | PageSpeed budget panel | Website Control | LCP, CLS, INP, JS weight, image budget | Browser test only after approval |
| P1 | Solar calculator governance card | Solar Intelligence | Assumption version, disclaimer status, claim guard result | No guaranteed ROI claims |
| P2 | Solar Intelligence API cards | Solar Intelligence | Proposal, quotation, load taxonomy health | Local-only until reviewed |
| P2 | Subdomain preflight cards | Subdomain Operations | Build/auth/security state per candidate | No DNS changes |
| P2 | Hermes overnight job view | Hermes And Obsidian | Night-watch freshness and digest links | No external SaaS writes |
| P3 | Solis read-only telemetry pilot | Solar Intelligence | Site telemetry freshness and alarm state | Customer consent and API approval |
| P3 | Messaging bridge dry-run | Lead And Revenue Ops | LINE/Telegram dry-run payload review | Token rotation first |
| P4 | Approval-gated external actions | Approval And Audit | Approve/reject action flow with audit evidence | Explicit operator approval |
| P5 | Limited autopilot research | Solar Intelligence | Only after pilot evidence and engineer signoff | Separate production approval |

## Phase Sequence

1. Documentation lock
   - Produce this design, wiring plan, blocker and test matrix.
   - No runtime change.

2. Lead backend phase
   - Close `POST /api/trpc/lead.submit` production gap.
   - Keep contact fallback as backup.
   - Record lead health in Command Center.

3. Command Center visibility phase
   - Render website health, blockers, lead API state, SEO/AEO status, and PageSpeed budget.
   - Keep external writes disabled.

4. Solar Intelligence unification phase
   - Align frontend calculator assumptions with local solar-intelligence model.
   - Add claim-guard status.

5. Subdomain phase
   - Prepare one candidate at a time.
   - Build/check locally, then plan Cloudflare Access and deployment.

6. Solis read-only phase
   - Ingest or simulate telemetry.
   - Display freshness, alarms, and recommendation-only outputs.

7. Approval-gated production operations
   - Enable external writes only through switches, approvals, audit events, and rollback plans.

## Required Approval Points

- Any Cloudflare Pages, Worker, DNS, route, binding, or secret write.
- Any GitHub push, PR, repo setting, or workflow change.
- Any database migration or production data write.
- Any LINE, Telegram, email, SMS, or customer-facing send.
- Any Solis API credential setup, telemetry import, or physical control pilot.
- Any public exposure of Hermes, MCP servers, internal dashboards, or local AI.

## Design Acceptance Criteria

- The public website remains isolated.
- Command Center acts as a control plane, not a replacement website.
- Each implementation phase has a single entry point, test plan, approval gate, and rollback note.
- Lead backend is treated as the first implementation bottleneck.
- Solis and messaging remain read-only or dry-run until explicit approval.
- Documentation can be used by Codex Mobile and Hermes without reading secrets.
