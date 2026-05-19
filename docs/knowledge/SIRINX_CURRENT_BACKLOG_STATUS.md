# SIRINX Current Backlog Status

Date: 2026-05-19
Status: current, no hidden backlog; local test/debug passed, external execution gates remain explicit

## Cleared In This Pass

| Item | Status | Evidence |
| --- | --- | --- |
| Command Center design lock | Done | Commit `ebc8cc4 docs: lock command center system design` |
| Lead backend local preflight | Done | Commit `2b8c6c7 feat: add lead backend health preflight` |
| Main-router lead parser | Done locally | tRPC numeric-keyed batch, array batch, `input.json`, and mock D1 tests pass |
| Command Center lead health | Done locally | `GET http://127.0.0.1:8711/api/lead-health` |
| Cloudflare `.com` cleanup scope | Documented | `SIRINX_CLOUDFLARE_DOMAIN_CONFIG_CLEANUP_PLAN.md` |
| Local stack | Online | dev-control-api, dev-dashboard, solar-intelligence, sirinx-site |
| Public website ahead commits | Locally verified | `pnpm check`, `pnpm test` 162/162, `pnpm build`, SEO province routes 77/77 |
| Cloudflare main-router deploy | Done | `sirinx-main-router` deployed, version `4e66deca-89a5-4a1b-83a8-0dfaee4e3851` |
| Production lead POST smoke test | Done | Controlled D1 lead `ec8dd128-a57c-4d6d-b0f8-4b91c1b94c2b` created with source `codex-production-smoke` |
| Public website GitHub branch/PR | Done and merged | PR `https://github.com/ton36475-lgtm/sirinx/pull/1` merged to `main` as `1804e81 Merge public website production-ready release` |
| Home Solution SEO/AEO page | Done, deployed, and verified live | `www.sirinx.co/home-solution/` is live with indexable metadata, AEO schema, Home Solution content, and desktop/mobile browser verification |
| Command Center E2E stabilization | Done and committed | Dashboard renders each API panel independently so the Vibe status does not wait for slower Hermes/Executive endpoints |
| Local proposal writer | Done and committed | `POST /api/proposal-draft/write` writes local Obsidian drafts only after `confirmLocalWrite=true` |
| Local ROI preview | Done and committed | `GET/POST /api/roi-preview` routes assumptions to local package/payback previews with `externalWrites=false` |
| Proposal external-send review | Done and committed | `/api/proposal-review` and local review packet writer keep customer sends blocked until evidence is complete |
| Codex Mobile review packet | Done and committed | `/api/mobile-review-packet` produces mobile-readable evidence without external approval authority |
| External gate approval packets | Done and committed | `/api/external-gate-packets` defines 9 exact approval phrase packets with `canExecuteNow=false` |
| External gate audit preflight | Done and committed | `/api/external-gate-preflight` marks 9 gates as ready/blocked/manual with `externalWrites=false` |
| PR #1 dirty merge state | Resolved and pushed | Website PR #1 now includes `1901215 merge: sync public website branch with main`; GitHub reports `mergeStateStatus=CLEAN` |
| PR #1 review/check inspection | Done read-only | No PR comments, no reviews, no review threads, and no reported status checks |
| Cloudflare Pages preview | Done | Preview `d641924d` source `aacad5e` passed HTTP, browser smoke, and Lighthouse checks |
| Public website production deploy | Done | Production deployment `ab4731e9` source `cfb1a72` is active for `www.sirinx.co` |
| Home Solution hydration SEO hotfix | Done | Commits `f594027` and `cfb1a72` keep `/home-solution/` robots `index, follow` and canonical trailing slash after React hydration |
| Public website preload/main-thread pass | Done, deployed, and verified | Commit `8c47afb perf: reduce public page initial load pressure`; Cloudflare production deployment `7d12e73a-6319-4a24-b1b3-9c1f033ddd12` |
| Cloudflare JavaScript Detection diagnosis | Done, external gate identified | Lighthouse attributes live mobile TBT mostly to `/cdn-cgi/challenge-platform/scripts/jsd/main.js`; current Wrangler OAuth can deploy Pages but cannot change Bot Management API (`403`) |
| Province route hydration SEO hard audit | Done, fixed, deployed, and verified | Commit `ff20cf1 fix: keep province solar routes indexable after hydration`; Cloudflare production deployment `9062be52-2f3d-4597-b9f1-0347f0215b7e`; live mobile and desktop hydration passed `94/94` sitemap routes |
| Hero live energy background restoration | Done, deployed, and verified | Commit `80266c7 fix: restore hero live energy background`; Cloudflare production deployment `594a7ce3-ce28-4c55-b9f5-44fd26ea4ce3`; live desktop/mobile DOM confirmed energy overlay and CSS animation |

