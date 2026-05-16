# SIRINX Current Backlog Status

Date: 2026-05-17
Status: current, no hidden backlog

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

## Current Truth

- `www.sirinx.co` remains protected as the public Solar company website.
- `sirinx-os` is clean locally on branch `codex/urgent-backlog-execution`.
- Public website source `/Users/sirinx/restore-sources/ton36475-lgtm-sirinx` is clean on branch `codex/public-website-production-ready-20260517`.
- Those 5 public website commits have passed local typecheck, test, and production build verification, and are pushed to PR #1.
- Lead handler is deployed through Cloudflare main-router and production POST smoke passed.
- Command Center lead health intentionally still uses safe GET probes and does not create production leads by itself.
- Contact fallback stays live until real production lead traffic has been observed.

## Remaining Backlog By Type

### Approval-Gated

| Item | Why blocked | Required approval |
| --- | --- | --- |
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

1. Pair Codex Mobile manually via QR because tool policy blocks direct control of Codex App.
2. Review/merge public website PR #1 when ready.
3. Monitor production D1 lead rows after real website traffic.
4. Fix Telegram target setup, then rerun a Telegram smoke send.
5. Configure LINE only after channel credential and webhook verification exist.
6. Store Solis API credentials through approved secret storage, then build read-only telemetry smoke.
7. Select exactly one subdomain candidate for build/auth review.

## Stop Rules

- Stop before any new deploy, DNS route, Cloudflare secret, D1 production write, GitHub merge/main push, Telegram/LINE send, or Solis API credential use unless explicitly approved for that exact action.
- Do not read `.env` values.
- Do not clean dirty external/reference repos by deleting or reverting user-created files.
