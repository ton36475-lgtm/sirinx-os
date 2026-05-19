# packages/async-core

Status: Phase 1 docs-only scaffold
Date: 2026-05-20

## Purpose

`async-core` is the proposed shared primitive layer for long-running SIRINX jobs.

## Required Primitives

- idempotency key
- bounded retry policy
- timeout
- cancellation
- status transitions
- signed callback validation
- audit event output

## Phase 1 Boundary

No runtime package is implemented yet. Build only after Hermes inbox and policy-core contracts are locked.
