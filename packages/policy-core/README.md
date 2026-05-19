# packages/policy-core

Status: Phase 1 docs-only scaffold
Date: 2026-05-20

## Purpose

`policy-core` is the proposed shared decision layer for SIRINX action gates.

It should eventually answer:

```text
Is this action allowed, blocked, or approval-required?
```

## Initial Decision Inputs

- action type
- target system
- autonomy level
- external write flag
- customer-visible flag
- secret access flag
- production flag
- approval evidence

## Initial Decision Outputs

- `allow`
- `approval_required`
- `blocked`
- `reason`
- `required_evidence`
- `audit_event`

## Phase 1 Boundary

No runtime package is implemented yet. Do not import this package from services until tests and contracts exist.
