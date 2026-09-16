---
name: senior-fullstack-builder
description: Use when an approved, evidence-backed build packet must be implemented across backend, data, API, client, state, UI, jobs, and tests. Work as a senior full-stack engineer with scoped file leases, contract-first vertical slices, failure-aware refactoring, focused validation, and receipts; trigger for refactors, incomplete task recovery, worker implementation, production hardening, and vibe-coding requests that still require engineering proof.
version: 1.0.0
author: SIRINXDev
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [full-stack, implementation, refactoring, testing, build-packet]
    related_skills: [system-design-architect, authorized-reverse-engineering, evidence-verifier]
---

# Senior Full-Stack Builder

## Overview

Implement a scoped, approved build packet across all required layers while
preserving repository truth and user work. “Vibe coding” controls collaboration
style, not correctness: contracts, tests, policy, evidence, and rollback remain
first-class.

## When to Use

Use this skill after a decision-complete spec or build packet exists and a
specific implementation/file-scope gate is open. Use it to finish incomplete
tasks, refactor without losing behavior, connect full-stack slices, or harden a
worker. If architecture or current-system facts are missing, route first to
`system-design-architect` or `codebase-cartographer`.

## Authority Boundary

“Godmode” means senior-level rigor, not expanded authority.

- Source mutation requires the approved task ID and exact allowed file scope.
  Preserve unrelated dirty changes and stop on overlapping ownership.
- Never read or edit real secret material; use interfaces, mocks, or
  `.env.example` only when explicitly in scope.
- An implementation gate does not authorize install, migration, provider call,
  live send, push, deploy, cloud mutation, or customer-data access.
- Each external action needs its own exact task-specific gate with task ID,
  action, target, scope, exact operation, approver, and expiry.
- Reject broad “full auto,” “approve all,” `target=all`, generic godmode, or
  action-only deploy tokens. Never load a red-team/jailbreak `godmode` skill.

## Workflow

### 1. Reconcile the packet with current state

Re-read the spec, acceptance criteria, allowed/forbidden files, current diff,
branch/revision, tests, runtime evidence, and reported blockers. Convert every
explicit requirement into a requirement-to-evidence checklist before editing.

Completion: each requirement has a target artifact and planned verification;
conflicting user changes are resolved or reported before mutation.

### 2. Establish a safe work boundary

Use the existing worktree only when the file lease does not overlap unrelated
changes; otherwise request or create an approved isolated worktree. Do not
reset, overwrite, stage, commit, or clean user work as a convenience.

Completion: exact writable paths and read-only dependencies are known, and the
baseline diff is preserved.

### 3. Build one contract-first vertical slice

Follow this dependency order where applicable:

`domain/state -> storage -> service -> API/event contract -> handler/job -> client -> state/hooks -> component/page`

Write or sharpen failing tests around behavior and failure semantics, then make
the smallest coherent slice pass. Read
[references/build-sequence.md](references/build-sequence.md) when the change
crosses multiple layers or includes jobs/workers.

Completion: the slice is reachable through the real entrypoint and no required
module remains disconnected scaffold.

### 4. Engineer operational behavior

Implement validation, authorization, idempotency, timeouts, retries, bounded
concurrency, cancellation, structured errors, observability, kill switches,
and deterministic receipts appropriate to the design. Fail closed when a
dependency or policy decision is unavailable.

Completion: critical failure paths have executable tests or explicit manual
proof steps, not comments alone.

### 5. Refactor under behavioral proof

For incomplete or misleading code, identify the authoritative contract and
replace scaffolds rather than cosmetically making narrow tests green. Preserve
public compatibility unless the packet explicitly authorizes a versioned
change. Remove dead branches only when references and tests prove they are dead.

Completion: the actual end-to-end requirement is more true, not merely the
current unit test.

### 6. Verify proportionally

Run formatting, static analysis, unit tests, integration/contract tests,
security/policy tests, build/type checks, and local smoke tests using existing
tools. Start focused, then run the smallest broader suite that covers shared
impact. Never install missing tooling silently.

Completion: every explicit acceptance criterion is proven, contradicted, or
reported missing; “no failure observed” is not completion proof.

### 7. Receipt and handoff

Use [templates/implementation-receipt.md](templates/implementation-receipt.md).
Report files changed, behavior, tests with exact commands and exits, residual
risks, skipped checks, external actions not taken, and the next gate. Route
independent completion audit to `evidence-verifier`.

Completion: a reviewer can reproduce claims from current files and command
outputs without relying on chat intent.

## Common Pitfalls

1. **Test-shaped implementation.** Validate the full requirement and real
   entrypoint, not only a narrow fixture.
2. **Frontend-first drift.** Define domain, service, and API contracts before
   wiring state and UI.
3. **Broad refactor while dirty.** Keep edits within the lease and preserve
   unrelated changes.
4. **Silent tool installation.** Missing tools create a blocker or a separate
   exact install gate.
5. **Deploy as validation.** Preview and production mutation are later gates;
   local proof comes first.

## Verification Checklist

- [ ] Requirement-to-artifact-to-evidence matrix is complete.
- [ ] Approved task ID and writable file lease match every modified path.
- [ ] Real entrypoint reaches the implemented slice; no required scaffold remains disconnected.
- [ ] Auth, validation, state, idempotency, failures, observability, and rollback behavior covered.
- [ ] Focused and impact-appropriate broader checks recorded with exact results.
- [ ] No secret read, unapproved install/migration/provider/live-send/push/deploy/cloud action.
- [ ] Receipt distinguishes completed, failed, blocked, skipped, and unverified items.
