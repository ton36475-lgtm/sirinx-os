# P101 Receipt Integrity Guard

Status: `VALIDATED_LOCAL`

Updated: `2026-07-14T04:47:32+07:00`

## Purpose

The append-only receipt store must never treat malformed audit records as if
they did not exist. This guard adds corruption-aware reads while preserving
valid records, malformed source lines, and the local-only execution boundary.

## Contract

- `ReceiptReadReport` returns recent valid receipts plus counts for malformed
  and empty lines.
- Valid receipts remain newest-first and respect the caller's bounded limit.
- `FileReceiptStore` scans the complete JSONL file before applying that limit,
  so corruption outside the returned window is still reported.
- `MemoryReceiptStore` implements the same interface with zero corruption
  counts.
- `/receipts` fails closed with `receipt_store_corrupt:invalid_lines=N` when a
  malformed non-empty line exists.
- The read path does not rewrite, truncate, quarantine, or delete evidence.

## Validation

```text
cargo fmt --manifest-path crates/ghostclaw_migration_core/Cargo.toml -- --check
cargo clippy --manifest-path crates/ghostclaw_migration_core/Cargo.toml --offline --locked --all-targets -- -D warnings
cargo test --manifest-path crates/ghostclaw_migration_core/Cargo.toml --offline --locked
cargo build --manifest-path crates/ghostclaw_migration_core/Cargo.toml --offline --locked
```

Result: all checks passed; 189 tests passed and 0 failed.

## Safety Boundary

This change performs local file reads and deterministic validation only. It
does not call providers, execute workers, send messages, install dependencies,
read credentials, push, deploy, or mutate cloud resources.
