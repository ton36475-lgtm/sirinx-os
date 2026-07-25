# GhostClaw Rust Migration Core Behavior Contract

## Scope

The Rust core owns deterministic local behavior only:

- command parsing
- lane normalization
- policy blocking
- route intent creation
- receipt writing
- secret redaction
- JSON response shape

It does not own live Telegram, live Codex execution, Cloudflare/R2 mutation, production deploy, git push, customer messaging, or provider/model calls.

## Commands

| Command | Behavior |
|---|---|
| `/status` | reports local-safe control-plane status and writes a receipt |
| `/quota` | returns placeholder quota status; no provider call |
| `/pending` | reports queued local route jobs |
| `/receipts [limit]` | reads recent append-only receipts |
| `/route <lane> <task>` | queues route intent only; no worker execution |

## Supported Lanes

- `backend_core`
- `database_schema`
- `service_logic`
- `api_contract`
- `api_handler`
- `api_client_wiring`
- `frontend_state`
- `components`
- `pages`
- `local_uat`
- `review`

## Hard Blocks

Commands containing high-risk terms such as `git push`, `deploy`, `production`, `send email`, `token`, `password`, `credential`, `dns`, `cloudflare mutation`, `r2 mutation`, `chmod 777`, or `drop table` are blocked and still write a receipt.
