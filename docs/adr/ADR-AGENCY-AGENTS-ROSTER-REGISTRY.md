# ADR: Agency Agents Roster Registry

Status: `Accepted as curated reference`
Date: `2026-07-01`

## Context

Agency Agents is useful as a large external agent roster, but full prompt dumps
and full OpenCode/Hermes installation increase context, instruction hierarchy,
and supply-chain risk.

## Decision

Use `msitarzewski/agency-agents` as an upstream reference catalog only. GhostClaw
will use curated manifests, role maps, and per-agent review receipts.

## Consequences

- Full roster loading is blocked.
- Blind install is blocked.
- Imported agents receive no tool permissions by default.
- Imported instructions cannot override GhostClaw policy.
- Initial curated cap remains 48 agents, max three loaded per packet.
