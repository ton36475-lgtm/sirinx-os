# ADR: OpenSpec-Inspired Spec-First Workflow

Status: `Accepted as workflow reference`
Date: `2026-07-01`

## Context

GhostClaw already uses packet, lease, validation, and receipt gates. OpenSpec's
spec-driven workflow reinforces the same principle: agree what to build before
code changes.

## Decision

Adopt the workflow pattern as a reference: explore, propose, apply. Do not make
OpenSpec a runtime dependency until a separate install/import gate exists.

## Consequences

- Proposals and specs should precede implementation.
- Generated tasks cannot override GhostClaw policies.
- Existing receipt and file-lease gates remain canonical.
