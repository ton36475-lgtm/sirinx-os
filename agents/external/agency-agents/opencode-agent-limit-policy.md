# OpenCode Agent Limit Policy

Mission: `GHOSTCLAW_AGENCY_IMPORT_COMPACT_V1`

## Policy

OpenCode must not receive the full Agency Agents roster. The upstream README is
reported by the operator to warn that OpenCode may register only about 119
agents and silently drop the rest. GhostClaw therefore caps the initial
OpenCode-facing subset below that limit.

## Caps

- Full roster import: blocked
- Initial registered total: 48 max
- OpenCode install cap: 80 max
- Agents loaded per task: 3 max
- Divisions loaded per task: 1 max

## Required Gates

Any OpenCode install or conversion action is Tier C and requires:

- explicit owner gate
- rollback plan
- dry-run output
- selected divisions only
- no secret reads
- no provider calls
- no global install or script execution inside GhostClaw without review

## Safe Default

Use the curated manifest as a routing reference. Generate local wrapper files
only when a packet has a file lease and a receipt requirement.
