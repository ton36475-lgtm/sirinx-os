# SIRINX Vibe Coding Godmode Command Ledger - 2026-05-28

Generated: 2026-05-28 02:27 +0700
Mode: local-only, evidence-only, approval-gated

## Purpose

This ledger consolidates the old commands, pending work, current safe order, and blocked execution gates for the SIRINXDev Unified Agent-Native Monorepo / Hermes Sovereign Orchestrator.

It is based on current local evidence under `/Users/sirinx/sirinx-os`, Obsidian notes, `.hermes/reports`, package scripts, and repo-local docs. It does not claim complete coverage of every ChatGPT chat unless a real export or connector-backed source is provided.

## Current Source Of Truth

| Area | Current source |
| --- | --- |
| Project context | `.hermes/context.md` |
| Machine-readable state | `.hermes/state.json` |
| Continuation backlog | `.hermes/reports/SIRINX_CONTINUATION_BACKLOG_2026-05-28.md` |
| Night Watch | `.hermes/reports/NIGHT_WATCH_STATUS.md` and `.hermes/logs/night-watch-latest.md` |
| Model policy | `.hermes/reports/MODEL_POLICY_STATUS.md` |
| n8n status | `.hermes/reports/N8N_MCP_STATUS.md` |
| n8n permission policy | `docs/integrations/N8N_MCP_PERMISSION_POLICY.md` |
| Agent team topology | `docs/agents/SIRINX_AGENT_TEAM_TOPOLOGY.md` |
| Vibe Coding role | `docs/agents/SIRINX_VIBE_CODING_AGENT_ROLE_CONFIG.md` |
| Draft agent manifest | `.hermes/agents/sirinx-agent-team.manifest.draft.json` |

## Locked Architecture

| Component | Role | Status |
| --- | --- | --- |
| Hermes TUI | Primary orchestrator, command gate, policy gate, approval gate | Primary |
| llama.cpp | Local model runtime, OpenAI-compatible endpoint | Offline on `127.0.0.1:8080` in latest report |
| OpenRouter Qwen | Deep planner/reviewer | `qwen/qwen3.7-max` configured with 1M context |
| Validator Shield | Pre-execution guard | Local workspace validator and secret scan available |
| Obsidian | Memory and knowledge graph | Active local notes updated |
| Telegram / Termux | Mobile command interface | External send remains blocked |
| Mac Mini | Execution node | Local-only work allowed |
| n8n | Workflow engine | Reachable through OrbStack on `127.0.0.1:5678`; host CLI missing |
| n8n-mcp | Workflow intelligence bridge | Installed command exists; not registered |
| sirinx-agent-native-os | Monorepo core | Phase 0 security packet drafted |

## Hard Gate Rules

- No full Mac scan.
- No secret reads or prints.
- No deploy, push, publish, external send, provider call, connector activation, gateway restart, MCP registration, package install, or third-party repo clone without exact approval.
- No source-code implementation without exact `APPROVE_IMPLEMENTATION for <target>`.
- Every MCP, plugin, and hook needs a manifest plus permission mapping.
- Every execution-capable generated file must pass Validator Shield and secret scan before execution.
- Every task ends with changed files, verification, risk, and next action.

## Command Groups

### 1. Safe Audit And Status

These commands are allowed because they inspect local state and do not mutate external systems:

```bash
pwd
git status --short
node -e "const p=require('./package.json'); console.log(JSON.stringify(p.scripts||{},null,2))"
find .hermes/logs -maxdepth 1 -type f | sort | tail -20
pnpm stack:status
pnpm dashboard:status
pnpm pending-work:check
```

### 2. Night Watch Recovery

Current package script:

```bash
pnpm night-watch
```

Historical bounded command recorded in the status report:

```bash
perl -e 'alarm 110; exec @ARGV' pnpm night-watch
```

Current contract:

- `Final Status: OK` with exit code 0 means completed.
- `Final Status: WARN` with exit code 0 means completed with warning.
- `Final Status: FAILED` or non-zero exit means failed.

Do not patch Night Watch unless it returns a true core `FAILED` state.

### 3. Validator And Workspace Verification

Use deterministic gates before any implementation claim:

```bash
pnpm validator-shield
pnpm validator-shield:test
pnpm audit:secrets
git diff --check
pnpm check
pnpm verify
pnpm verify:workspace
```

Mandatory behavior:

- Detect hardcoded API keys.
- Redact secret values from findings.
- Block dangerous shell and unapproved external mutation patterns.
- Block source execution if validator or secret scan fails.

### 4. External Evidence Gates

These commands are local-only checks of evidence files and dry-run readiness:

```bash
pnpm external-gates:evidence-check
pnpm external-gates:runner
pnpm external-gates:check
```

Current state:

- 5 gates blocked by incomplete evidence.
- 0 gates ready for execution.
- 0 external mutations allowed.

Priority order:

1. Codex Mobile QR/MFA evidence.
2. Cloudflare zone/scope evidence.
3. GitHub publish target evidence.
4. Telegram/LINE recipient and token-ownership evidence.
5. Solis read-only consent and station mapping evidence.

### 5. Hermes Model And Context Policy

Applied host policy:

- Default model: `qwen/qwen3.7-max`.
- Provider: `openrouter`.
- Context length: `1000000`.
- Output caps remain bounded.

Reference-only cost-control pack, not currently applied:

```bash
CONFIG_PATH="$(hermes config path 2>/dev/null || echo "$HOME/.hermes/config.yaml")"
cp "$CONFIG_PATH" "${CONFIG_PATH}.backup.$(date +%Y%m%d_%H%M%S)"
hermes config set model.max_output_tokens 1024
hermes config set model.reasoning_effort none
hermes config set display.show_reasoning false
hermes config set compression.enabled true
hermes config set compression.threshold 0.40
hermes config set compression.target_ratio 0.15
hermes config set agent.max_turns 30
hermes config set model.default "qwen/qwen3-coder:free"
```

Do not disable reasoning for security review, architecture synthesis, major migration planning, or high-impact code review.

### 6. n8n And n8n-mcp

Read-only status checks:

```bash
command -v n8n || true
lsof -nP -iTCP:5678 -sTCP:LISTEN || true
curl -fsSI http://127.0.0.1:5678 | head -5 || true
command -v n8n-mcp || true
n8n-mcp --help | head -40 || true
```

Blocked:

- `APPROVE_N8N_LOCAL_INSTALL` is required before install.
- `APPROVE_HERMES_N8N_MCP_REGISTER` is required before Hermes MCP registration.
- Workflow read/write/execute and credentials remain blocked.

### 7. Source Implementation Gate

The Vibe Coding Agent can create implementation packets and test plans now. It cannot modify source code until the exact approval phrase names a target.

First recommended target:

```text
APPROVE_IMPLEMENTATION for n8n permission policy display
```

## Detailed Continuation Order

1. Keep Night Watch stable and classify `WARN` as non-blocking.
2. Keep Validator Shield mandatory for generated code and command packets.
3. Keep Hermes 1M context policy for deep planner/reviewer lanes.
4. Maintain local-only command ledger and Obsidian notes.
5. Complete one external evidence gate.
6. After exact implementation approval, expose the n8n MCP permission policy in local API/dashboard only.
7. After another exact approval, prepare agent repo lab intake as metadata-first, then clone only approved repos with no installer run.
8. Start monorepo Phase 0 scaffold only after security freeze and target approval.

## Current Blockers

| Blocker | Reason | Unblock phrase or evidence |
| --- | --- | --- |
| Source implementation | Spec-first gate remains closed | `APPROVE_IMPLEMENTATION for <target>` |
| n8n MCP registration | Tool permissions expand runtime capability | `APPROVE_HERMES_N8N_MCP_REGISTER` |
| n8n install | Host Node is outside n8n npm-supported range | `APPROVE_N8N_LOCAL_INSTALL` plus isolated runtime plan |
| Agent repo lab clone | Third-party code intake risk | repo-lab approval plus candidate list |
| Telegram/LINE send | External message risk | non-secret evidence plus exact send approval |
| Cloudflare/Solis mutation | Production/customer system risk | non-secret scope evidence plus exact mutation approval |

## Next Local-Only Action

Keep updating reports, plans, and evidence packets. The next source/API/dashboard slice is blocked until:

```text
APPROVE_IMPLEMENTATION for n8n permission policy display
```