## Current Truth

- `www.sirinx.co` remains protected as the public Solar company website.
- `sirinx-os` is on branch `codex/urgent-backlog-execution` with Command Center local-only workflow phases committed through external gate audit preflight and refreshed backlog status.
- Public website source `/Users/sirinx/restore-sources/ton36475-lgtm-sirinx` is clean on branch `codex/home-solution-seo-hydration` and tracks `origin/main`.
- GitHub `main` is at `80266c7 fix: restore hero live energy background`.
- PR #1 is merged. It is no longer a release blocker.
- Public website production is deployed on Cloudflare Pages as `594a7ce3-ce28-4c55-b9f5-44fd26ea4ce3`, branch `main`, source `80266c7`, URL `https://594a7ce3.sirinx-co.pages.dev`.
- Rollback candidates are `9062be52` source `ff20cf1`, `7d12e73a` source `8c47afb`, `ab4731e9` source `cfb1a72`, `ff6ab27c` source `f594027`, `cfecbf8c` source `1804e81`, and pre-release `fdacecc8` source `2d5270a`.
- Home Solution work passed typecheck, tests, production build, static SEO checks, route checks, image asset checks, desktop/mobile browser QA, no-secret review, Cloudflare preview, production deploy, and live hydration SEO checks.
- Hard live audit after `ff20cf1`: sitemap static audit passed `94/94` routes with no route/link/asset failures, live mobile hydration passed `94/94`, and live desktop hydration passed `94/94`; no runtime errors, no unexpected `noindex`, no horizontal overflow, no weak root content, and no old internal/AI-WarRoom homepage text found.
- Final live Lighthouse lab result after `ff20cf1`: homepage SEO 100/accessibility 100, Home Solution SEO 100/accessibility 100, province page SEO 100/accessibility 100, CLS <= 0.015. Desktop performance is `home 84`, `home-solution 88`, `province 80`; mobile performance is `home 54`, `home-solution 49`, `province 53`, still limited mainly by Cloudflare JavaScript Detection and mobile main-thread/LCP cost.
- Hero live energy background note: the original motion feel was lost when `c902ddd` replaced `framer-motion` with `static-motion` for PageSpeed and `8c47afb` delayed first hero rotation. `80266c7` restores the live energy effect using lightweight CSS-only overlay classes on `HeroSlideshow`; do not remove `.energy-live-overlay`, `.energy-grid`, `.energy-beam`, or `.energy-pulse` during future performance passes without an explicit visual replacement.
- Live validation after `80266c7`: desktop and mobile DOM confirmed overlay/grid/3 beams/2 pulses, CSS animation `sirinx-energy-beam`, robots `index, follow`, no overflow, and no runtime errors. Home Lighthouse after restoration: mobile performance `54`, desktop performance `86`, SEO/accessibility `100`, CLS `0.001`.
- Local Lighthouse without Cloudflare challenge script improved materially after the preload pass: mobile performance `63` for both homepage and Home Solution, desktop performance `91` homepage and `90` Home Solution, with TBT `0-22ms`.
- Current `sirinx-os` dashboard work passed syntax verification, dashboard brain checks, desktop/mobile Playwright E2E, screenshot review, local Obsidian write smoke, strict secret scan, and diff whitespace checks.
- Lead handler is deployed through Cloudflare main-router and production POST smoke passed.
- Command Center lead health intentionally still uses safe GET probes and does not create production leads by itself.
- Contact fallback stays live until real production lead traffic has been observed.
- Obsidian Brain Hub contains summary-only notes for the Home Solution release checklist, Cloudflare deploy safety, SEO/AEO, image performance, secrets, approval gates, and Solis/agent readiness. These are knowledge records, not approval to deploy.

