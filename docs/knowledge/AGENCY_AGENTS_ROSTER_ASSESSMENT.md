# Agency Agents Roster Assessment

Tool: `msitarzewski/agency-agents`
Lane: `AGENT_ROSTER_REGISTRY`
Default Gate: `GREEN_FOR_READ_ONLY`
Import Gate: `YELLOW`
Install Gate: `RED_WITHOUT_REVIEW`

## Capability Snapshot

Operator-provided source summary describes Agency Agents as a broad AI agent
specialist roster with divisions, agent profiles, workflows, deliverables, and
tool targets including Codex and OpenCode.

Fresh primary-source verification was not executed in this packet. Treat star,
fork, commit, and roster counts as drift-prone until re-checked from upstream.

## Existing GhostClaw Adapter

Reference-only adapter artifacts exist under:

- `agents/external/agency-agents/**`
- `agents/subagents/agency-adapter.agent.md`
- `agents/subagents/agency-curator.agent.md`
- `receipts/GHOSTCLAW_AGENCY_IMPORT_COMPACT_V1/**`

## GhostClaw Fit

Allowed:

- read agent files after review
- classify agent roles
- map agents to GhostClaw lanes
- create curated shortlist
- adapt role text without tool permissions

Blocked:

- blind install
- auto-installing all agents
- imported tool permissions by default
- imported self approval
- external system instructions overriding GhostClaw policy

## Verdict

Use as a curated role/persona source only. Keep initial registry cap at 48 agents
and load at most three agents per packet.
