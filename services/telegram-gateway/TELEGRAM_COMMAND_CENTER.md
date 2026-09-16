# Telegram Command Center

Telegram is a command and reporting surface for Hermes. It is not an execution
engine and does not grant broad approval by itself.

## Canonical Implementation

- Router: `services/dev-control-api/src/telegram-command-router.mjs`
- Command registry: `configs/telegram_command_center.config.json`
- Poll-once gateway: `scripts/ghostclaw-telegram-command-gateway.mjs`
- Tests: `services/dev-control-api/src/telegram-command-router.test.mjs`
- Runtime config: `configs/hermes_telegram_gateway.config.json`
- Team policy: `configs/ghostclaw_agent_coordination.config.json`

The router reads runtime credentials through the existing secret resolver. It
does not store chat IDs or bot tokens in source files. Status commands remain
read-only; any provider call, live send, mutation, push, or deploy requires its
own scoped gate and receipt.

Cloudflare appears as two read-only controls: `/cloudflare readiness` inventories
the Pages, Worker, orchestrator, and Agent SDK targets; `/cloudflare preview
packet` renders an R4 packet preview. Neither command calls Cloudflare or runs a
deploy command. The target registry is
`configs/cloudflare_deployment_targets.config.json`.

Store the same blocked/readiness packet for A2A review without deploying:

```bash
node scripts/ghostclaw-cloudflare-preview-packet.mjs
```

## Command Flow

```text
Telegram -> canonical router -> Hermes gate -> A2A2A envelope
         -> Codex worker -> reviewers -> validation -> receipt/status
```

Claude Code is the primary architecture lane. OpenCode with GLM-5.2 is the
architecture fallback and bounded review/subagent lane. Codex owns all
repository writes and Git state. This prevents parallel workers from editing
the same path.

## Local Validation

```bash
pnpm exec vitest run services/dev-control-api/src/telegram-command-router.test.mjs
node scripts/ghostclaw-agent-coordination-audit.mjs
```

Do not run the legacy Python entrypoints as servers. They intentionally exit
with a blocked status and point callers to the canonical router.

Inspect credential presence and replay offset without a network call:

```bash
node scripts/ghostclaw-telegram-command-gateway.mjs
```

One live poll must be invoked explicitly and processes at most 20 updates from
the configured control chat:

```bash
node scripts/ghostclaw-telegram-command-gateway.mjs --live-once
```
