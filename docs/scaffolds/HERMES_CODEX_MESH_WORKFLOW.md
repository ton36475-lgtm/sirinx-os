# Hermes-Codex Integration Mesh Workflow

## Flow Overview

Hermes Agent → local task packet → scoped implementation gate → Codex
worker → local validation → Checker review → deployment gate.

```
[Hermes Decision] → local packet (submission evidence only)
        ↓ exact task-specific approval
[Codex Worker] → leased files → implementation → tests and receipt
        ↓ independent checker pass
[Deploy Preview] → exact target/config/commit/command/rollback gate
```

Packets do not execute themselves. Sender-side outbox files are not proof that
Hermes received, ran, or deployed work. Runtime completion requires a
Hermes-owned task identifier plus a receiver-side receipt.

## Directory Structure
```
WORKSPACE_SCAFFOLD/tests/     → canonical repository packet/artifact guards
services/orchestrator/crates/ → runtime code and colocated Rust unit tests
services/orchestrator/tests/  → test ownership and command index only
_A2A_QUEUE/outbox/            → local submission evidence, never execution proof
evidence_drop/                → historical evidence; current receipts need fresh hashes
```

## Packet Format
```json
{
  "task_id": "gc-XXXX",
  "correlation_id": "...",
  "phase": "P7-P11",
  "payload": {...},
  "verification_data": {...}
}
```

## Integration Points

- Rust workspace must pass host and `wasm32-unknown-unknown` checks, Clippy,
  formatting, and behavior tests.
- Repository packet tests use `python3 -m unittest` from the repository root.
- LOW remains policy-bounded; MED uses a durable workflow and HIGH requires a
  task-specific human approval. No risk tier may bypass auth or evidence.
- Worker endpoints fail closed when the bearer secret or owner allowlist is
  missing, and expose no secret values.
- `APPROVE_IMPLEMENTATION for <target>` opens only the named local source
  scope. It does not authorize install, provider calls, secret reads, live
  sends, Git push, Wrangler deploy, DNS changes, or any cloud mutation.
- A Wrangler preview requires a later exact gate naming the Worker,
  environment, config, commit, full command, bindings, and rollback version.
- Production remains a separate approval after preview verification.
