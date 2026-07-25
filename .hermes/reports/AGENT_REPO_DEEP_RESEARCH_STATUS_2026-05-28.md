# Agent Repo Deep Research Status - 2026-05-28

Mode: local-only docs/report update

## Summary

The requested old-work continuation and high-level repo install planning has been converted into a gated Agent Repo Lab intake package.

No third-party repository was cloned. No package was installed. No installer, Docker stack, MCP server, provider call, workflow execution, deploy, push, publish, or external send was run.

## New Artifacts

- `docs/knowledge/SIRINX_DEEP_RESEARCH_AGENT_REPO_INSTALL_MATRIX_2026-05-28.md`
- `docs/grid/17-agent-repo-lab-install-grid.md`
- `docs/agents/SIRINX_FULLSTACK_AGENTIC_TEAM_NODE_DIAGRAM_2026-05-28.md`
- `docs/superpowers/plans/2026-05-28-agent-repo-lab-install-plan.md`
- `.hermes/reports/AGENT_REPO_DEEP_RESEARCH_STATUS_2026-05-28.md`

## Research Inputs

The public source set was refreshed from official docs, official GitHub repositories, or high-signal project pages:

- MCP official specification/documentation repo
- n8n official instance-level MCP docs and MCP tools reference
- n8n official repo
- n8n-mcp community bridge repo and docs
- OpenHands repo and Software Agent SDK docs
- CrewAI repo
- LangGraph official site and repo
- Dify official docs and repo
- Agent-S repo
- llama.cpp repo

## Current Decision

Keep Hermes TUI as the primary orchestrator. Treat LangGraph, CrewAI, Dify, OpenHands, Agent-S, and n8n-mcp as research/sandbox lanes until the repo-intake gate is explicitly opened.

## Blocked Actions

- broad "install all" execution
- clone into `vendor/agent-lab`
- any package manager install
- any Docker startup
- any MCP registration or server start
- n8n workflow read/write/execute
- desktop/GUI control through Agent-S
- provider calls using pasted credentials
- deploy, push, publish, or external message send

## Next Approval Options

For local source implementation:

```text
APPROVE_IMPLEMENTATION for n8n permission policy display
```

For repo lab shallow clone:

```text
APPROVE_AGENT_REPO_LAB_CLONE for vendor/agent-lab metadata-only shallow clone
```

For n8n install:

```text
APPROVE_N8N_LOCAL_INSTALL
```

For Hermes n8n MCP registration:

```text
APPROVE_HERMES_N8N_MCP_REGISTER
```

## Risk

The main risk is supply-chain execution. Several candidate repos include package managers, Docker, Python dependencies, GUI automation, MCP, or workflow automation capabilities. Running them before manifest review could trigger local file access, network calls, credential reads, workflow mutations, or host-level automation.

## Verification To Run

```bash
node -e "JSON.parse(require('node:fs').readFileSync('.hermes/state.json','utf8')); console.log('state-json-ok')"
git diff --check
pnpm audit:secrets
pnpm check
```

## Verification Result

Fresh local verification completed after this report:

| Command | Result |
| --- | --- |
| `node -e "JSON.parse(... .hermes/state.json ...)"` | passed, `state-json-ok` |
| `git diff --check` | passed |
| `pnpm audit:secrets` | passed, no findings in configured roots |
| `pnpm check` | passed |
| `pnpm validator-shield:test` | passed, 1 test file / 1 test |
| `pnpm external-gates:evidence-check` | passed as local check; external status remains `blocked-evidence-incomplete` with 5 blocked gates |
