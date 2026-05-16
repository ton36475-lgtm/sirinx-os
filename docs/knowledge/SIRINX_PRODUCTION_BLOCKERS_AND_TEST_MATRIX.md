# SIRINX Production Blockers And Test Matrix

Date: 2026-05-17
Status: design locked for review
Scope: documentation only, no tests executed in this change

## Purpose

This document defines the blockers, phase gates, and verification matrix for moving SIRINX from design to implementation without skipping work, touching the public website incorrectly, or creating unsafe production side effects.

The first implementation phase after these documents is lead backend repair.

## Current Production Blockers

| ID | Severity | Area | Blocker | Required resolution | Production impact |
| --- | --- | --- | --- | --- | --- |
| B-001 | Critical | Telegram | Legacy audit copy contains hardcoded Telegram token patterns | Revoke/rotate token, remove literals, move to secret storage, verify no source output leaks token | No production Telegram sends |
| B-002 | High | Lead backend | `POST /api/trpc/lead.submit` production path has shown `405` | Deploy or route a production-safe lead handler with D1/backend verification | Lead automation cannot be trusted |
| B-003 | High | Cloudflare | Legacy configs reference `sirinx.com` while target is `sirinx.co` | Rewrite route/domain config and review before Worker deploy | Worker route could target wrong domain |
| B-004 | High | Public website | `www.sirinx.co` must remain public solar website | Keep internal apps on subdomains only | Prevents homepage regression |
| B-005 | High | Customer messaging | LINE/Telegram real-send gates are not production-cleared | Add approval, allowed recipients, secret storage, dry-run review | No customer-facing sends |
| B-006 | High | Solis control | Read-only telemetry is not yet connected and control is unsafe | Consent, telemetry, digital twin, approval, kill switch, engineer signoff | No physical control |
| B-007 | Medium | GitHub sync | Public website repo is ahead of origin locally | Review, push or PR after approval | Remote source may lag deployment |
| B-008 | Medium | Dirty repos | Hermes and legacy local repos have untracked/dirty state | Checkpoint, ignore, or isolate before use | Not valid deployment sources |
| B-009 | Medium | Supabase/RLS | Admin/customer/contractor apps need env, schema, and RLS review | Build/typecheck/auth/RLS plan before exposure | Subdomains stay blocked |
| B-010 | Medium | Marketing ops | Marketing repo may contain unrelated connectors | Filter to SIRINX-safe marketing functions | No external campaign automation yet |
| B-011 | Medium | Analytics | Production analytics data policy is not fully locked | Define event schema, retention, privacy policy | Analytics remains limited |
| B-012 | Medium | Obsidian memory | Brain must not store secrets or raw chat logs | Summary-only memory protocol | Knowledge capture stays safe |

## Phase Gates

| Phase | Goal | Must pass before starting | Stop condition |
| --- | --- | --- | --- |
| P0 | Documentation lock | Design files exist and only docs changed | Runtime, config, deploy, or secret file touched |
| P1 | Lead backend repair | P0 accepted, Cloudflare/D1 plan approved | Lead handler cannot be verified without unapproved secrets |
| P2 | Command Center visibility | P1 lead route has testable health signal | Dashboard requires production write |
| P3 | Solar calculator unification | P2 health panels stable | Calculator output makes guaranteed ROI/payback claims |
| P4 | Subdomain preflight | Selected subdomain has clean source and build plan | Auth/RLS/env boundary unclear |
| P5 | Solis read-only pilot | Customer consent and API access process approved | Any path requires physical control |
| P6 | Messaging bridge dry-run | Token rotation and allowed recipient policy complete | Any real customer message would be sent |
| P7 | Production operations | Approval queue, audit, rollback, and kill switches validated | External write is not auditable |

## Test Matrix By Layer

| Layer | Command or method | When to run | Acceptance |
| --- | --- | --- | --- |
| Git hygiene | `git status --short --branch` | Before and after every phase | Only expected files changed |
| Static syntax | `pnpm verify` in `sirinx-os` | Command Center/runtime changes | Node syntax checks pass |
| Public website typecheck | `pnpm check` in public repo | Website source changes | TypeScript passes |
| Public website unit tests | `pnpm test` in public repo | Calculator, chatbot, lead, analytics changes | Tests pass |
| Public website build | `pnpm build` in public repo | Any website deploy candidate | Build succeeds and SEO static build completes |
| Cloudflare router syntax | `pnpm cloudflare:main-router:check` | Worker changes | Worker syntax passes |
| Worker local/dry-run | Wrangler local or unit tests | Lead backend repair | tRPC batch and non-batch payloads handled |
| Dashboard E2E | `pnpm dashboard:e2e` | Command Center UI changes | Desktop and mobile checks pass |
| Solar Intelligence typecheck | `pnpm solar:check` | Solar service changes | TypeScript passes |
| Solar Intelligence tests | `pnpm solar:test` | Calculator, quotation, Solis guardrail changes | Read-only and block conditions pass |
| Browser QA | Playwright or in-app browser | UI changes | No blank screen, overflow, broken CTA, or console blocker |
| Production smoke | `curl` and browser after approval | After deploy only | 200/redirect expected, lead route works, no homepage regression |
| Rollback check | deployment rollback plan | Before deploy | Previous known good deployment or route plan exists |

