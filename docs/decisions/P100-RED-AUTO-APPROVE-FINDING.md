# P100 — RED auto-approve path found in shipped code

**Status:** `[RESOLVED — option (a) applied 2026-07-25]`
**Tony's decision:** "ใช่" — confirmed drift. Path removed; see §8.
**Raised:** 2026-07-25 during the Telegram command-center audit
**Severity:** contradicts three independent LOCKED rules at once

---

## 1. What is in the code

`ghostclaw-os/crates/core/src/lib.rs`

```rust
//! - Red:   auto-approve IF policy conditions met (evidence passed + safety checks + audit recorded)

// ── Automated approval: policy checks ALL pass → auto-approve with audit ──
Event::AutoApproveAttempt(policy) => {
    if policy.all_conditions_met() {
        let approver = format!("auto:red:{}", policy.policy_version);
        ...
        "auto-approved: red tier | policy={} | evidence+secrets+cost all passed"
```

The policy that gates it:

```rust
impl Default for AutoPolicy {
    fn default() -> Self {
        Self {
            evidence_passed: true,
            secrets_clean: true,
            cost_within_budget: true,
            policy_version: "auto-v1".into(),
        }
    }
}

pub fn all_conditions_met(&self) -> bool {
    self.evidence_passed && self.secrets_clean && self.cost_within_budget
}
```

`AutoPolicy::default()` sets all three to `true`. A caller constructing
`Event::AutoApproveAttempt(AutoPolicy::default())` advances a RED task with
`approver = "auto:red:auto-v1"`. No human is involved and none is recorded —
`"auto:red:auto-v1"` is not a person.

Hermes exposes it: `POST /api/tasks/{id}/auto-approve`
(`ghostclaw-os/crates/hermes/src/main.rs:71`).

There is a passing test named `red_auto_approves_when_policy_passes`, so this is
tested behaviour, not a leftover.

## 2. What it contradicts

**GHOSTCLAW v1.0 [1] — LOCKED GOVERNANCE ("permanently hard-coded — never propose removal")**

> The 🔴 HIGH gate is STRUCTURAL: the only events that advance a Red task are
> HumanApprove(who) / HumanReject(who), constructed ONLY in (a) Hermes
> /api/tasks/:id/approve behind Cloudflare Access, (b) Telegram callback from a
> whitelisted chat/user id.

**GHOSTCLAW v1.0 [8] — FORBIDDEN BEHAVIORS (auto-fail)**

> ✗ Adding any auto-approve path for 🔴 Red tasks

**`ghostclaw-governance-contracts` — FORBIDDEN_ACTIONS**

> `'self_approval'`

which the same contract classifies as Tier X — *"Blocked forever"*. Its `Approval`
shape requires `principal` and `authenticatorRef`; the Rust path supplies neither.

## 3. Provenance

```
$ git log --oneline -S'AutoApproveAttempt' -- ghostclaw-os/crates/core/src/lib.rs
71e77a0 feat(ghostclaw): complete loop engineering + integrations + CLI/TUI migration
```

It arrived inside a bulk feature commit, not a governance decision. No 🔴 approval
line authorising it exists in `docs/decisions/` — the only 🔴 lines on record are
P098 Rev D, Rev E, and Rev F, none of which mention RED auto-approval.

This looks like drift, not a decision. But this document does not assume that:
Tony may have approved it in a session not visible here, in which case §5 needs
his verbatim line rather than a fix.

## 4. Why this blocks the automation-loop work

The request on 2026-07-25 was to build a bridge where agents request macOS access
and permissions, approved by Tony over Telegram.

That layer is worth building — v1.0 [1](b) names the Telegram callback as one of
the two sanctioned gates. But it only means anything if the gate is the *only*
way through. While `AutoApproveAttempt` exists, an agent that wants a permission
does not have to ask for it: it can submit the work as RED, satisfy three
self-reported booleans, and approve itself. The Telegram prompt becomes a
courtesy notification rather than a control.

Building the approval bridge on top of this would produce a system that looks
governed and is not. That is worse than an ungoverned system, because the
receipts would read as though a human agreed.

## 5. What is needed from Tony

One of:

