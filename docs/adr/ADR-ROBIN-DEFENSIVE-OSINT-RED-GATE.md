# ADR: Robin Defensive OSINT Red Gate

Status: `Accepted as report-only reference`
Date: `2026-07-01`

## Context

Robin is described as a dark web OSINT tool. This domain has high legal,
privacy, safety, and data-retention risk.

## Decision

Register `apurvsinghgautam/robin` only as a Defensive OSINT report-template and
policy reference. Runtime execution, Tor access, dark-web crawling, leaked data
handling, credential collection, and private-person data collection are blocked.

## Consequences

- Execution default remains disabled.
- A lawful authorization record and case scope are mandatory before any future
  non-synthetic workflow.
- GhostClaw memory may store redacted reports only, not raw sensitive material.
