# Phase 5B/5C Local Integration Preparation

**Date:** 2026-07-14
**Status:** `CODEX_HARDENED_LOCAL`

This lane converts the Hermes Phase 5B/5C draft into bounded preparation
artifacts. It does not prove a live Telegram, tmux, Redis, Cloudflare, or
provider integration.

## Safety Contract

- Telegram input is parsed into allow-listed preview actions only.
- The local bridge exposes preview generation; its execute route fails closed.
- Lock clients generate dry-run plans unless an operator later opens a separate
  network gate.
- The Cloudflare Durable Object requires a bearer token and bounded lock data.
- Redis checkpoint data is validated and corrupt records fail closed.
- No hard-coded credential, shell text dispatch, context-file overwrite, live
  Telegram send, tmux command, deploy, push, or cloud mutation is included.

## Artifacts

- `services/orchestrator/telegram-telemetry-gateway.ts`
- `services/orchestrator/local_bridge_policy.py`
- `services/orchestrator/local_bridge_daemon.py`
- `services/orchestrator/cloudflare/index.ts`
- `services/orchestrator/cloudflare/StateLockerDo.ts`
- `services/orchestrator/sirinx-bridge-wrapper.sh.template`
- `services/orchestrator/wrangler.toml.edge-orchestrator.template`
- `.scripts/sirinx-lock-client.py`
- `.scripts/tmux-worker-lock-manager.py`
- `packages/langchain-config/LayeredRedisCheckpointer.py`

## Local Validation

- Python safety contract: 8 tests passed.
- TypeScript gateway and Durable Object: 9 Bun tests passed.
- Python compile, shell syntax, and JSON parse checks passed.
- Scoped `git diff --check` is required before commit.

## Known Limits

- No dependency was installed and no live service was started.
- The FastAPI adapter was compile-checked only.
- `LayeredRedisCheckpointer` is a preparation adapter, not a declared
  `BaseCheckpointSaver` implementation.
- Cloudflare account bindings, Telegram credentials, Redis connectivity, and
  tmux worker sessions remain untested and gated.

The next phase must use a target-specific packet with secrets named but never
printed, an explicit execution gate, rollback steps, and post-action receipts.
