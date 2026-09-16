# A2A Hermes ↔ Codex Sync Bridge v2

GHOSTCLAW `FULL_AUTO_BOUNDED_YOLO_CODING_TEAM` implementation.

## Purpose

Allow Hermes Mission Commander and Codex Build Captain to coordinate A2A2A
messages safely:

- Tier A/B auto-execute (read-only, allowed-path writes, tests)
- Tier C requires agent quorum or dry-run
- Tier D auto-block and simulate
- Tier X hard-block and simulate
- Every action produces a receipt, checksums, and rollback manifest

## Files

| File | Role |
|---|---|
| `a2a-message.ts` | A2A2A message + receipt types |
| `tier-resolver.ts` | Maps actions to policy tiers |
| `command-broker.ts` | Deny-first broker, no real shell execution |
| `lane-registry.ts` | Agent lane scope registry |
| `rollback-manifest.ts` | Rollback/simulation manifest generator |
| `bridge.test.ts` | 11 vitest tests |

## Test

```bash
pnpm exec vitest run GHOSTCLAW/a2a-hermes-codex-bridge/bridge.test.ts
```

## Design Constraints

- No real shell execution inside the broker.
- No `.env` / secret path access.
- No production deploy / generic push / generic deploy auto-approval.
- Deny rules always outrank bypass.
- Receipt generation is mandatory for every decision.
