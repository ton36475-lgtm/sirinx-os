# Agency Agents Upstream Adapter

Mission: `GHOSTCLAW_AGENCY_IMPORT_COMPACT_V1`

This folder treats `msitarzewski/agency-agents` as an external upstream agent
catalog for GhostClaw. It is not a vendored copy of the upstream repository and
must not contain the full agent roster.

## Operating Model

- Agency Agents is an upstream reference catalog.
- GhostClaw remains the supervisor, policy gate, file lease system, A2A queue,
  validator, and receipt authority.
- Hermes routes work by role and risk tier.
- Codex is the only repo-mutating builder and only after a file lease.
- OpenCode is read-only review by default.
- Validator records evidence and receipts.

## Import Rule

Do not paste or load the full upstream roster into model context. Load only:

- one division manifest
- one agent file
- current packet
- current file lease
- current validation log
- latest receipt
- one review packet behind the active builder

## Blocked Without Explicit Gate

- cloning the upstream repo into this repository
- running install or conversion scripts
- installing all agents into OpenCode or Hermes
- loading all 232 agents into context
- provider calls, secret reads, deploys, pushes, cloud mutations, or live sends

## Current Status

`P000_AGENCY_CATALOG_INTAKE` found no local `agency-agents` checkout under the
main GhostClaw repository during local inspection. This adapter is therefore
created in reference-only mode using the operator-provided mission data.
