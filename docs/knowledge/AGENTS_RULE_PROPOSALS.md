# AGENTS Rule Proposals

Status: proposals only
Date: 2026-05-16
Runtime impact: none

## Purpose

Record candidate updates for `AGENTS.md`. These are not active rules until reviewed and explicitly applied.

## Proposal 1: Require Baseline Classification

Add:

```text
If a repo has many untracked files, classify and baseline the repo before feature work.
Do not use broad git add until generated, local-only, and secret-prone paths are ignored or excluded.
```

Reason:

- This prevented unsafe staging during P0.

## Proposal 2: Optional Services Must Have Safe Degraded Mode

Add:

```text
Dashboards that depend on optional local services must show explicit online/offline states and remain usable when optional services are unavailable.
```

Reason:

- This fixed brittle dashboard verification.

## Proposal 3: External Adapters Need Kill Switch And Approval Queue First

Add:

```text
No external adapter implementation may proceed until a local kill switch and approval queue path exist for that adapter class.
```

Reason:

- This keeps integration work dry-run and reviewable.

## Proposal 4: Commercial Output Requires Claim Guard

Add:

```text
ROI, savings, compliance, approval, uptime, or quote outputs must include claim guard language before customer-facing use.
```

Reason:

- Solar Intelligence must avoid guaranteed commercial claims.

## Proposal 5: Connector Writes Need Preflight And Post-Action Report

Add:

```text
Connector writes require explicit preflight, operator approval, and post-action report with external visibility, paid usage, secrets touched, and rollback path.
```

Reason:

- Connector surfaces are broad and externally visible.
