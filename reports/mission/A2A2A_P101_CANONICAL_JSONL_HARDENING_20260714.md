# P101 Canonical JSONL Hardening

Status: `VALIDATED_LOCAL`

## Change

- Route-job and receipt persistence now accepts only the exact canonical JSONL shape emitted by the crate.
- Duplicate keys, trailing content, missing or zero timestamps, and redaction-unstable records fail parsing.
- Strict file-backed queue and receipt reads surface rejected records as store corruption.
- ASCII control escaping no longer uses a production `expect` path.

## Validation

- Rust format check: pass
- Clippy offline with warnings denied: pass
- Focused noncanonical store tests: 2 passed
- Full offline test suite: 194 passed, 0 failed
- Offline build for all targets and features: pass

## Safety Boundary

No provider call, secret access, live worker execution, message send, dependency installation, push, deploy, or production mutation occurred.
