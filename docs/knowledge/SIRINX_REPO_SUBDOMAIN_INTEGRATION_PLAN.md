# SIRINX Repo And Subdomain Integration Plan

Date: 2026-05-16

## Operating Boundary

`www.sirinx.co` is locked as the public company website. Do not replace it with internal dashboards, war rooms, AI operations pages, mobile demos, or placeholder pages.

Current protected surfaces:

- `https://www.sirinx.co` -> public Solar Carport company website
- `https://sirinx.co` -> 301 redirect to `https://www.sirinx.co`
- Cloudflare Pages project: `sirinx-co`
- Public source of truth: `/Users/sirinx/restore-sources/ton36475-lgtm-sirinx`
- Management source: `/Users/sirinx/sirinx-os`

## Read-Only Management Endpoint

SIRINX HQ now exposes:

```text
GET http://127.0.0.1:8711/api/project-inventory
```

This endpoint checks repository state, subdomain candidates, integration gates, and blockers. It does not deploy, push, mutate Cloudflare, send Telegram/LINE messages, or read secret values.

## GitHub Audit Scope

Audited GitHub account: `ton36475-lgtm`

Local audit clones:

```text
/Users/sirinx/restore-sources/github-audit
```

Primary repositories:

| Repository | Role | Deployment decision |
| --- | --- | --- |
| `sirinx` | Public company website source | Keep as `www.sirinx.co` source of truth |
| `sirinx-os` | Local HQ, Hermes, Obsidian, management API | Internal management only |
| `sirinx-solar-energy` | Solar admin/customer/contractor suite | Candidate for subdomains after cleanup |
| `oz-corp-omega-dual-node` | Legacy war room / agent scaffold | Internal only; dirty worktree needs checkpoint |
| `automation-dashboard` | Automation UI | Candidate for `automation.sirinx.co` after auth review |
| `automation-system-backend` | Automation backend/API | Candidate for `automation-api.sirinx.co` after DB/auth review |
| `automated-marketing-agency` | Marketing ops | Candidate for gated `marketing.sirinx.co` |
| `sirinx-co` | Old placeholder homepage | Do not restore to main website |
| `oz_mobile_app` | Mobile/worker experiment | Not a web subdomain first |
| `automation-mobile-app` | Mobile automation app | Not a web subdomain first |
| `ghost-claw-os` | Mobile OS experiment | Keep out of website deployment path |
| `chokma-growth-os` | Separate brand growth site | Keep outside `sirinx.co` unless approved |

## Proposed Subdomain Map

| Host | Role | Source | Status |
| --- | --- | --- | --- |
| `www.sirinx.co` | Public website | `ton36475-lgtm/sirinx` restore source | Live, do not touch |
| `sirinx.co` | Apex redirect | `sirinx-main-router` | Live, monitor only |
| `dev.sirinx.co` | Developer command center | `sirinx-os/apps/dev-dashboard` | Prepare after approval |
| `hq.sirinx.co` | Hermes/SIRINX HQ | `sirinx-os` | Internal-only or Access gated |
| `admin.sirinx.co` | Solar admin/core dashboard | `sirinx-solar-energy/sirinx-app` | Build verification required |
| `customer.sirinx.co` | Customer portal | `sirinx-solar-energy/sirinx-customer` | Build verification required |
| `contractor.sirinx.co` | Contractor portal | `sirinx-solar-energy/sirinx-contractor` | Build verification required |
| `api.sirinx.co` | API proxy | `sirinx-solar-energy/cloudflare/worker-api-proxy` | Blocked until route review |
| `cdn.sirinx.co` | Image optimizer | `sirinx-solar-energy/cloudflare/worker-image-optimizer` | Blocked until route review |
| `automation.sirinx.co` | Automation dashboard | `automation-dashboard` | Build/auth review required |
| `marketing.sirinx.co` | Marketing operations | `automated-marketing-agency` | Gated internal app only |

Current public probe result: only `www.sirinx.co` and `sirinx.co` are live. Proposed subdomains are not publicly active yet.

## Integration Gates

### Telegram

Status: blocked for production.

Reason: audit found hardcoded Telegram bot-token patterns in legacy `sirinx-solar-energy` scripts. Do not run legacy Telegram send/report scripts until the bot token is revoked/rotated, literals are removed from source, and the integration uses secret storage.

Allowed now:

- Read Hermes gateway status.
- Keep Telegram/Hermes in manual safe mode.
- Create runbooks and dry-run commands.

Forbidden until cleanup:

- Real Telegram sends.
- Legacy script execution that contacts Telegram.
- Any source commit containing bot tokens or chat IDs.

### LINE OA

Status: planned only.

No production-safe LINE adapter was found. Keep LINE sends disabled until webhook verification, channel secret storage, allowed chat/room policy, and human approval gates are implemented.

### GitHub

Status: read-only ready.

GitHub inventory can be inspected. Push, PR, repo setting changes, and workflow changes require explicit approval.

### Cloudflare

Status: read-only ready.

Wrangler can inspect account, Pages projects, and deployments. DNS, route, deploy, secret, Pages custom-domain, and Worker writes require explicit approval.

## Critical Blockers

1. Rotate/revoke exposed Telegram credentials before enabling Telegram production sends.
2. Rewrite legacy `sirinx.com` Cloudflare configs to `sirinx.co` before any Worker deploy.
3. Keep `www.sirinx.co` isolated from internal apps.
4. Checkpoint dirty local worktrees before using them as deployment sources.
5. Review local `.env` presence manually without printing values.

## Safe Next Sequence

1. Select the first subdomain to prepare.
2. Run build/type checks for that source only.
3. Create a Cloudflare deployment plan without applying it.
4. Review DNS/custom-domain impact.
5. Apply only after explicit approval.
6. Verify production with `curl`, browser QA, and `/api/project-inventory`.
