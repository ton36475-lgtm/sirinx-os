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
| Hero live energy background restoration | Superseded by global restoration | Commit `80266c7 fix: restore hero live energy background` restored the motion but scoped it to `HeroSlideshow`; replaced by `e91d4b3` below |
| Global live energy background restoration | Done, deployed, and verified | Commit `e91d4b3 fix: restore global live energy background`; Cloudflare Pages deployment `c4fec2bc`; live `www.sirinx.co` desktop/mobile DOM confirmed fixed global layer, section energy animation, no old hero-only overlay, no overflow, no console errors |
| AI avatar energy visual update | Done, deployed, and verified | Commit `d5ed14c feat: add ai avatar energy visual system`; Cloudflare Pages production deployment `b0ecd3d7`; live desktop/mobile checks confirmed avatar watermark, avatar-only contact CTA, floating chat avatar, global energy field, no visible avatar text, no overflow, no console errors |
| Kinetic AI avatar motion update | Done, deployed, and verified | Commit `fc209a1 feat: add kinetic ai avatar motion`; Cloudflare Pages production deployment `bb483b10`; live desktop/mobile checks confirmed staff spin, scout hop, energy orbits/trails, background energy nodes, reduced-motion coverage, no overflow, no console errors |
| Section energy seam cleanup | Done, deployed, and verified | Commit `404c9d4 fix: remove section energy seam overlay`; Cloudflare Pages production deployment `d49a482a`; live mobile/desktop checks confirmed `main section::before` removed, global energy/avatar layer preserved, no horizontal overflow |
| Mobile PageSpeed first-paint pass | Done, deployed, and verified | Commits `c26199f perf: improve mobile first paint` and `41dced7 perf: restrict public scripts to assets`; Cloudflare Pages production deployment `70e67cd5`; live homepage mobile Lighthouse performance `76`, Home Solution mobile `77`, SEO/accessibility `100`, TBT `10-30ms`, CLS `0` |
| Cloudflare challenge script performance gate | Mitigated in production | Public CSP now allowlists `/assets/` scripts and Cloudflare Insights while blocking `/cdn-cgi/challenge-platform`; live browser smoke confirmed `challengeLoaded=false`, React/chunks/chat still load, no console/log errors |
| Mobile route hard smoke | Done | Live mobile checks passed for `/`, `/solar-carport/`, `/assessment/`, `/projects/`, `/pricing/`, `/contact/`, and `/home-solution/`: no horizontal overflow, robots `index, follow`, live energy/avatar present, main runtime loaded, challenge script not loaded |

## Current Truth

