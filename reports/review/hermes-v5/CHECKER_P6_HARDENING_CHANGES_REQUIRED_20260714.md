# Checker Review: P6 Hardening

**Reviewed:** 2026-07-14 08:06 ICT

**Branch:** `migration/v5-rebase`

**Verdict:** `CHANGES_REQUIRED`

**Execution gate:** `P1_P11_BLOCKED`

## Scope

This review checks the untracked P1-P11 candidate against the canonical V5
plan and separates preflight evidence from implementation evidence. It does
not approve, stage, commit, push, deploy, or execute runtime actions.

## Findings

### B1 - Exact execution approval is absent (Blocker)

The canonical plan requires Tony's exact `/approve` command before P1
(`docs/plans/GHOSTCLAW_HERMES_V5_MIGRATION_PHASES.md:3-9`). The latest tracked
checker receipt records `tony_approval_received=false` and
`p1_p11_execution_allowed=false`. The sender-side completion packet asserting
`owner_approved=true` is already quarantined because no authoritative approval
receipt exists. P1-P11 remain blocked.

### B2 - The seven-crate workspace does not build (Blocker)

The tracked manifest still has `members = []` and identifies itself as a
preflight-only sentinel (`services/orchestrator/Cargo.toml:10-29`). Its single
passing test verifies that the execution gate is closed; it does not compile
the candidate crates.

An isolated workspace assembled from the submitted seven crate manifests
failed:

- `cargo check --workspace --all-targets --offline`: exit `101`
- `cargo clippy --workspace --all-targets --offline -- -D warnings`: exit `101`
- `cargo test --workspace --all-targets --offline`: exit `101`
- wasm32 workspace check: exit `101`

`hermes-worker` has 12 host-check errors, including an undeclared `serde_json`
dependency, invalid `wasm_bindgen` ABI use, `String`/`&str` match mismatches,
and missing `cmd_queue`/`cmd_cost` functions
(`services/orchestrator/crates/hermes-worker/src/lib.rs:4-23`). Clippy also
rejects `ABORT_WINDOW` and the unused dispatcher `state` argument.

### H1 - P6 tests are not connected to the crate (High)

`hermes-core/src/lib.rs` declares no `state_machine`, `hash_chain`, or
`hardening_tests` modules. `cargo test -p hermes-core` therefore reports
**0 tests**, not the claimed hardening coverage. The three tests in
`hardening_tests.rs` exercise a local demo struct, a string replacement, and
`assert_ne!("abc123", "def456")`; they do not validate production request
types, output handling, idempotency, or a cascading receipt chain
(`services/orchestrator/crates/hermes-core/src/hardening_tests.rs:7-37`).

### H2 - State and evidence chain are placeholders (High)

If connected, `state_machine.rs` references a missing `WAITING_APPROVAL` enum
variant (`:109`). Its current hash is always `genesis_hash`, and the transition
hash is a formatted string rather than SHA-256; the payload argument is not
included (`:81-100`). The repair-loop rule is also unreachable because
`CHECKER -> MAKER` is not a legal transition (`:49-53`, `:103-113`).

### H3 - P3 and P6 security claims are unsupported (High)

The worker exposes routes without authentication and uses unchecked `unwrap()`
on every response path (`services/orchestrator/crates/hermes-worker/src/lib.rs:4-23`).
No 15s/30s timeout, owner allowlist, webhook authenticity check, or Access
gate is implemented. This contradicts the completion evidence claims at
`docs/scaffolds/P6_HARDENING_EVIDENCE_COMPLETE.md:10-16` and `:37-42`.

### M1 - P4/P5 and P7-P11 remain scaffolds (Medium)

The dispatcher defaults file-writing actions to LOW and ignores its state
argument (`hermes-dispatch/src/lib.rs:15-54`). The router contains no budget
enforcement, fallback chain, or route receipt (`hermes-router/src/lib.rs:4-24`).
The P7-P11 file contains only P7-P10 sketches; nonce expiry is not enforced,
and network blocking is substring matching (`services/orchestrator/src/p7_p11_scaffold.rs:3-46`).

## Validation Evidence

| Check | Result |
|---|---|
| Tracked preflight check/clippy/test | Pass; one gate-closed sentinel test |
| Candidate metadata | Seven packages discovered in isolated workspace |
| Candidate workspace check | Fail, exit 101 |
| Candidate Clippy with warnings denied | Fail, exit 101 |
| Candidate workspace tests | Fail, exit 101 |
| Candidate wasm32 check | Fail, exit 101 |
| `hermes-core` test list | Zero tests |
| Submitted paths | Untracked |
| Whitespace check | Fail on five submitted source files |

## Required Before Re-Review

1. Preserve the candidate as untracked/quarantined until an authoritative,
   exact execution approval exists.
2. Enroll the seven crates only after the gate opens, then make host and wasm32
   workspace check, Clippy, and tests pass.
3. Wire the core modules and replace demonstration tests with tests against
   production types and behavior.
4. Implement authenticated read-only worker routing without unchecked unwraps.
5. Implement verifiable hash chaining, idempotency, replay protection, resource
   limits, and the V5 workflow-based MED path.
6. Regenerate evidence from captured command output; do not reuse sentinel
   output as implementation proof.

## Operator Decision

`P6_REJECTED_CHANGES_REQUIRED`. No phase completion, release, preview, push, or
deploy is authorized by this review.
