# P101 Strict Persistence Reads

Status: `VALIDATED_LOCAL`

## Contract

Typed convenience reads now fail closed when any non-empty JSONL record is
malformed. The contract applies consistently to:

- receipt history
- pending queue jobs
- persisted adapter bundles
- orchestrator status snapshots
- review packets

Callers receive `MigrationError::CorruptStore` with a stable store name and the
number of invalid records. This prevents convenience APIs from returning a
plausible but incomplete state after silently discarding damaged evidence.

## Inspection And Repair

The lower-level `read_report()` and `recent_report()` APIs remain permissive by
design. They return valid records plus corruption counters so operators can
inspect, report, or repair a damaged append-only store without executing queued
work.

No routing, fixture selection, provider, messaging, deployment, or production
behavior changed in this lane.

## Validation

The focused corruption tests passed for all five stores. The complete offline
Rust gate also passed:

```text
cargo fmt --check
cargo clippy --offline --locked --all-targets -- -D warnings
cargo test --offline --locked
cargo build --offline --locked
```

Result: 189 tests passed, 0 failed.
