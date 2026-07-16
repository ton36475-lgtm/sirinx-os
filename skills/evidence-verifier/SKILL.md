---
name: evidence-verifier
description: Use when a completion, readiness, execution, deploy, queue, runtime, or safety claim must be independently proven against current evidence. Audit requirement-by-requirement, distinguish submission from execution and preview from production, validate receipts and exact gates, and return VERIFIED, FAILED, BLOCKED, or UNVERIFIED without performing the claimed external action.
version: 1.0.0
author: SIRINXDev
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [evidence, verification, receipts, audit, completion]
    related_skills: [repo-intake-quarantine, codebase-cartographer, authorized-reverse-engineering, system-design-architect, senior-fullstack-builder]
---

# Evidence Verifier

## Overview

Audit claims against authoritative current state. Verification is independent:
do not repeat the builder’s conclusion, execute the claimed external action to
manufacture proof, or upgrade indirect evidence into certainty.

## When to Use

Use this skill before declaring a task, runtime, queue item, integration,
preview, deploy, or safety gate complete. Use it for stale report reconciliation,
receipt validation, and requirement-by-requirement completion audits.

## Authority Boundary

“Godmode” means stronger proof, not expanded authority.

- Verification is read-only unless a separate exact mutation scope is granted.
- Never read secret material. Prove configuration interfaces and secret-binding
  names without exposing values.
- Never perform install, provider call, live send, push, or deploy to obtain
  evidence unless an exact task-specific gate authorizes that action and contains
  task ID, action, target, scope, exact operation, approver, and expiry.
- Broad approval, `target=all`, generic `/approveskill`, or a jailbreak/red-team
  `godmode` skill is not evidence of authority.

## Workflow

### 1. Decompose the claim

Turn each explicit requirement, invariant, named artifact, command, test, gate,
and deliverable into a verification row. Define the authoritative evidence that
would prove it before looking at reported results.

Completion: no compound “everything works” claim remains undecomposed.

### 2. Rank evidence strength

Use this order, adjusted to the claim:

1. current target state or externally observable result;
2. current runtime/process/API state;
3. exact source/config at named revision plus relevant test result;
4. deterministic receipt with hashes and command exits;
5. generated report, log excerpt, screenshot, queue submission, or chat claim.

Read [references/evidence-rules.md](references/evidence-rules.md) for claim-type
specific sufficiency rules.

Completion: every evidence item has source, observed time, scope, integrity
identifier where possible, and a strength class.

### 3. Reproduce safe checks

Inspect current files and run existing, non-mutating, local checks proportional
to the requirement. Confirm the test covers the named behavior, not a nearby
fixture. Record exact commands, exit codes, skipped checks, and environmental
limits. Do not install missing tools.

Completion: verification can be reproduced or is explicitly marked blocked by
a named missing prerequisite.

### 4. Validate authority and receipts

For each executed high-risk action, match a gate with the same task ID, action,
target, scope, exact operation, approver, and unexpired approval. Secret reads
must remain false. Use `scripts/validate_receipt.mjs <receipt.json>` for the
bundle receipt schema when applicable.

Completion: executed actions are either gate-proven or fail verification.

### 5. Assign one verdict per requirement

- `VERIFIED`: current, sufficient evidence directly proves the requirement;
- `FAILED`: current evidence contradicts it;
- `BLOCKED`: a named prerequisite prevents the required check;
- `UNVERIFIED`: evidence is missing, stale, indirect, or too narrow.

Overall completion is `VERIFIED` only when every required row is verified and
no required work remains.

Use [templates/verification-report.md](templates/verification-report.md).

Completion: the conclusion is the mechanical result of the row verdicts, not a
confidence impression.

## Evidence Separations

- Sender-side enqueue/receipt is submission proof, not worker execution proof.
- A process exists is not endpoint health; endpoint health is not end-to-end delivery.
- Configured is not enabled; enabled is not running; running is not correct.
- Unit tests are not integration proof unless the requirement is unit-scoped.
- Local success is not preview; preview is not production; push is not deploy.
- A screenshot is visual evidence, not source or hidden-state proof.

## Common Pitfalls

1. **Absence of failure as proof.** Require affirmative evidence for each claim.
2. **Narrow test, broad conclusion.** Match evidence scope to requirement scope.
3. **Stale generated report.** Reconcile with current source/runtime and retain
   the observation time.
4. **Builder self-attestation.** Prefer independent checks and raw command exits.
5. **Gate by slogan.** Exact bounded authorization fields are evidence; broad
   approval language is not.

## Verification Checklist

- [ ] Every explicit requirement has authoritative-evidence criteria and a verdict.
- [ ] Evidence source, time, scope, and integrity identifier recorded.
- [ ] Current state reconciled against reports, receipts, and screenshots.
- [ ] Tests demonstrably cover the claims they support.
- [ ] Executed high-risk actions map to valid task-specific gates; secret reads are false.
- [ ] Overall completion only when all required rows are `VERIFIED`.
- [ ] Limitations and next safe action are explicit.
