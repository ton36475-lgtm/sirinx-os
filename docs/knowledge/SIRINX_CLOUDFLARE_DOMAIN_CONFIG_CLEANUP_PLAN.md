# SIRINX Cloudflare Domain Config Cleanup Plan

Date: 2026-05-17
Status: scan report and cleanup plan only
Scope: no Cloudflare writes, no deploy, no DNS changes

## Purpose

Legacy repo material still references `sirinx.com`, while the production target is `sirinx.co` and the protected public website is `www.sirinx.co`.

This plan records the cleanup scope before any Worker, Pages, CDN, API, or subdomain deployment. It is intentionally a plan, not a config rewrite.

## Current Production Boundary

| Host | Intended role | Current rule |
| --- | --- | --- |
| `www.sirinx.co` | Public company website | Protected; do not replace with internal apps |
| `sirinx.co` | Apex redirect | Should redirect to `www.sirinx.co` |
| `api.sirinx.co` | Future API surface | Not live until reviewed |
| `cdn.sirinx.co` | Future image/CDN surface | Not live until reviewed |
| `dev.sirinx.co` | Future Command Center | Cloudflare Access required |
| `admin.sirinx.co` | Future solar admin | Build/auth/RLS review required |
| `customer.sirinx.co` | Future customer portal | Build/auth/RLS review required |
| `contractor.sirinx.co` | Future contractor portal | Build/auth/RLS review required |

## Scan Result

Read-only scan found legacy `.com` references in:

| Area | Path | Cleanup decision |
| --- | --- | --- |
| Cloudflare setup docs | `/Users/sirinx/restore-sources/github-audit/sirinx-solar-energy/docs/cloudflare-setup-guide.md` | Historical doc only; do not execute as-is |
| Pages config | `/Users/sirinx/restore-sources/github-audit/sirinx-solar-energy/cloudflare/pages/wrangler.toml` | Rewrite site URL only if this Pages project is promoted |
| SEO Worker config | `/Users/sirinx/restore-sources/github-audit/sirinx-solar-energy/cloudflare/worker-seo-pages/wrangler.toml` | Blocked; routes must be `.co` and must not override current public SEO routes |
| SEO Worker code | `/Users/sirinx/restore-sources/github-audit/sirinx-solar-energy/cloudflare/worker-seo-pages/index.js` | Historical SEO worker; do not deploy over current website without route review |
| Cache rules | `/Users/sirinx/restore-sources/github-audit/sirinx-solar-energy/cloudflare/cache-rules.json` | Rewrite zone only after target Cloudflare zone is confirmed |
| Image optimizer config | `/Users/sirinx/restore-sources/github-audit/sirinx-solar-energy/cloudflare/worker-image-optimizer/wrangler.toml` | Candidate for `cdn.sirinx.co`; blocked until image policy review |
| Image optimizer code | `/Users/sirinx/restore-sources/github-audit/sirinx-solar-energy/cloudflare/worker-image-optimizer/index.js` | Allowlist must become `.co` domains |
| API proxy config | `/Users/sirinx/restore-sources/github-audit/sirinx-solar-energy/cloudflare/worker-api-proxy/wrangler.toml` | Candidate for `api.sirinx.co`; blocked until backend target is selected |
| API proxy code | `/Users/sirinx/restore-sources/github-audit/sirinx-solar-energy/cloudflare/worker-api-proxy/index.js` | Allowed origins and backend fallback must become `.co` or approved backend URL |
| App sitemap | `/Users/sirinx/restore-sources/github-audit/sirinx-solar-energy/sirinx-app/src/app/sitemap.ts` | Rewrite only if app is promoted to subdomain |
| Province page metadata | `/Users/sirinx/restore-sources/github-audit/sirinx-solar-energy/sirinx-app/src/app/solar/[province]/page.tsx` | Rewrite only if app is promoted; do not conflict with current public website |
| Future docs | `/Users/sirinx/restore-sources/github-audit/sirinx-solar-energy/future/**` | Reference only; not deployment source |
| Future OpenClaw docs | `/Users/sirinx/restore-sources/github-audit/sirinx-solar-energy/future-openclaw-hybrid/**` | Reference only; not deployment source |

## Cleanup Rules

1. Do not rewrite or deploy legacy Cloudflare workers directly into `www.sirinx.co`.
2. Rewrite `.com` to `.co` only in the selected deployment source for the selected subdomain.
3. Keep current `www.sirinx.co` public website as the source of truth.
4. Use `api.sirinx.co` only for approved API routes.
5. Use `cdn.sirinx.co` only for approved image optimization routes.
6. Use Cloudflare Access for internal surfaces before public DNS/custom-domain exposure.
7. Every Worker route change needs a rollback plan and production smoke test.

## Proposed Rewrite Map

| Legacy value | Candidate value | Notes |
| --- | --- | --- |
| `sirinx.com` | `sirinx.co` or `www.sirinx.co` | Use apex only for redirect; use `www` for public website |
| `www.sirinx.com` | `www.sirinx.co` | Public website only |
| `app.sirinx.com` | selected backend or `admin.sirinx.co` | Do not assume app backend exists |
| `api.sirinx.com` | `api.sirinx.co` | Future API route after backend review |
| `cdn.sirinx.com` | `cdn.sirinx.co` | Future CDN route after image policy |
| `images.sirinx.com` | `images.sirinx.co` or remove | Only if image surface is approved |
| `staging.sirinx.com` | `staging.sirinx.co` or preview URL | Use Cloudflare preview until staging policy exists |

## Pre-Deploy Checklist

- Confirm selected source repo and branch.
- Confirm no dirty/unrelated worktree changes.
- Confirm exact Cloudflare zone is `sirinx.co`.
- Confirm route patterns do not shadow `www.sirinx.co` public routes.
- Confirm all `.com` references in the selected source are intentional or rewritten.
- Confirm secrets are stored in Cloudflare/approved secret storage, not source.
- Confirm Access/auth policy for internal subdomain.
- Run syntax check and unit tests.
- Run local or preview smoke test.
- Prepare rollback to previous Worker/Pages deployment.
- Request explicit approval before deploy.

## Current Decision

For the next implementation phase, do not deploy any legacy worker. The only approved local implementation path is:

1. Keep `www.sirinx.co` protected.
2. Use `sirinx-os/infra/cloudflare/main-router` for the lead backend repair path.
3. Verify local main-router tests.
4. Add Command Center lead health.
5. Request explicit Cloudflare approval before any route or Worker deploy.
