# Hermes Toolchain Status

## Timestamp
2026-05-28 01:01:03 +07

## Local Runtime
- Node: `v26.0.0`
- npm: `11.14.1`
- pnpm: `9.0.0`
- git: `2.54.0`
- GitHub CLI: `2.92.0`
- Docker: `29.4.0`
- Python: `3.14.5`

## Hermes Runtime Signals
- Hermes gateway launchd service: loaded
- Gateway process: running through `/Users/sirinx/.hermes/hermes-agent/venv/bin/python -m hermes_cli.main gateway run --replace`
- Hermes Desktop dashboard probe: offline at `127.0.0.1:9119`
- Hermes Kanban board `sirinx-os`: `2` blocked, `6` done

## SIRINX Local Stack
- `dev-control-api`: online at `http://127.0.0.1:8711/health`
- `dev-dashboard`: online at `http://127.0.0.1:8710`
- `solar-intelligence`: offline at `http://127.0.0.1:8720/health`
- `sirinx-site`: offline at `http://127.0.0.1:8730`

## Local Scripts Relevant To This Phase
- `pnpm night-watch`
- `pnpm verify`
- `pnpm verify:workspace`
- `pnpm audit:secrets`
- `pnpm gateway-agent:test`
- `pnpm team-runtime-bridge:test`
- `pnpm openrouter-qwen-adapter:test`
- `pnpm spec-first-swarm:test`
- `pnpm dashboard:e2e`

## Safety Boundary
- Do not run gateway restart, Antigravity start, n8n install, n8n MCP registration, repo clone, external connector activation, or provider calls without explicit approval.
- For long tasks from Telegram, enforce Fast ACK plus Job ID before any planner/worker execution.

## Recommended Next Checks
1. Inspect blocked Hermes Kanban tasks before dispatch.
2. Run `pnpm audit:secrets` before any monorepo Phase 0 extraction.
3. Run `pnpm verify:workspace` only after current report writes are complete.

## V4 Refresh - 2026-05-28 01:09 +07
- Hermes Agent: `v0.14.0 (2026.5.16)`.
- Hermes embedded Python: `3.11.15`.
- OpenAI SDK in Hermes: `2.24.0`.
- llama.cpp local endpoint: offline on `127.0.0.1:8080`.
- Raw Hermes config was not written to reports.
- Hermes token optimization was not applied because it mutates host config and needs explicit approval.
