# GODMODE V5 Five-Phase State Contract

Status: `LOCAL_CONTROL_PLANE_IMPLEMENTED`

GODMODE V5 is a deterministic workflow contract, not expanded authority. It
coordinates Hermes, Claude Code, Codex, OpenCode, and validation workers while
keeping provider calls, Telegram sends, pushes, and deployments behind separate
target-bound approval receipts.

## Phase Order

| Phase | Owner | Purpose |
| --- | --- | --- |
| `Baseline` | Hermes Commander | Lock scope, source of truth, dirty lanes, and risk. |
| `Architecture` | Claude Architect | Produce an accepted design, ownership map, dependencies, and rollback design. |
| `Implementation` | Codex Build Captain | Apply leased, scoped changes as the sole repository writer. |
| `Verification` | OpenCode Reviewer | Run focused checks and independent evidence review. |
| `Release` | Hermes Commander | Assemble a target-bound release packet and verify rollback and receipt chain. |

The next phase cannot start until every exit criterion in the current phase is
`true`. Release readiness does not authorize an external action by itself.

## Runtime Key Policy

New JSON/runtime output uses UpperCamelCase keys. `AbortWindow` is measured in
seconds and is bounded to 1-3600. `MaxRetries` is bounded to 0-3. Legacy inbound
aliases such as `ABORT_WINDOW`, `abort_window`, `MAX_RETRIES`, and `max_retries`
remain accepted. If canonical and legacy values conflict, normalization fails.

Environment-variable names may remain uppercase because they are an input
transport convention; normalized runtime objects always emit canonical keys.

## Evidence Chain

Every normalized state has `ReceiptDigest`. A valid phase transition copies it
to `PreviousReceiptDigest` in the next state. Retry attempt `MaxRetries + 1`
sets `AbortRequired: true` and `Status: Blocked`; the loop cannot continue.

Canonical files:

- `configs/godmode_v5_runtime.config.json`
- `services/dev-control-api/src/godmode-v5-state-contract.mjs`
- `services/dev-control-api/src/godmode-v5-state-contract.test.mjs`
- Telegram read-only command: `/godmode status`

No provider call, live message, Cloudflare mutation, or deployment is performed
by this contract.
