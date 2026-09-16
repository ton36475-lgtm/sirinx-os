# ADR: Context Handoff Supply-Chain Gate

Status: `Accepted as reviewed pattern`
Date: `2026-07-01`

## Context

Long AI sessions degrade when full context is carried forward. Handoff files are
useful, but external skills are also supply-chain artifacts.

## Decision

Use the handoff pattern for concise session transfer. Do not install external
handoff skills without review. Handoff files must exclude secrets, tokens,
cookies, `.env` values, and private customer data.

## Consequences

- Handoff becomes a GhostClaw runbook, not a blind skill install.
- Future skill import requires source review and receipt.