- `www.sirinx.co` remains protected as the public Solar company website.
- `sirinx-os` is on branch `codex/urgent-backlog-execution` with Command Center local-only workflow phases committed through external gate audit preflight and refreshed backlog status.
- Public website source `/Users/sirinx/restore-sources/ton36475-lgtm-sirinx` is clean on branch `codex/home-solution-seo-hydration` and tracks `origin/main`.
- GitHub `main` is at `41dced7 perf: restrict public scripts to assets`.
- PR #1 is merged. It is no longer a release blocker.
- Public website production is deployed on Cloudflare Pages as `70e67cd5-b3c9-4d29-af31-5008af0e6517`, branch `main`, source `41dced7`, URL `https://70e67cd5.sirinx-co.pages.dev`.
- Rollback candidates are `d3e96348` source `c26199f`, `d49a482a` source `404c9d4`, `bb483b10` source `fc209a1`, `b0ecd3d7` source `d5ed14c`, `c4fec2bc` source `e91d4b3`, `9062be52` source `ff20cf1`, `7d12e73a` source `8c47afb`, `ab4731e9` source `cfb1a72`, `ff6ab27c` source `f594027`, `cfecbf8c` source `1804e81`, and pre-release `fdacecc8` source `2d5270a`.
- Home Solution work passed typecheck, tests, production build, static SEO checks, route checks, image asset checks, desktop/mobile browser QA, no-secret review, Cloudflare preview, production deploy, and live hydration SEO checks.
- Hard live audit after `ff20cf1`: sitemap static audit passed `94/94` routes with no route/link/asset failures, live mobile hydration passed `94/94`, and live desktop hydration passed `94/94`; no runtime errors, no unexpected `noindex`, no horizontal overflow, no weak root content, and no old internal/AI-WarRoom homepage text found.
- Final live Lighthouse lab result after `ff20cf1`: homepage SEO 100/accessibility 100, Home Solution SEO 100/accessibility 100, province page SEO 100/accessibility 100, CLS <= 0.015. Desktop performance is `home 84`, `home-solution 88`, `province 80`; mobile performance is `home 54`, `home-solution 49`, `province 53`, still limited mainly by Cloudflare JavaScript Detection and mobile main-thread/LCP cost.
- Global live energy background note: the original motion should be a page-level energy field, not a hero-image-only overlay. `e91d4b3` moved the effect into `Layout` as `.sirinx-live-energy` and removed the obsolete `.energy-live-overlay` from `HeroSlideshow`; `404c9d4` later removed the repeated `main section::before` overlay because it created visible mobile section bands while preserving the global live background/avatar layer.
- Live validation after `e91d4b3`: `www.sirinx.co` desktop and mobile confirmed fixed global layer, 3 flow lines, 2 scan lines, CSS animations `sirinx-energy-grid` and `sirinx-section-energy`, robots `index, follow`, no horizontal overflow, and no console errors. Local route audit covered 11 public routes across desktop and mobile with the same no-overflow/no-error result.
- AI avatar visual note: `d5ed14c` keeps the page-level `.sirinx-live-energy` field, changes the contact quote CTA to an avatar-only control with accessible screen-reader text, adds a faint AI Live Avatar watermark to the global background, and replaces the floating chat icon/avatar with the same no-text SVG mark. The uploaded reference image was not embedded because it contains annotation text; the production asset is a clean code SVG.
- Live validation after `d5ed14c`: `www.sirinx.co` now serves `/assets/index-Q0gNQEcu.css` and `/assets/index-C9o_upxE.js`; desktop/mobile browser checks across 11 public routes confirmed `.sirinx-live-energy`, `.sirinx-avatar-watermark`, `.sirinx-avatar-button`, floating chat avatar after interaction, robots `index, follow`, no visible avatar CTA text, no SVG text nodes, no old `.energy-live-overlay`, no horizontal overflow, and no console errors.
- Lighthouse sample after `d5ed14c`: live homepage mobile performance `33`, desktop performance `71`, SEO `100`, accessibility `100`, best practices `81`, CLS `0.001`. Mobile TBT remains dominated by Cloudflare JavaScript Detection `/cdn-cgi/challenge-platform/scripts/jsd/main.js` at about `7.8s` bootup work in the lab run, so Cloudflare Bot Management/JavaScript Detection remains the performance gate.
- Kinetic avatar motion note: `fc209a1` adds transform/opacity-based action motion to the avatar system: idle breathing, scout hop, hover vault, staff spin, tail sway, energy dash strokes, floating orbit rings, action trails, background energy nodes, and watermark orbit rings. The implementation remains CSS/SVG only and avoids runtime animation loops.
- Live validation after `fc209a1`: `www.sirinx.co` now serves `/assets/index-Dvg09Glp.css` and `/assets/index-D-LmA-A1.js`; desktop/mobile browser checks across 11 public routes confirmed motion layers, staff/spark SVG groups, `sirinx-avatar-breathe`, `sirinx-avatar-scout-hop`, `sirinx-avatar-staff-guard`, `sirinx-avatar-orbit-spin`, hover `sirinx-avatar-vault`, hover `sirinx-avatar-staff-spin`, no old `.energy-live-overlay`, no horizontal overflow, no SVG text nodes, robots `index, follow`, and no console errors.
- Lighthouse sample after `fc209a1`: live homepage mobile performance `40`, desktop performance `70`, SEO `100`, accessibility `100`, best practices `81`, CLS `0.001-0.002`. Mobile TBT remains dominated by Cloudflare JavaScript Detection `/cdn-cgi/challenge-platform/scripts/jsd/main.js` at about `5.7s` bootup work in the lab run, so Cloudflare Bot Management/JavaScript Detection remains the performance gate.
- Section seam cleanup note: `404c9d4` removes the per-section pseudo-element gradient/grid overlay that caused disconnected colored bands on mobile screenshots. Current live assets are `/assets/index-BCkWGVUH.css` and `/assets/index-DlEOgGVF.js`; live mobile/desktop checks on `/`, `/home-solution/`, and `/contact/` confirm `main section::before` content is `none`, `.sirinx-live-energy`, `.sirinx-energy-grid`, and `.sirinx-avatar-watermark` still exist, no horizontal overflow is present, and robots remain `index, follow`.
- Mobile PageSpeed pass note: `c26199f` adds static first-paint shells for `/` and `/home-solution/`, responsive local AVIF/JPG hero variants, mobile-first hero preload sizing, lighter Google Fonts requests, Home Solution image recompression, mobile animation workload reductions, and lazy chat/toaster loading. `41dced7` then restricts public scripts to deployed `/assets/` paths and Cloudflare Insights so Cloudflare JavaScript Detection does not execute on public marketing pages.
- Current live assets after `41dced7`: `/assets/index-BE-90-I-.css`, `/assets/index-BQTE6s8y.js`, `/assets/Home-DZkpqe6r.js`, `/assets/HomeSolution-BYAB19mj.js`, and `/assets/FloatingChatWidget-Cza8REsv.js`.
- Live Lighthouse after `41dced7`: homepage mobile performance `76`, accessibility `100`, best practices `92`, SEO `100`, FCP `3.2s`, LCP `4.9s`, TBT `30ms`, CLS `0`; Home Solution mobile performance `77`, accessibility `100`, best practices `92`, SEO `100`, FCP `3.3s`, LCP `4.4s`, TBT `10ms`, CLS `0`; homepage desktop performance `59`, accessibility `100`, best practices `92`, SEO `100`, TBT `10ms`, CLS `0`.
- Live smoke after `41dced7`: `/`, `/solar-carport/`, `/assessment/`, `/projects/`, `/pricing/`, `/contact/`, and `/home-solution/` passed mobile DOM checks with no horizontal overflow, live energy/avatar present, main runtime loaded, robots `index, follow`, and `challengeLoaded=false`.
- Local Lighthouse without Cloudflare challenge script improved materially after the preload pass: homepage mobile performance `64`, Home Solution mobile performance `67`, desktop performance `91` homepage and `90` Home Solution, with low TBT and CLS `0`.
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
| Cloudflare Bot Management / JavaScript Detection official tuning | Repo-level CSP mitigation is live and PageSpeed no longer executes `/cdn-cgi/challenge-platform/scripts/jsd/main.js`, but dashboard/API policy should still be reviewed for a cleaner security configuration | Cloudflare dashboard/API token with Bot Management write permission if the team wants to replace the CSP mitigation with an official WAF/Bot rule |
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
3. Pair Codex Mobile manually via QR because MFA/SSO requires the human operator.
4. Fix Telegram/LINE target setup only after recipient/channel target is confirmed.
5. Store Solis API credentials only through approved secret storage, then build read-only telemetry smoke.
6. Select exactly one internal subdomain candidate for build/auth review.
7. Review Cloudflare Bot Management officially when dashboard/API write permission is available, keeping the current CSP mitigation until a cleaner rule is approved.
8. Continue Command Center/Hermes orchestration work from the current clean public website baseline.

## Stop Rules

- Stop before any new deploy, DNS route, Cloudflare secret, D1 production write, GitHub merge/main push, Telegram/LINE send, or Solis API credential use unless explicitly approved for that exact action.
- Do not read `.env` values.
- Do not clean dirty external/reference repos by deleting or reverting user-created files.
