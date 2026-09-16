# A2A2A P099 Orchestrator Compact Status Gate

## Status

`READY_FOR_EXACT_IMPLEMENTATION_APPROVAL`

## Purpose

P098 fixed queue drain behavior, but the orchestrator still prints a very large full JSON payload by default. That slows down Hermes/Codex/OpenCode sidebar review because the next action is buried in thousands of ranked packet lines.

P099 proposes a local source patch that adds compact status output for team handoff:

- `--compact` prints a small sidebar-safe JSON object.
- Full default output remains unchanged.
- `--write --compact` still writes full evidence and receipt, but stdout stays compact.
- The compact shape preserves next gate phrase, queue drain status, guardrails, and blocked-action flags.

## Proposed Target Files

- `scripts/ghostclaw_a2a_agent_orchestrator.py`
- `WORKSPACE_SCAFFOLD/tests/test_ghostclaw_a2a_agent_orchestrator.py`

## Temp Validation

- Python compile: passed.
- Focused orchestrator unittest in temp patched workspace: 13 tests passed.
- Exact patch preview `git apply --check`: passed.
- Exact patch preview temp apply + Python compile + focused unittest: passed.
- Compact current-repo run summary:
  - schema: `ghostclaw.a2a2a.agent_orchestrator.compact.v1`
  - status: `pass`
  - queue drain status: `active_gate_review_required`
  - recommended next gate phrase: `APPROVE_MCP_AUTH_REFRESH_LINEAR`
  - ranked packets included: `false`

## Required Exact Gate

`APPROVE_IMPLEMENTATION A2A2A_P099_ORCHESTRATOR_COMPACT_STATUS`

## Policy

No source mutation, live Telegram send, provider/model call, repo/customer-data external routing, install, commit, push, deploy, secret read/print, key printing, or Cloudflare/R2 mutation was performed.

## Evidence

- Gate: `.ghostclaw_runtime/a2a2a/gates/A2A2A-P099-ORCHESTRATOR-COMPACT-STATUS.gate.json`
- Evidence: `.ghostclaw_runtime/a2a2a/evidence/A2A2A-P099-ORCHESTRATOR-COMPACT-STATUS-GATE-20260703.json`
- Patch preview: `.ghostclaw_runtime/a2a2a/evidence/A2A2A-P099-ORCHESTRATOR-COMPACT-STATUS-PATCH-PREVIEW-20260703.diff`
- Receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P099-ORCHESTRATOR-COMPACT-STATUS-GATE-20260703.json`
