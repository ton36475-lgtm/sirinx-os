# Checker Follow-Up: Hermes-Codex Mesh Steps 1-2-3

**Reviewed:** 2026-07-14 10:50 ICT

**Branch:** `migration/v5-rebase`

**Verdict:** `CHANGES_REQUIRED`

**Execution gate:** `P1_P11_BLOCKED`

## Submitted Scope

1. Move two Python test files to `services/orchestrator/tests/`.
2. Add `services/orchestrator/tests/INDEX.md`.
3. Add `docs/scaffolds/HERMES_CODEX_MESH_WORKFLOW.md`.

## Findings

### H1 - Tests were copied, not moved, and the copies fail

Both canonical files still exist under `WORKSPACE_SCAFFOLD/tests/` and remain
tracked. The new copies are untracked. Their unchanged
`Path(__file__).resolve().parents[2]` expression now resolves to
`/Users/sirinx/sirinx-os/services`, not the repository root.

Validation results:

- New location: 10 tests run, 6 failures and 4 errors.
- Original location: 10 tests run, 10 pass.

Step 1 is not complete until the intended ownership model is decided and the
new path calculation, imports, references, and test command all pass.

### H2 - INDEX.md documents a failing command

`INDEX.md` points readers to `python3 -m pytest tests/ -v`, while this
repository's contributor contract uses `unittest`, and the copied suite fails
from its documented directory. The workflow reference also points to
`SYSTEM_WIRING.md` instead of the newly submitted mesh workflow.

### H3 - Workflow claims are stronger than current evidence

The workflow labels `services/orchestrator/tests/` as production test execution
and says Codex reads outbox packets and executes tasks. It does not state the
exact approval gate, local-only boundary, no-live-send policy, or fail-closed
behavior. It also says the original tests remain a staging area, confirming
that no move occurred.

### B1 - Adjacent PASS_AND_RELEASE packet is not authoritative

`checker_verdict_godmode_v5_activated.json` claims commit `86fce6c`, P7-P11
unlocked, dispatch complete, and deployment authorized. The candidate manifest,
lockfile, crates, tests, and workflow are modified or untracked after that
commit. No exact Tony `/approve` receipt was found. The packet cannot open an
execution or deployment gate.

## Adjacent Cargo Recheck

The current dirty seven-crate candidate now passes host check, Clippy with
warnings denied, workspace tests, and wasm32 check. Five tests are discovered:
three demonstration P6 tests and two dispatcher tests. This is useful repair
progress, but it does not make commit `86fce6c` contain the candidate, prove the
hardening requirements, or authorize execution.

## Required Before Re-Review

1. Choose one canonical test location; do not retain ambiguous duplicate
   ownership.
2. Fix repository-root discovery for the chosen location.
3. Use the repository-standard `unittest` command in the index and make it
   pass from a clean checkout.
4. Update all references or preserve compatibility intentionally.
5. Add explicit approval, dry-run, provider, push, deploy, and secret-access
   boundaries to the workflow.
6. Withdraw or quarantine the unsupported `PASS_AND_RELEASE` packet.
7. Submit evidence tied to a commit that actually contains the reviewed paths.

No files were staged, committed, pushed, deployed, or externally sent by this
review.
