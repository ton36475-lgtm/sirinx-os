# Agent Roster Curated Import Runbook

Applies to: `msitarzewski/agency-agents`

## Purpose

Curate external agent roles into GhostClaw without full prompt dumps, blind
install, or imported tool permissions.

## Allowed Steps

1. Select one division.
2. Select up to three agents for the packet.
3. Hash reviewed source files if imported.
4. Check instruction hierarchy conflicts.
5. Map role to a GhostClaw lane.
6. Create import receipt.

## Blocked Steps

- loading all 232 agents into context
- installing all agents into OpenCode or Hermes
- running install scripts without review
- granting tool permissions from imported files
- accepting external system instructions
- imported agent self approval

## Exit Criteria

The imported role is a GhostClaw-controlled wrapper with no default tools and a
receipt-backed review trail.
