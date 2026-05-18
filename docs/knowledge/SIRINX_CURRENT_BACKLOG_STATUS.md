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
| Public website GitHub branch/PR | Done | Branch `codex/public-website-production-ready-20260517`, PR `https://github.com/ton36475-lgtm/sirinx/pull/1` |
| Home Solution SEO/AEO page | Done, committed, and pushed to PR branch | `/Users/sirinx/restore-sources/ton36475-lgtm-sirinx` is clean on `codex/public-website-production-ready-20260517`; latest commit `2d5270a fix: polish pagespeed follow-up` |
| Command Center E2E stabilization | Done and committed | Dashboard renders each API panel independently so the Vibe status does not wait for slower Hermes/Executive endpoints |
| Local proposal writer | Done and committed | `POST /api/proposal-draft/write` writes local Obsidian drafts only after `confirmLocalWrite=true` |
| Local ROI preview | Done and committed | `GET/POST /api/roi-preview` routes assumptions to local package/payback previews with `externalWrites=false` |
| Proposal external-send review | Done and committed | `/api/proposal-review` and local review packet writer keep customer sends blocked until evidence is complete |
| Codex Mobile review packet | Done and committed | `/api/mobile-review-packet` produces mobile-readable evidence without external approval authority |
| External gate approval packets | Done and committed | `/api/external-gate-packets` defines 9 exact approval phrase packets with `canExecuteNow=false` |
| External gate audit preflight | Done locally and test/debug passed, pending this commit | `/api/external-gate-preflight` marks 9 gates as ready/blocked/manual with `externalWrites=false` |

## Current Truth

- `www.sirinx.co` remains protected as the public Solar company website.
- `sirinx-os` is on branch `codex/urgent-backlog-execution` with Command Center local-only workflow phases committed through external gate approval packets; Phase 15 audit preflight is the current local commit candidate.
- Public website source `/Users/sirinx/restore-sources/ton36475-lgtm-sirinx` is clean on branch `codex/public-website-production-ready-20260517` and matches `origin/codex/public-website-production-ready-20260517`.
- PR #1 is open at `https://github.com/ton36475-lgtm/sirinx/pull/1`, draft status is `true`, head is `codex/public-website-production-ready-20260517`, base is `main`, and GitHub reports `mergeStateStatus=DIRTY`.
- Public website PR #1 currently contains 8 commits through `2d5270a fix: polish pagespeed follow-up`.
- Home Solution work passed typecheck, tests, production build, static SEO checks, route checks, image asset checks, desktop/mobile browser QA, and no-secret review before this backlog update.
- Current `sirinx-os` dashboard work passed syntax verification, dashboard brain checks, desktop/mobile Playwright E2E, screenshot review, local Obsidian write smoke, strict secret scan, and diff whitespace checks.
- Lead handler is deployed through Cloudflare main-router and production POST smoke passed.
- Command Center lead health intentionally still uses safe GET probes and does not create production leads by itself.
- Contact fallback stays live until real production lead traffic has been observed.
- Obsidian Brain Hub contains summary-only notes for the Home Solution release checklist, Cloudflare deploy safety, SEO/AEO, image performance, secrets, approval gates, and Solis/agent readiness. These are knowledge records, not approval to deploy.

## Remaining Backlog By Type

### Approval-Gated

| Item | Why blocked | Required approval |
| --- | --- | --- |
| Resolve PR #1 dirty merge state | GitHub reports `mergeStateStatus=DIRTY`; merge cannot be treated as ready | Inspect conflict/update path, then apply a local merge/rebase fix only after exact PR target is confirmed |
| Deploy `/home-solution` to `www.sirinx.co` | Public customer-facing website change | Explicit Cloudflare/Pages or release approval after preview and rollback plan |
| Expose `dev.sirinx.co` or other internal subdomains | DNS/Pages/Access changes are external writes | Explicit Cloudflare + Access approval |
| Merge public website PR #1 | Updates origin/main and may trigger GitHub/Pages deployment workflow | Explicit merge/release approval |
| Additional Cloudflare route/DNS/secret changes | External cloud mutation beyond deployed main-router | Explicit Cloudflare approval |
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

1. Keep `sirinx-os` clean after Phase 15/16 local commits.
2. Inspect PR #1 dirty merge state and choose merge-from-main or rebase strategy without touching production.
3. Pair Codex Mobile manually via QR because MFA/SSO requires the human operator.
4. Execute exactly one external gate only after its exact approval phrase is supplied.
5. Gate 1 candidate: update PR #1 branch only if local status is clean and target is confirmed.
6. Gate 3A candidate: create Cloudflare preview only after PR/build evidence is current.
7. Gate 3B candidate: deploy production only after preview approval and rollback target are recorded.
8. Fix Telegram/LINE target setup only after recipient/channel target is confirmed.
9. Store Solis API credentials only through approved secret storage, then build read-only telemetry smoke.
10. Select exactly one internal subdomain candidate for build/auth review.

## Stop Rules

- Stop before any new deploy, DNS route, Cloudflare secret, D1 production write, GitHub merge/main push, Telegram/LINE send, or Solis API credential use unless explicitly approved for that exact action.
- Do not read `.env` values.
- Do not clean dirty external/reference repos by deleting or reverting user-created files.
