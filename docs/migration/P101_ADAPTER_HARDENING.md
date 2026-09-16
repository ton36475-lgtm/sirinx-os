# P101 Adapter Hardening

Status: `VALIDATED_LOCAL`

Updated: `2026-07-14T04:23:34+07:00`

## Purpose

This review hardens the local-only Rust adapter boundary before any live worker
or provider integration. It keeps the crate dependency-free and preserves the
existing dry-run, no-send, and no-deploy contract.

## Corrections

- Validators now fail closed when no checks are supplied.
- Worker and validator implementations must declare live-execution provenance
  explicitly; future adapters cannot inherit a misleading default.
- Codex command previews use POSIX-safe single-argument quoting.
- Queue clear events require the complete generated marker shape; malformed
  records are counted as invalid and cannot clear pending jobs.
- Temporary test files use an atomic suffix to avoid parallel-test collisions.
- Redaction covers adjacent key values, authorization headers, common key
  prefixes, and JWT-shaped values without masking unrelated substrings.
- Redaction is repeated at persistence boundaries for jobs, receipts,
  validation evidence, queue reasons, and Telegram preview artifacts.
- Policy matching canonicalizes separators and whitespace before applying
  phrase boundaries.
- Fixed commands reject extra arguments, and receipt queries are bounded to
  100 records.
- JSON control characters round-trip safely; persisted jobs and receipts must
  include timestamps; generated receipt ids include a process-local sequence.

## Validation

```text
cargo fmt --check
cargo clippy --offline --locked --all-targets --all-features -- -D warnings
cargo test --offline --locked
cargo build --offline --locked
```

Result: all checks passed; 187 tests passed and 0 failed.

## Remaining Boundary

The crate still does not execute Codex, start Telegram, call providers, install
dependencies, push, deploy, or mutate cloud resources. A live adapter requires
a separate design, threat review, exact target, and gate-specific approval.
