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

## Current Truth

- `www.sirinx.co` remains protected as the public Solar company website.
- `sirinx-os` is clean locally on branch `codex/urgent-backlog-execution`.
- Public website source `/Users/sirinx/restore-sources/ton36475-lgtm-sirinx` is clean but ahead of origin by 5 commits.
- Those 5 public website commits have passed local typecheck, test, and production build verification.
- Lead handler is ready locally but production POST is not activated.
- Command Center lead health intentionally does not run production POST or create production leads.
- Contact fallback stays live until production lead POST is approved and verified.

## Remaining Backlog By Type

### Approval-Gated

| Item | Why blocked | Required approval |
| --- | --- | --- |
| Deploy main-router lead handler | Cloudflare Worker route and D1 binding are production external writes | Explicit Cloudflare deploy approval |
| Production POST smoke test | Would create a controlled production lead row | Explicit approval for one test lead |
| Push public website commits | GitHub external write | Explicit push/PR approval |
| Expose `dev.sirinx.co` or other internal subdomains | DNS/Pages/Access changes are external writes | Explicit Cloudflare + Access approval |
| Real Telegram/LINE sends | Customer-facing external messages | Token rotation, secret storage, allowed recipients, and send approval |

### Credential Or Human Manual Gate

| Item | Why blocked | Required action |
| --- | --- | --- |
| Codex Mobile pairing | QR/MFA must be completed by the human operator on phone | Open Codex App on Mac and scan QR in ChatGPT mobile |
| Telegram production bridge | Legacy audit copy contains token patterns | Revoke/rotate token; move all values to approved secrets |
| Solis production telemetry | Customer/site API consent and credentials are required | Confirm customer authorization and approved secret storage |
| Supabase-backed subdomains | Env/RLS/schema must be reviewed | Review env names and RLS before connecting |

### Isolated Dirty Reference Repos

| Repo | Current status | Rule |
| --- | --- | --- |
| `/Users/sirinx/.hermes/hermes-agent` | Behind origin and has untracked skills | Use as runtime/reference only; do not deploy |
| `/Users/sirinx/OZ-CORP-MONOREPO` | Large dirty worktree and untracked generated skills/docs | Isolate; do not use as production source |
| `/Users/sirinx/OZ-CORP/services/openclaw-worker` | Untracked `.env` and `.env.example` | Do not read or commit `.env`; reference only |
| `/Users/sirinx/thClaws` | Untracked workspace file | Local tooling/reference only |

## Next Strict Sequence

1. Decide whether to approve Cloudflare main-router deploy for the lead handler.
2. If approved, deploy main-router and run one controlled production POST smoke test.
3. Record smoke result in Command Center and Obsidian.
4. Decide whether to push/PR the public website repo ahead commits.
5. Pair Codex Mobile manually via QR.
6. Select exactly one subdomain candidate for build/auth review.
7. Continue Solis read-only connector only after customer/API consent path is clear.

## Stop Rules

- Stop before any deploy, DNS route, Cloudflare secret, D1 production write, GitHub push, Telegram/LINE send, or Solis API credential use unless explicitly approved for that exact action.
- Do not read `.env` values.
- Do not clean dirty external/reference repos by deleting or reverting user-created files.
