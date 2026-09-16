# Phase 5B/5C Local Integration Preparation

**Date:** 2026-07-14
**Status:** `ARCHIVED_COMPATIBILITY_EVIDENCE`

This lane records the bounded Phase 5B/5C prototypes that were archived during
the Hermes V5 rebase. It does not declare an active runtime and does not prove
a live Telegram, tmux, Redis, Cloudflare, or provider integration.

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

- `legacy/telegram-telemetry-gateway.ts`
- `services/orchestrator/local_bridge_policy.py`
- `legacy/local_bridge_daemon.py`
- `legacy/cloudflare/index.ts`
- `legacy/StateLockerDo.ts`
- `services/orchestrator/sirinx-bridge-wrapper.sh.template`
- `legacy/cloudflare/wrangler.toml.edge-orchestrator.template`
- `legacy/sirinx-lock-client.py`
- `.scripts/tmux-worker-lock-manager.py`
- `legacy/LayeredRedisCheckpointer.py`
- `legacy/langgraph-nodes/`

## Local Validation

- Python safety contract: 8 tests passed.
- TypeScript gateway and Durable Object: 9 Bun tests passed.
- Python compile, shell syntax, and JSON parse checks passed.
- Scoped `git diff --check` is required before commit.

## Known Limits

- No dependency was installed and no live service was started.
- The archived FastAPI adapter was compile-checked only.
- `LayeredRedisCheckpointer` is a preparation adapter, not a declared
  `BaseCheckpointSaver` implementation.
- The active orchestrator does not export the archived Phase 5A prototypes.
- Cloudflare account bindings, Telegram credentials, Redis connectivity, and
  tmux worker sessions remain untested and gated.

The next phase must use a target-specific packet with secrets named but never
printed, an explicit execution gate, rollback steps, and post-action receipts.
