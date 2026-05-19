# packages/policy-core

Status: Phase 1 local evaluator implemented
Date: 2026-05-20

## Purpose

`policy-core` is the shared local decision layer for SIRINX action gates.

It answers:

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

- `allowed`
- `approval_required`
- `blocked`
- `hardBlocks`
- `approvalReasons`
- `externalWrites`
- `requiresApproval`

## Phase 1 Boundary

Implemented locally only:

- package entry: `packages/policy-core/src/index.mjs`
- package tests: `packages/policy-core/src/index.test.mjs`
- API status adapter: `services/dev-control-api/src/policy-core-status.mjs`
- read-only endpoint: `GET /api/policy-core`

External actions can evaluate to `allowed` only when exact target approval evidence is provided to the evaluator. The current Command Center status endpoint does not execute external writes and reports `externalWrites=false`.
