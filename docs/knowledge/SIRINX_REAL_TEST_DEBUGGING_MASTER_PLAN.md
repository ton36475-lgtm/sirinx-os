# SIRINX Real Test Debugging Master Plan

Date: 2026-05-17
Status: active local test plan

Update 2026-05-17 03:06 +07: external gates were approved by the user and executed where credentials/tools allowed.

## Scope

This plan defines the local real-test/debugging loop for the SIRINX stack after the Command Center design lock and lead backend local preflight.

Allowed now:

- Create and update local documentation.
- Run local syntax checks, unit tests, browser E2E tests, local service health checks, and local build checks.
- Write summary/status notes to Obsidian.

Original local-only approval did not include:

- Cloudflare deploys, DNS changes, Worker route changes, D1 production writes, or secret writes.
- GitHub push/PR.
- Telegram/LINE/email/SMS/customer messages.
- Reading `.env` or credential files.
- Solis production API credentials or physical control.

## System Under Test

| System | Path | Primary checks |
| --- | --- | --- |
| SIRINX OS Command Center | `/Users/sirinx/sirinx-os` | `pnpm verify`, `pnpm dashboard:e2e`, `/api/*` health |
| Cloudflare main-router lead handler | `/Users/sirinx/sirinx-os/infra/cloudflare/main-router` | `pnpm cloudflare:main-router:check`, `pnpm cloudflare:main-router:test` |
| Solar Intelligence | `/Users/sirinx/sirinx-os/apps/solar-intelligence` | `pnpm solar:check`, `pnpm solar:test`, `/health` |
| Local public-site wrapper | `/Users/sirinx/sirinx-os/apps/site` | `pnpm site:check`, local `http://127.0.0.1:8730` |
| Public website source | `/Users/sirinx/restore-sources/ton36475-lgtm-sirinx` | `pnpm check`, `pnpm test`, `pnpm build` |
| Obsidian Brain Hub | `/Users/sirinx/Documents/Obsidian Vault/SIRINX` | Manual markdown presence and summary consistency |

## Real Test Commands

Run in this order:

```bash
cd /Users/sirinx/sirinx-os
pnpm stack:restart
pnpm verify
pnpm cloudflare:main-router:test
pnpm dashboard:e2e
pnpm solar:check
pnpm solar:test
pnpm hq:test
pnpm dashboard:test
curl -fsS http://127.0.0.1:8711/health
curl -fsS http://127.0.0.1:8711/api/lead-health
curl -fsS http://127.0.0.1:8711/api/project-inventory
curl -fsS http://127.0.0.1:8720/health
curl -fsS http://127.0.0.1:8730
```

```bash
cd /Users/sirinx/restore-sources/ton36475-lgtm-sirinx
pnpm check
pnpm test
pnpm build
```

## Acceptance Criteria

- `sirinx-os` remains clean or has only intentional committed documentation/status changes.
- Local stack reports all four services online.
- Command Center E2E passes on desktop and mobile.
- Lead health reports local handler ready, no production POST run, and external writes false.
- Public website source passes typecheck, tests, and build.
- Public website remains ahead of origin only until GitHub push/PR is explicitly approved.
- Obsidian records the current state without secrets or raw chat logs.

## Current Known Remaining Gates

| Gate | Reason | Next action |
| --- | --- | --- |
| Codex Mobile pairing | Human QR/MFA flow | User scans QR on phone |
| Public website PR merge | Updates origin/main and may trigger deployment | Review PR #1 and approve merge/release |
| Telegram production bridge | Gateway connected but home target is not deliverable; channel directory empty | Start/add bot to intended chat, rotate/confirm token, update home channel |
| LINE production bridge | No production-safe LINE adapter/credential found | Configure LINE OA secret/token/webhook and allowed recipients |
| Solis telemetry | Customer/site consent, API ID/secret, and station mapping missing | Store credentials through approved secret storage and run read-only telemetry smoke |

## Latest Local Run

Run time: 2026-05-17 02:53 +07

Passed:

- `pnpm verify`
- `pnpm hq:test`
- `pnpm dashboard:test`
- `pnpm dashboard:e2e`
- `pnpm cloudflare:main-router:test`
- `pnpm solar:test`
- `pnpm site:check`
- `pnpm stack:status`

Debug fixes applied:

- Added unique short-slug fallback for Obsidian brain note reads in the local Control API.
- Updated dashboard brain smoke assertions to match current markup.
- Updated local AI smoke test to validate Ollama response health instead of exact local-model phrasing.

Production state:

- `/api/lead-health` reports local lead handler ready.
- Cloudflare main-router deployed as version `4e66deca-89a5-4a1b-83a8-0dfaee4e3851`.
- Safe production GET observes `x-sirinx-router: main-www` and `405` on the lead endpoint.
- Controlled production POST smoke passed with D1 lead id `ec8dd128-a57c-4d6d-b0f8-4b91c1b94c2b`.
- Public website branch `codex/public-website-production-ready-20260517` pushed and draft PR #1 opened.
- Telegram smoke send failed because the configured home target is not deliverable.
- Solis safety engine tests pass, but no real SolisCloud telemetry smoke was possible without API credentials and station mapping.

## Debugging Rule

When a check fails:

1. Capture the exact failing command.
2. Fix the smallest local cause.
3. Re-run only the failing layer first.
4. Re-run the full local stack verification before declaring fixed.
5. Record the outcome in Obsidian Brain Hub.