**(a) Confirm it is drift — the default reading.** Then the fix is to delete
`Event::AutoApproveAttempt`, `AutoPolicy`, the `/api/tasks/{id}/auto-approve`
route, and the `red_auto_approves_when_policy_passes` test, and add a CI check
that greps for a RED auto-approve path the way the existing one greps GUARD for
`git push`.

**(b) Confirm it was deliberate.** Then v1.0 [1] and [8] are no longer accurate
descriptions of this system and must be rewritten to say so, with the verbatim
🔴 line recorded here. A rule that the code does not follow is worse than no rule.

Not doing either leaves the contradiction in place, which is the one option with
no upside.

## 6. What was built in the meantime

`ghostclaw-os/crates/permission` — the substrate the approval bridge needs, built
so that the failure above cannot recur in it:

- `HumanPrincipal` has no public constructor and no `Default`. It comes only from
  `from_telegram_callback` (whitelisted id + real callback id) or
  `from_hermes_access` (Access email + JWT subject).
- `Approval::record` takes a `HumanPrincipal` by value. An id string will not do.
- `Lease::grant` consumes an `Approval`. No approval, no lease — so no lease
  without a human, all the way down.
- Tier X is refused at `Approval::record` even when a real human approves it.
- Leases name exact absolute paths; wildcards and traversal are rejected rather
  than normalised.
- Approvals are one-time and re-verified against task, plan hash, and scope hash
  at consumption, so a plan that changed after approval is not authorised.

35 tests, including `a_tier_d_action_cannot_reach_a_lease_without_a_human`.

This crate is additive and changes no existing behaviour. It does not fix §1 —
only Tony's decision does that.

## 8. Applied — option (a)

Tony confirmed drift on 2026-07-25. Removed:

| What | Where |
|---|---|
| `Event::AutoApproveAttempt` variant | `crates/core/src/lib.rs` |
| `AutoPolicy` struct, `Default`, `all_conditions_met`, `block_reason` | `crates/core/src/lib.rs` |
| The Red policy-satisfied branch in `guard_transition` | `crates/core/src/lib.rs` |
| `GovError::AutoBlocked` | `crates/core/src/lib.rs` |
| `POST /api/tasks/{id}/auto-approve` route + `auto_approve` handler + `AutoApproveRequest` | `crates/hermes/src/main.rs` |
| Doc comments claiming Red auto-approves | both crates |

`RiskTier::Red` in `guard_transition` now matches `HumanApprove` and `HumanReject`
only; every other event falls through to `_ => Ok(task)`, leaving the task at
`Stage::Guard` with `ApprovalState::Pending`.

Four tests that asserted Red could auto-approve were replaced with four that
assert it cannot:

```
red_does_not_advance_on_the_yellow_abort_window ... ok
red_does_not_advance_on_pipeline_events ......... ok
passing_evidence_alone_does_not_approve_red ..... ok
an_approved_red_task_names_a_person ............. ok
```

The last one asserts the approver string does not start with `auto:` — the exact
shape of the removed bypass.

### CI guard

`crates/core/tests/red_gate_guard.rs` greps every `.rs` file under `crates/` for a
Red auto-approve path, modelled on the existing rule that greps GUARD for
`git push`. It carries two tests about itself:

- `the_guard_would_catch_the_path_that_was_removed` — feeds it the four real lines
  P100 found, so the matcher cannot quietly stop recognising them.
- `the_guard_leaves_green_and_yellow_alone` — feeds it correct Green/Yellow code,
  because a guard that fires on legitimate work is one somebody switches off.

That second test earned its place during implementation: the first version of the
guard flagged `green_auto_approves_at_guard`, which is correct code whose name
happens to contain `auto_approve` as a substring.

```
$ cargo test --workspace
86 passed; 0 failed
```

## 7. Labels

| Claim | Label |
|---|---|
| The code quoted in §1 | VERIFIED (read from the file) |
| `AutoPolicy::default()` is all-true | VERIFIED |
| Route exposed at `/api/tasks/{id}/auto-approve` | VERIFIED |
| Test `red_auto_approves_when_policy_passes` passes | VERIFIED (cargo test) |
| Arrived in commit `71e77a0` | VERIFIED (git log -S) |
| No 🔴 line authorising it | VERIFIED for `docs/decisions/`; UNVERIFIED beyond this host |
| It is drift rather than a decision | UNVERIFIED — Tony's call |
