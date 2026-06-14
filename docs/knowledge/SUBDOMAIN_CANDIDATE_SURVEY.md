# Subdomain Candidate Survey

Date: 2026-05-27
Source: `apps/` in sirinx-os workspace + plan from `SIRINX_REPO_SUBDOMAIN_INTEGRATION_PLAN.md`

## Candidates ranked by deployment readiness

### Tier 1 — ready for dry-run deploy (after approval + Docker up)

| Candidate | Subdomain | Notes |
|---|---|---|
| `apps/dev-dashboard` | `dev.sirinx.co` | Zero deps, static server, preflighted — see `SUBDOMAIN_PREFLIGHT_DEV_DASHBOARD.md` |

### Tier 2 — build step required, needs deeper review

| App | Proposed host | Framework | Build command | Notes |
|---|---|---|---|---|
| `apps/centerbrain-shell` | (internal candidate, not in plan table) | Next.js 16 + React 19 + Tailwind | `next build` (standalone output) | Has `.next/` cache already; needs Cloudflare Pages Next adapter or Docker deploy |
| `apps/solar-intelligence` | `opal.sirinx.co` candidate (Solar Layer per AGENTS.md §7) | TypeScript + Hono/tsx | `tsc --noEmit` (type check) | Has vitest tests, obsidian sync, BESS engine — domain-heavy |
| `apps/sirinx-site` | (internal mirror) | Static, `wrangler.jsonc` exists | `node scripts/build.mjs` | Already named `sirinx-co` in wrangler — **do NOT deploy from here** without confirming this is not the `ton36475-lgtm/sirinx` source of truth |

### Tier 3 — outside workspace, needs external audit

| Repo | Proposed host | Blocker |
|---|---|---|
| `ton36475-lgtm/sirinx` | `www.sirinx.co` | Live — do not touch |
| `ton36475-lgtm/sirinx-solar-energy` | `admin/customer/contractor/api/cdn.sirinx.co` | Hardcoded Telegram tokens; `sirinx.com` legacy configs |
| `ton36475-lgtm/automation-dashboard` | `automation.sirinx.co` | Not cloned in sirinx-os; auth review needed |
| `ton36475-lgtm/automation-system-backend` | `api/automation-api.sirinx.co` | DB + auth review |
| `ton36475-lgtm/automated-marketing-agency` | `marketing.sirinx.co` | Gated internal only |
| `ton36475-lgtm/oz-corp-omega-dual-node` | internal | Dirty worktree, legacy war room |

## What's missing to pick Tier 2 next

1. `apps/centerbrain-shell` — confirm intended subdomain (none in plan table)
2. `apps/solar-intelligence` — confirm this is the OPAL/Solar Layer candidate
3. `apps/sirinx-site` — resolve whether it replaces or duplicates the live restore source
4. Docker daemon must be brought back up to run `next build` / `tsc --noEmit`

## Recommendation sequence

1. Ship `dev.sirinx.co` first (this task's chosen candidate)
2. Then `opal.sirinx.co` via solar-intelligence once BESS engine tests pass
3. Then `admin/customer/contractor.sirinx.co` via sirinx-solar-energy after Telegram rotation + config rewrite
4. Then `automation.sirinx.co` after auth review + clone into workspace
5. `api.sirinx.co` / `cdn.sirinx.co` last (blocked on route review per plan)