## Remaining Backlog By Type

### Approval-Gated

| Item | Why blocked | Required approval |
| --- | --- | --- |
| Expose `dev.sirinx.co` or other internal subdomains | DNS/Pages/Access changes are external writes | Explicit Cloudflare + Access approval |
| Additional Cloudflare route/DNS/secret changes | External cloud mutation beyond deployed main-router | Explicit Cloudflare approval |
| Cloudflare Bot Management / JavaScript Detection tuning | Live mobile TBT is dominated by `/cdn-cgi/challenge-platform/scripts/jsd/main.js`; Wrangler OAuth can deploy Pages but Bot Management API returned `403` | Cloudflare dashboard/API token with Bot Management write permission, then decide whether to disable JS Detection or create a lower-friction rule for the public marketing site |
| Real Telegram/LINE sends | Customer-facing external messages | Valid recipient target, token rotation/confirmation, secret storage, and send approval |

### Credential Or Human Manual Gate

| Item | Why blocked | Required action |
| --- | --- | --- |
| Codex Mobile pairing | QR/MFA must be completed by the human operator on phone | Open Codex App on Mac and scan QR in ChatGPT mobile |
| Telegram production bridge | Gateway connected, but home target is not deliverable and channel directory is empty | Start/add bot to intended chat, rotate/confirm token, update Hermes home channel |
| LINE production bridge | No production-safe LINE adapter/credential found in this flow | Configure LINE OA channel secret, access token, webhook verification, and allowed recipients |
| Solis production telemetry | Customer/site API consent, API ID/secret, and exact station mapping are required | Store credentials through approved secret storage, then run read-only telemetry smoke |
| Supabase-backed subdomains | Env/RLS/schema must be reviewed | Review env names and RLS before connecting |

### Isolated Dirty Reference Repos

| Repo | Current status | Rule |
| --- | --- | --- |
| `/Users/sirinx/.hermes/hermes-agent` | Behind origin and has untracked skills | Use as runtime/reference only; do not deploy |
| `/Users/sirinx/OZ-CORP-MONOREPO` | Large dirty worktree and untracked generated skills/docs | Isolate; do not use as production source |
| `/Users/sirinx/OZ-CORP/services/openclaw-worker` | Untracked `.env` and `.env.example` | Do not read or commit `.env`; reference only |
| `/Users/sirinx/thClaws` | Untracked workspace file | Local tooling/reference only |

## Next Strict Sequence

1. Keep `sirinx-os` clean after recording the production website release evidence.
2. Monitor live website health without creating extra production lead writes.
3. Resolve the Cloudflare JavaScript Detection/Bot Management performance gate or accept that Lighthouse mobile TBT is security-script dominated.
4. Pair Codex Mobile manually via QR because MFA/SSO requires the human operator.
5. Fix Telegram/LINE target setup only after recipient/channel target is confirmed.
6. Store Solis API credentials only through approved secret storage, then build read-only telemetry smoke.
7. Select exactly one internal subdomain candidate for build/auth review.
8. Continue Command Center/Hermes orchestration work from the current clean public website baseline.

## Stop Rules

- Stop before any new deploy, DNS route, Cloudflare secret, D1 production write, GitHub merge/main push, Telegram/LINE send, or Solis API credential use unless explicitly approved for that exact action.
- Do not read `.env` values.
- Do not clean dirty external/reference repos by deleting or reverting user-created files.