## Lead Backend Phase Test Plan

### Target behavior

The public contact form must be able to submit leads automatically. If the backend is down or blocked, fallback email/LINE remains available.

### Required tests

1. Payload extraction
   - tRPC batch payload
   - tRPC non-batch payload
   - missing name
   - missing phone
   - optional email/company/interest fields

2. Storage path
   - D1 binding exists in approved environment
   - `contact_leads` table can be created or migrated safely
   - insert returns lead ID and timestamp
   - raw payload is bounded and sanitized

3. Frontend behavior
   - successful submit shows success state
   - failed transport shows fallback state
   - fallback mailto contains readable summary
   - LINE link remains available

4. Command Center behavior
   - lead route health visible
   - last check timestamp visible
   - failure state visible
   - production write switch remains explicit

5. Production smoke after approval
   - `GET https://www.sirinx.co/contact/` returns 200
   - lead POST returns success
   - fallback is not triggered on success
   - audit evidence recorded

## Command Center Backlog Test Plan

| Backlog item | Test type | Acceptance |
| --- | --- | --- |
| Lead backend health card | API contract and UI test | Shows ok/warn/block without writing production |
| Production blocker board | Snapshot/UI test | Critical blockers visible and ordered |
| SEO/AEO 77-province monitor | Route audit | 77/77 province routes covered with metadata |
| PageSpeed budget panel | Browser/performance audit | LCP/CLS/INP budget stored as report, not guess |
| Solar calculator governance card | Unit and UI test | Assumption version and disclaimer visible |
| Subdomain preflight cards | Build metadata test | Candidate source, status, and approval gate shown |
| Hermes night-watch view | API/UI test | Latest digest and snapshot freshness shown |
| Messaging dry-run panel | Unit/UI test | Dry-run payload only, real-send disabled |
| Solis telemetry readiness card | Unit/UI test | Stale data, alarms, no consent, and kill switch block |

## SEO And AEO Test Matrix

| Area | Check | Acceptance |
| --- | --- | --- |
| Province routes | Route list or sitemap audit | 77 province pages exist |
| Metadata | title, description, canonical | Each province has unique metadata |
| Structured content | service, location, FAQ where applicable | No misleading claims |
| CTA | assessment and contact paths | Each page has clear lead path |
| Internal links | homepage, solar carport, assessment, contact | Crawlable route graph |
| Performance | image size, JS budget, lazy loading | No avoidable page weight regressions |
| Claims | savings/ROI/payback wording | Estimates only, no guarantee |

## Solis Safety Test Matrix

| Condition | Expected decision |
| --- | --- |
| read-only mode | simulation-only, no external command |
| simulation mode | simulation-only, no external command |
| kill switch active | blocked |
| customer consent inactive | blocked |
| homeowner override active | blocked |
| logger/inverter/meter offline | blocked |
| grid offline | blocked |
| active alarm | blocked |
| stale telemetry | blocked |
| battery SOC below reserve | blocked |
| charge/discharge over limit | blocked |
| missing approval in approval-required mode | needs approval |
| manual pilot with all gates passed | approved for execution only in pilot mode |

## Release Checklist

Before any production release:

- Confirm exact repo and branch.
- Confirm changed files.
- Confirm no `.env`, token, key, or private credential is included.
- Confirm no source outside approved scope changed.
- Run phase-specific checks.
- Record build/test output.
- Prepare rollback.
- Request explicit approval for deploy or external write.
- Perform production smoke test after deploy.
- Record result in Command Center and Obsidian summary.

## Documentation Change Verification

For this documentation-only phase:

- Expected changed files are only:
  - `docs/knowledge/SIRINX_COMMAND_CENTER_SYSTEM_DESIGN.md`
  - `docs/knowledge/SIRINX_BACKEND_TO_FRONTEND_WIRING_PLAN.md`
  - `docs/knowledge/SIRINX_PRODUCTION_BLOCKERS_AND_TEST_MATRIX.md`
- No runtime code should change.
- No tests are required for content-only documents, but `git diff --stat` and `git status` should be reviewed.

## Acceptance Criteria For Moving To Phase 1

- The three design artifacts exist.
- The backlog clearly prioritizes lead backend first.
- The blocker list names the production risks.
- The test matrix defines verification per layer.
- The public website remains untouched.
- Runtime files remain untouched.
- The next phase has a clear implementation target: production-safe lead backend and Command Center lead health visibility.
