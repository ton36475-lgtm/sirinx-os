# Success Patterns

Status: Level 2 documentation artifact
Date: 2026-05-16
Runtime impact: none

## SP-001: Baseline Before Feature Work

Use when a repo has many untracked files.

Pattern:

1. Classify files into track, ignore, review, or local-only.
2. Add ignore rules for generated and secret-prone folders.
3. Stage only approved source/docs/config examples.
4. Run staged diff and secret-pattern checks.
5. Commit the baseline before feature work.

Result:

- Future diffs become reviewable.

## SP-002: Safe Degraded Mode For Optional Services

Use when a dashboard depends on optional local services.

Pattern:

1. Treat core dashboard/API as required.
2. Treat optional services as online/offline signals.
3. Test both live and degraded states.
4. Keep controls visible but safe.

Result:

- Local verification passes without requiring every optional service.

## SP-003: Kill Switch Before Adapter

Use before adding any external adapter.

Pattern:

1. Define switch id and environment flag.
2. Default off.
3. Show switch state in dashboard.
4. Block risky dry-runs while off.
5. Test blocked behavior.

Result:

- Risky adapter work cannot accidentally become external mutation.

## SP-004: Approval Queue Before Customer Action

Use before customer-facing or production-sensitive workflows.

Pattern:

1. Model pending, approved, rejected, and blocked states.
2. Require approval for risky actions.
3. Keep `externalWrites: false` in local dry-run.
4. Show approval state in dashboard.

Result:

- Operators can review risk before action.

## SP-005: Claim Guard Before Commercial Output

Use before proposals, quotations, ROI, or compliance claims.

Pattern:

1. Mark output as draft.
2. Set final quote allowed to false.
3. List required verifications.
4. Ban guarantee language.
5. Test wording.

Result:

- Commercial outputs remain safer and reviewable.
