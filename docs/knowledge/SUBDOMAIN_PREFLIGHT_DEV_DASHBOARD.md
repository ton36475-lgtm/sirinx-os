# Subdomain Preflight: dev.sirinx.co

Date: 2026-05-27
Candidate: `dev.sirinx.co` — Developer Command Center
Source: `apps/dev-dashboard` (local workspace)

## Why this candidate first

- Zero build step (plain Node.js static server + JS/CSS/HTML)
- Zero npm dependencies (no node_modules required)
- Already wired to read `127.0.0.1:8711` (HQ inventory API) via query param
- No Telegram/LINE/Supabase credentials needed
- Lowest deployment risk of all candidates

## Static analysis (Docker unavailable; file inspection only)

### server.mjs

- Syntax: valid ESM (import from node:fs, node:http, node:path, node:url)
- Listens on `DEV_DASHBOARD_HOST || 127.0.0.1` / `DEV_DASHBOARD_PORT || 8710`
- Path traversal mitigation present: `normalize(...).replace(/^(..\[/\\])+/, "")`
- Returns 404 JSON for missing files, 405 for non-GET
- Cache-control: `no-store` (appropriate for dashboard)
- **Finding**: host default is `127.0.0.1` which is wrong for Cloudflare Pages or any external access — would need override for deploy

### src/app.js

- Browser-side JS, no bundling
- Uses `URLSearchParams` to pick API base — good flexibility
- Talks to `localhost:8711` by default — needs env/var swap for production

### Risk flags

| Item | Status |
|---|---|
| Hardcoded Telegram tokens | None (no Telegram code) |
| Hardcoded Supabase URL/key | None |
| Hardcoded LINE secrets | None |
| `.env` leakage | No `.env` file in this app (good) |
| `sirinx.com` (wrong TLD) references | None found |
| Path traversal mitigated | Yes |
| HTTPS enforcement | Must enforce at Cloudflare Access layer |

## Build / type check results

**BLOCKER**: Docker daemon is not responding (`docker version` timed out after 5s).
`node --check` therefore could not execute.

Mitigation: manual reading of `server.mjs` and `src/app.js` confirms pure ESM Node 20+ syntax with no JSX, no TypeScript, no bundler — so `node --check` is near-trivial and very unlikely to fail on clean reads. Recommend re-running once Docker is up:

```bash
cd apps/dev-dashboard
node --check server.mjs
node --check src/app.js
```

## Proposed Cloudflare deployment shape (DRY RUN — not applied)

```jsonc
// apps/dev-dashboard/wrangler.jsonc (to be created on approval)
{
  "name": "sirinx-dev-dashboard",
  "compatibility_date": "2026-05-27",
  "pages_build_output_dir": "./src",
  "send_metrics": false
}
```

Steps (all require explicit human approval):

1. `wrangler pages project create sirinx-dev-dashboard --production-branch main`
2. `wrangler pages deploy ./src --project-name sirinx-dev-dashboard`
3. Add custom domain `dev.sirinx.co` in Cloudflare dashboard
4. Enable **Cloudflare Access** with MFA + IP allowlist (per AGENTS.md §7 Developer Layer)
5. No Workers, no routes, no KV, no R2 needed
6. Set browser-only environment in Pages: `DEV_DASHBOARD_API=https://api.sirinx.co`

## What this task did NOT do

- Did NOT deploy to Cloudflare (approval-only)
- Did NOT mutate DNS
- Did NOT push to GitHub
- Did NOT run any Telegram/LINE sends
- Did NOT read or expose any secrets
- Did NOT touch `www.sirinx.co` or `sirinx.co` Apex

## Critical blockers still standing (from plan)

1. Rotate/revoke legacy Telegram tokens before ANY production Telegram sends
2. Rewrite legacy `sirinx.com` Cloudflare configs to `sirinx.co` before any Worker deploy
3. `www.sirinx.co` stays isolated (this task respects that)
4. Checkpoint dirty worktrees (dev-dashboard is clean — not applicable)
5. Manual `.env` audit still needed across other candidates
