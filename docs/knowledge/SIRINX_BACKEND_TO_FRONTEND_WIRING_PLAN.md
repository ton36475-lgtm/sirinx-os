# SIRINX Backend To Frontend Wiring Plan

Date: 2026-05-17
Status: design locked for review
Scope: documentation only, no runtime change

## Purpose

This document defines how the SIRINX public website, backend APIs, Cloudflare edge layer, Command Center, Solar Intelligence service, and future internal subdomains should connect without mixing public and internal surfaces.

The first implementation phase after this design is lead backend repair because lead capture is the current bottleneck for website revenue and marketing operations.

## Source Surfaces

| Surface | Source | Role |
| --- | --- | --- |
| Public website | `/Users/sirinx/restore-sources/ton36475-lgtm-sirinx` | Customer-facing solar website |
| Public frontend routes | `client/src/App.tsx` | Home, solar carport, assessment, contact, projects, blog |
| Public backend routers | `server/routers.ts` | tRPC lead, project, blog, analytics, chatbot |
| Public schema | `drizzle/schema.ts` | Website database tables |
| Command Center API | `services/dev-control-api/server.mjs` | Local management API |
| Command Center UI | `apps/dev-dashboard/src/app.js` | Local operational dashboard |
| Project inventory | `services/dev-control-api/src/project-inventory.mjs` | Repo and subdomain control map |
| Solar Intelligence | `apps/solar-intelligence/src/server.ts` | Proposal, quotation, usage, load taxonomy |
| Cloudflare edge router | `infra/cloudflare/main-router/src/worker.js` | Apex redirect, Pages proxy, staged lead handler |

## Public Website Wiring

### Current frontend route map

| Route | Purpose | Backend dependency |
| --- | --- | --- |
| `/` | Public homepage | Mostly static/public assets |
| `/solar-carport` | Flagship Solar Carport page | Static content and metadata |
| `/solar-carport/:province` | Province SEO/AEO page | Static SEO build and metadata |
| `/assessment` | Solar calculator | Client-side calculator, contact prefill |
| `/contact` | Lead capture | `trpc.lead.submit`, fallback email/LINE |
| `/projects` | Public portfolio | `project.list` when backend available |
| `/blog`, `/blog/:slug` | Content and SEO | `blog.list`, `blog.getBySlug` when backend available |
| `/pricing` | Package CTA | Contact prefill |
| `/admin` | Public-blocked admin path | NotFound on public site |

### Current public tRPC routers

| Router | Public use | Admin use | Notes |
| --- | --- | --- | --- |
| `lead` | `submit` | `list`, `getById`, `update`, `stats` | First production bottleneck |
| `blog` | `list`, `getBySlug` | create/update/delete/adminList | Keep admin off public route |
| `project` | `list` | create/update/delete/adminList | Public portfolio source |
| `analytics` | `trackPageView`, `trackEvent` | pageViews/events | Needs production data policy |
| `chatbot` | `chat` | none | Has fallback and sanitization |
| `contact` | none | `list` | Contact submission audit |

## Required Lead Capture Flow

Target flow:

```text
/assessment or /contact
  -> Contact form payload
  -> /api/trpc/lead.submit
  -> Cloudflare Worker or backend route
  -> lead store
  -> contact submission audit
  -> owner notification or approval queue
  -> Command Center lead health card
  -> fallback email/LINE only if backend fails
```

Minimum lead payload:

| Field | Requirement | Notes |
| --- | --- | --- |
| `source` | required with default `contact` | `contact`, `assessment`, `partner`, `line` |
| `name` | required | Customer-facing validation |
| `phone` | production required | Worker handler already requires phone |
| `email` | optional | Validate if provided |
| `company` | optional | Useful for B2B qualification |
| `interest` | optional | Solar Carport, Rooftop, BESS, EV, O&M |
| `budget` | optional | Keep as range, not guarantee |
| `timeline` | optional | Qualification |
| `monthlyBill` | optional | From calculator |
| `message` | optional | Sanitize and store |

## Lead Backend Implementation Options

| Option | Description | Pros | Risks | Recommendation |
| --- | --- | --- | --- | --- |
| A | Deploy staged Cloudflare Worker D1 lead handler | Fast, edge-native, already staged | Must verify tRPC envelope, D1 binding, route ownership | Best first production repair |
| B | Run bundled Node backend behind Pages/Worker | Reuses existing tRPC/server logic | Hosting, DATABASE_URL, auth, runtime complexity | Later, if admin CMS needs full backend |
| C | Use Supabase-backed admin app first | Aligns with solar admin suite | Requires RLS/env/auth review | Not first for public lead gap |
| D | Keep fallback only | No deploy risk | Manual handling, weak automation, poor reporting | Temporary mitigation only |

Decision for Phase 1: implement Option A first, then feed Command Center with read-only lead health. Do not remove fallback.

## Command Center Wiring

The Command Center should consume status endpoints rather than directly mutating production.

