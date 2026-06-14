# SIRINX Godmode Agent Lab v4.0

## Codename
Hermes Sovereign Orchestrator.

## Status
Local v4 audit completed on 2026-05-28. This is a governed local baseline, not approval to install, clone, register MCP servers, mutate Hermes config, send Telegram messages, or run provider calls.

## Source Of Truth
- Project root: `/Users/sirinx/sirinx-os`
- Local reports: `.hermes/reports/`
- Latest Night Watch log: `.hermes/logs/night-watch-latest.md`
- Obsidian digest: `/Users/sirinx/Documents/Obsidian Vault/SIRINX/AI HQ Knowledge Digest.md`

## Locked Architecture
- Hermes TUI is the primary orchestrator.
- Markdown skills are the main control language.
- llama.cpp is the local inference runtime when the local server is started.
- OpenRouter Qwen3.7 Max is the deep planner/reviewer lane.
- Python LangGraph is research/sandbox only, not the primary runtime.
- Validator shield is mandatory before execution, but the expected `validator/check.py` is missing locally.
- Obsidian is the memory and knowledge graph.
- n8n is the workflow layer, and n8n-mcp is the gated workflow intelligence bridge.
- `sirinx-agent-native-os` remains the monorepo core target.

## Confirmed Local State
- Node: `v26.0.0`
- pnpm: `9.0.0`
- Hermes Agent: `v0.14.0 (2026.5.16)`
- llama.cpp endpoint: offline on `127.0.0.1:8080`
- n8n web service: reachable at `127.0.0.1:5678`
- n8n CLI: missing
- n8n-mcp CLI: `/opt/homebrew/bin/n8n-mcp`
- Night Watch: latest final status `WARN`, exit code boundary should be success-with-warning
- `/Users/sirinx/project-hermes`: missing
- `/Users/sirinx/Documents/GitHub`: missing

## Required Execution Order
1. Keep Night Watch callback semantics locked: `OK` and `WARN` are non-blocking; `FAILED` is failure.
2. Restore or implement the validator shield before running generated code.
3. Keep model policy split by task tier; do not make Qwen3.7 Max the default cron/router model.
4. Keep knowledge indexing bounded to approved roots only.
5. Keep n8n-mcp read-only until a manifest and permission mapping are approved.
6. Start monorepo Phase 0 with secret scan and repo inventory before scaffold.
7. Clone external agent repos only after explicit approval.

## Approval Phrases
- Source implementation: `APPROVE_IMPLEMENTATION`
- Hermes token optimization config mutation: `APPROVE_HERMES_TOKEN_OPTIMIZATION`
- Agent Repo Lab clone: `APPROVE_AGENT_REPO_LAB_CLONE`
- n8n local install: `APPROVE_N8N_LOCAL_INSTALL`
- Hermes n8n MCP registration: `APPROVE_HERMES_N8N_MCP_REGISTER`

## Stop Point
SIRINX GODMODE AGENT LAB v4.0 READY - LOCAL AUDIT COMPLETE - WAITING FOR APPROVAL.

## Verification
- `pnpm night-watch`: passed with `WARN`; callback should treat this as success-with-warning.
- `pnpm audit:secrets`: passed with no findings.
- `git diff --check`: passed.
- `pnpm check`: passed.
- `pnpm verify:workspace`: passed.

## Risk
- Validator shield is only partial until `validator/check.py` is restored or implemented.
- llama.cpp is currently offline; local LLM runtime is not active.
- n8n is reachable through OrbStack, but host CLI is missing and Node `v26.0.0` is outside the prior n8n npm-support lane captured in local notes.
- Working tree contains many pre-existing changes; this audit did not revert or normalize them.

## Implementation Update
- Repo-native validator shield is now implemented at `scripts/validator-shield.mjs`.
- Validator shield test is now implemented at `scripts/validator-shield.test.mjs`.
- Night Watch callback classification is now implemented in `services/hermes-api/src/adaptive-command-gateway.mjs`.
- `WARN` plus exit code `0` now classifies as `completed_with_warning`.
- Validator shield is wired into `verify:workspace`.

## Implementation Verification
- `pnpm adaptive-command-gateway:test`: passed.
- `pnpm validator-shield:test`: passed.
- `node scripts/validator-shield.mjs scripts/validator-shield.test.mjs scripts/validator-shield.mjs`: passed.
- `pnpm audit:secrets`: passed.
- `git diff --check`: passed.
- `pnpm check`: passed.
- `pnpm verify`: passed.
- `pnpm verify:workspace`: passed.
