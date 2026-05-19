# TOOLS_REGISTRY

Status: local tool registry seed
Date: 2026-05-20

## Rules

- Prefer local repo scripts over ad hoc commands.
- Use read-only checks before write actions.
- External writes require exact target approval.
- Do not run helper commands that might send messages until recipient/token gates are complete.

## Local Commands

| Tool/Command | Purpose | Safe Mode | Blocked/Gated Mode |
| --- | --- | --- | --- |
| `pnpm project-os:check` | Verify root operating file stack. | local read-only | none |
| `pnpm verify` | Syntax-check core local modules. | local read-only | none |
| `pnpm dashboard:run` | Start local dev-control-api and dashboard. | localhost only | do not expose publicly |
| `pnpm dashboard:e2e` | Playwright Command Center checks. | local browser automation | no external mutation |
| `pnpm external-gates:check` | Verify external gate readiness. | read-only/safe probes | does not bypass manual gates |
| `pnpm external-gates:evidence-check` | Validate gate evidence templates. | local files only | no secrets printed |
| `pnpm cloudflare:main-router:test` | Test Cloudflare worker locally. | local tests | deploy remains gated |
| `pnpm cloudflare:main-router:deploy` | Deploy main router. | not safe by default | exact Cloudflare deploy approval required |
| `git status --short` | Inspect repo status. | read-only | none |
| `gh repo list` | Inspect GitHub repos. | read-only | push/PR gated |

## Blocked Until Evidence

| Tool/Flow | Blocker |
| --- | --- |
| Telegram smoke send | recipient/channel and rotated token must be confirmed. |
| LINE send/webhook activation | LINE OA channel secret, token, webhook validation, and allowed recipient required. |
| Solis telemetry | customer consent, read-only credentials, and station mapping required. |
| Supabase migration | schema, RLS, and environment ownership review required. |
| Cloudflare Bot/WAF change | official dashboard/API permission and target rule approval required. |