| Command Center card | Source endpoint or file | Data shown |
| --- | --- | --- |
| Website Status | `/api/website` | public URL, preview URL, deployment, repo commit, route state |
| Project Inventory | `/api/project-inventory` | repos, subdomains, blockers, dirty state |
| Vibe Process | `/api/vibe-command-center` | process lane, function cards, operating rule |
| Approval Queue | `/api/approval-queue` | pending, approved, rejected, blocked |
| Audit Events | `/api/audit-events` | dry-run and future external-write evidence |
| Brain | `/api/brain` | approved local knowledge notes |
| Lead Backend Health | new read-only endpoint after Phase 1 | lead route status, D1 availability, last check |
| SEO/AEO Health | new read-only endpoint after Phase 2 | 77 province route coverage, sitemap, metadata |
| PageSpeed Budget | new read-only endpoint after Phase 2 | latest local or production performance budget |
| Solis Telemetry Readiness | new read-only endpoint after Phase 3 | consent, API mode, telemetry freshness, alarms |

## Solar Intelligence Wiring

Current local endpoints:

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | service health |
| `GET/POST /api/proposal` | solar proposal generation |
| `GET/POST /api/ci-bess` | BESS sizing and design |
| `GET/POST /api/load-taxonomy` | load classification |
| `GET/POST /api/usage-profile` | customer usage profile |
| `GET/POST /api/quotation` | quotation draft |
| `GET /api/competitor-intelligence` | competitor intelligence draft |
| `POST /api/*/obsidian/sync` | local Obsidian sync |
| `GET/POST /api/projects` | local project records |

Target integration:

```text
Website calculator
  -> calculator assumptions version
  -> Solar Intelligence proposal model
  -> claim guard
  -> draft quotation
  -> contact lead payload
  -> Command Center review
```

Rules:

- Calculator and quotation must share one assumption version.
- Savings, ROI, payback, and tax benefit outputs stay estimates.
- Final quote requires measured bill, site survey, and engineer verification.
- Obsidian sync must store summaries and decisions, not raw secrets or raw chat logs.

## Chatbot Wiring

Current chatbot already has:

- public `chatbot.chat` route
- SIRINX-specific system prompt
- deterministic fallback
- sanitization
- rule against guaranteed ROI/payback

Target upgrade:

1. Keep chatbot public and bounded.
2. Add lead qualification state only inside the user session.
3. Convert serious intent into contact lead payload.
4. Send the lead into the same backend path as `/contact`.
5. Surface chatbot lead health in Command Center.

Forbidden:

- Public chatbot cannot run internal commands.
- Public chatbot cannot access secrets.
- Public chatbot cannot trigger Telegram/LINE/customer sends directly.
- Public chatbot cannot promise final pricing, guaranteed savings, or approval.

## Subdomain Wiring

| Host | Source | Required first check |
| --- | --- | --- |
| `dev.sirinx.co` | `sirinx-os/apps/dev-dashboard` | Cloudflare Access plan and no public secrets |
| `hq.sirinx.co` | `sirinx-os` | Internal-only design and Access gate |
| `admin.sirinx.co` | `sirinx-solar-energy/sirinx-app` | Next build, Supabase env mapping, auth boundary |
| `customer.sirinx.co` | `sirinx-solar-energy/sirinx-customer` | Next build, customer auth, RLS plan |
| `contractor.sirinx.co` | `sirinx-solar-energy/sirinx-contractor` | Next build, contractor auth, job data boundary |
| `automation.sirinx.co` | `automation-dashboard` | Auth, backend URL, WebSocket policy |
| `marketing.sirinx.co` | `automated-marketing-agency` | Connector filtering, tenant/auth review |
| `api.sirinx.co` | selected API Worker/backend | `.com` to `.co` route rewrite and security review |
| `cdn.sirinx.co` | image optimizer Worker | `.co` route rewrite and image policy |

## Implementation Order

### Phase 0: Documentation lock

Output:

- System design
- Backend-to-frontend wiring plan
- Blockers and test matrix

No runtime change.

### Phase 1: Lead backend repair

Output:

- Production-safe lead capture route
- D1 or selected database write path
- Command Center lead health card
- Contact fallback retained

Verification:

- Unit test tRPC/Worker payload handling.
- Dry-run Worker locally.
- Preview route smoke test.
- Production smoke test only after approval.

### Phase 2: Command Center visibility

Output:

- Website health panel
- Lead health panel
- Blocker board
- SEO/AEO monitor
- PageSpeed budget panel

Verification:

- `pnpm verify`
- dashboard E2E
- browser visual check

### Phase 3: Solar calculator unification

Output:

- Shared assumption version
- Solar Intelligence result bridge
- Claim-guard status
- Quotation draft handoff

Verification:

- calculator unit tests
- solar-intelligence tests
- no guaranteed claim text

### Phase 4: Subdomain preflight

Output:

- One selected subdomain build reviewed at a time
- Auth boundary design
- Cloudflare plan

Verification:

- build/typecheck
- local browser QA
- no public route until approval

### Phase 5: Solis read-only pilot

Output:

- telemetry connector design
- site mapping
- data freshness and alarm card
- recommendation-only optimizer

Verification:

- no command execution in read-only mode
- stale telemetry and alarm block tests
- customer consent evidence before real API use

## Stop Conditions

Stop implementation and return to review if any of these occur:

- source changes outside the approved phase
- `.env` or secret content appears in output
- public homepage changes unexpectedly
- lead backend requires unapproved secret or binding write
- Cloudflare route would affect `www.sirinx.co` beyond approved scope
- messaging bridge wants to send a real customer message
- Solis path requires control access instead of read-only telemetry
