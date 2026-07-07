# GHOSTCLAW_AGENCY_IMPORT_COMPACT_V1 Report

Mission ID: `GHOSTCLAW-AGENCY-IMPORT-20260630-001`
Mode: `local_safe_autonomous_A_B_only`
Status: `PASS`

## Decision

Use `msitarzewski/agency-agents` as an external upstream catalog only. GhostClaw
will import a curated, gated subset instead of loading or installing the full
roster.

## P000 Intake

Local inspection found no existing `agency-agents` checkout inside
`/Users/sirinx/sirinx-os`. No clone, install, conversion script, provider call,
secret read, push, deploy, or cloud mutation was executed.

Safe import paths:

- `agents/external/agency-agents/**`
- `agents/subagents/agency-adapter.agent.md`
- `agents/subagents/agency-curator.agent.md`
- `receipts/GHOSTCLAW_AGENCY_IMPORT_COMPACT_V1/**`
- `reports/mission/GHOSTCLAW_AGENCY_IMPORT_REPORT.md`

## P001 Adapter Created

Created local-safe adapter artifacts:

- `agents/external/agency-agents/README.md`
- `agents/external/agency-agents/curated-import-manifest.yaml`
- `agents/external/agency-agents/ghostclaw-role-map.yaml`
- `agents/external/agency-agents/context-budget-policy.md`
- `agents/external/agency-agents/opencode-agent-limit-policy.md`
- `agents/subagents/agency-adapter.agent.md`
- `agents/subagents/agency-curator.agent.md`
- `receipts/GHOSTCLAW_AGENCY_IMPORT_COMPACT_V1/README.md`
- `receipts/GHOSTCLAW_AGENCY_IMPORT_COMPACT_V1/p000_agency_catalog_intake.receipt.json`
- `receipts/GHOSTCLAW_AGENCY_IMPORT_COMPACT_V1/p001_create_ghostclaw_agency_adapter.receipt.json`
- `reports/mission/GHOSTCLAW_AGENCY_IMPORT_REPORT.md`

## Validation

Fresh local validation passed:

- JSON receipts parsed with `python3 -m json.tool`
- YAML manifests parsed with Ruby `YAML.load_file`
- `git diff --check` passed on the leased paths
- secret-pattern scan returned no matches
- changed-file lease compliance check passed

## Selected Divisions

- engineering
- testing
- security
- product
- project-management
- design
- specialized

## Agent Caps

- Max initial curated agents: 48
- Max loaded per task: 3
- Max divisions per task: 1
- Max OpenCode installed agents: 80
- Full roster loaded: false

## Blocked Actions

- cloning the external repo into GhostClaw
- running upstream install or conversion scripts
- installing all agents into OpenCode, Hermes, or Codex
- loading all 232 agents into context
- reading secrets or `.env`
- provider calls
- push, deploy, cloud mutation, production writes, customer sends

## Next Packet Plan

`P002_AGENCY_ADAPTER_REVIEW_OR_C_GATE`

Review the adapter artifacts. Open a Tier C gate only if the next step requires:

- cloning the external repo
- running upstream conversion or install scripts
- committing the adapter
- registering agents in OpenCode, Hermes, or Codex
- executing runtime queue work

Any clone, install, convert, commit, runtime queue execution, or dependency
change remains Tier C and requires an explicit gate.
