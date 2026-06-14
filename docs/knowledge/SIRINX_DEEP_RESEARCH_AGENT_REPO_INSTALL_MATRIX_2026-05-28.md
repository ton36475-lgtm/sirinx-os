# SIRINX Deep Research Agent Repo Install Matrix - 2026-05-28

Status: DEEP-RESEARCH COMPLETE, INSTALL BLOCKED BY GATE

Stop point: REPO INSTALL MATRIX READY - NO CLONE, NO INSTALL, NO EXECUTION

## Purpose

This document consolidates the requested "all old work / all repo files / Godmode Vibe Coding" continuation into a safe, reviewable repo-intake matrix.

It is intentionally not an installer. Third-party repo code is supply-chain input. It must be reviewed before clone, dependency install, postinstall, Docker startup, MCP registration, provider configuration, workflow execution, deploy, push, or message send.

## Current Operating Decision

Hermes TUI remains the primary orchestrator. External frameworks are research lanes until they pass the SIRINX gate:

1. metadata review
2. license and security review
3. manifest and permission mapping
4. shallow clone approval
5. secret scan and dependency review
6. install approval
7. sandbox run approval
8. integration approval

## Source Set Reviewed

| Source | Type | SIRINX use | Current decision |
| --- | --- | --- | --- |
| `modelcontextprotocol/modelcontextprotocol` | official MCP spec/docs | Protocol baseline for tool manifests and permission maps | Use as policy source only |
| n8n official MCP docs | official docs | Instance-level MCP, workflow exposure rules, token/OAuth boundary | Use for default-deny policy |
| `n8n-io/n8n` | workflow platform repo | Visual automation engine and workflow reference | No workflow access yet |
| `czlonkowski/n8n-mcp` | community MCP bridge | Node documentation and n8n workflow build intelligence | Candidate after MCP policy approval |
| `OpenHands/OpenHands` | coding-agent platform | Reference for developer-worker UX and sandbox boundaries | Candidate, no install |
| `OpenHands/software-agent-sdk` | agent SDK | Research for composable code agents and REST/Python surfaces | Candidate, no install |
| `crewAIInc/crewAI` | multi-agent framework | Role/crew/flow pattern reference | Research only, not core runtime |
| `langchain-ai/langgraph` | durable workflow framework | Benchmark for human-in-loop and stateful workflow patterns | Research only, not primary orchestrator |
| `langgenius/dify` | agentic workflow/RAG platform | Product/RAG/workflow UI reference | Research only, no Docker |
| `simular-ai/Agent-S` | computer-use agent | GUI automation research lane | High-risk sandbox only |
| `ggml-org/llama.cpp` | local inference runtime | OpenAI-compatible local model server lane | Local runtime candidate |

## Install Gate Classification

| Repo | Target path after approval | Clone approval | Install approval | Execute approval | Risk class | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ggml-org/llama.cpp` | `vendor/agent-lab/llama.cpp` | required | required | required | medium | Prefer prebuilt or source review first. Do not expose chat history through local endpoint without policy. |
| `OpenHands/OpenHands` | `vendor/agent-lab/OpenHands` | required | required | required | high | Large agent platform. Inspect Docker, Python, JS, and credential paths before startup. |
| `OpenHands/software-agent-sdk` | `vendor/agent-lab/software-agent-sdk` | required | required | required | high | Agent SDK for code work. Keep sandboxed and stateless until approved. |
| `crewAIInc/crewAI` | `vendor/agent-lab/crewAI` | required | required | required | medium-high | Useful for patterns; Hermes remains orchestrator. |
| `langchain-ai/langgraph` | `vendor/agent-lab/langgraph` | required | required | required | medium-high | Research-only; watch dependency/security advisories. |
| `langgenius/dify` | `vendor/agent-lab/dify` | required | required | required | high | Docker/database/worker stack. No `docker compose up` without separate approval. |
| `simular-ai/Agent-S` | `vendor/agent-lab/Agent-S` | required | required | required | high | GUI/computer-control framework. Do not grant desktop access by default. |
| `czlonkowski/n8n-mcp` | `vendor/agent-lab/n8n-mcp` | required | required | required | high | May read/build workflows. Default-deny until n8n permission map is approved. |
| `n8n-io/n8n` | `vendor/agent-lab/n8n` | required | required | required | high | Official platform source. Current local n8n is reachable; do not mutate it here. |

## Exact Approval Phrases

These are separate gates. A broad `approve all` is not sufficient for supply-chain or external mutation:

```text
APPROVE_AGENT_REPO_LAB_CLONE for vendor/agent-lab metadata-only shallow clone
```

```text
APPROVE_AGENT_REPO_LAB_INSTALL for <repo-name>
```

```text
APPROVE_AGENT_REPO_LAB_SANDBOX_RUN for <repo-name>
```

```text
APPROVE_HERMES_N8N_MCP_REGISTER
```

```text
APPROVE_N8N_LOCAL_INSTALL
```

## Safe Clone Plan After Approval

Do not run this until the exact clone approval phrase is present.

```bash
cd /Users/sirinx/sirinx-os || exit 1
mkdir -p vendor/agent-lab
git clone --depth 1 https://github.com/ggml-org/llama.cpp vendor/agent-lab/llama.cpp
git clone --depth 1 https://github.com/OpenHands/OpenHands vendor/agent-lab/OpenHands
git clone --depth 1 https://github.com/OpenHands/software-agent-sdk vendor/agent-lab/software-agent-sdk
git clone --depth 1 https://github.com/crewAIInc/crewAI vendor/agent-lab/crewAI
git clone --depth 1 https://github.com/langchain-ai/langgraph vendor/agent-lab/langgraph
git clone --depth 1 https://github.com/langgenius/dify vendor/agent-lab/dify
git clone --depth 1 https://github.com/simular-ai/Agent-S vendor/agent-lab/Agent-S
git clone --depth 1 https://github.com/czlonkowski/n8n-mcp vendor/agent-lab/n8n-mcp
git clone --depth 1 https://github.com/n8n-io/n8n vendor/agent-lab/n8n
```

After clone, the next command is not install. The next command is review:

```bash
find vendor/agent-lab -maxdepth 3 \
  \( -name package.json -o -name pnpm-lock.yaml -o -name package-lock.json -o -name yarn.lock -o -name pyproject.toml -o -name requirements.txt -o -name Dockerfile -o -name docker-compose.yml -o -name compose.yml -o -name install.sh -o -name setup.py \) \
  -type f | sort
pnpm audit:secrets
```

## Mandatory Review Before Any Install

| Check | Why |
| --- | --- |
| `package.json` scripts | Detect postinstall/prepare/start scripts and hidden network actions |
| Python dependency files | Identify dynamic installs, shell commands, and native extensions |
| Docker and compose files | Detect volumes, privileged mode, ports, host mounts, and credentials |
| GitHub Actions | Detect external deploy/release workflows and secret expectations |
| License | Confirm compatible internal research use |
| Secret scan | Verify no accidental credentials in cloned test fixtures |
| Network map | Identify callback endpoints, telemetry, external providers, and model APIs |
| MCP manifest map | Ensure every tool has permission class and owner |

## SIRINX Integration Roles

| Role | Owner node | Allowed now |
| --- | --- | --- |
| Protocol baseline | Hermes Orchestrator + Policy Gate | yes, docs only |
| Repo metadata intake | Repo Intake Agent | yes, no clone |
| Fullstack pattern extraction | Vibe Coding Agent | yes, docs only |
| MCP integration | n8n Workflow Architect + MCP Gatekeeper | policy only |
| Computer-use research | Browser QA + Runtime Gatekeeper | no desktop control |
| Local inference | Runtime DevOps + Model Router | config/review only |
| Coding worker | Codex Developer Worker | source blocked without target approval |

## Deep Research Findings

1. MCP is the right abstraction for SIRINX tool connectivity, but SIRINX must keep default-deny tool permissions, explicit manifests, scoped auth, structured error states, and audit trails.
2. n8n official MCP can expose workflow management and workflow building capabilities. SIRINX must require explicit workflow allowlists and must not register instance-level MCP until the permission policy is implemented.
3. n8n-mcp is useful as a knowledge bridge for node documentation, but community MCP bridges still require the same permission envelope as official MCP.
4. OpenHands and Software Agent SDK are useful for coding-agent architecture, not as the primary SIRINX runtime. Use them to learn sandbox, statelessness, and code-worker patterns.
5. CrewAI and LangGraph are best treated as research/benchmark lanes because the user has already selected Hermes TUI plus Markdown skills as the primary orchestrator.
6. Dify is valuable as an agentic workflow/RAG product reference, but its Docker/database stack makes it too heavy for immediate startup in this dirty workspace.
7. Agent-S is valuable for computer-use research, but it is high-risk because it is designed to operate real GUI environments.
8. llama.cpp remains the local runtime candidate because it provides local model serving and OpenAI-compatible endpoints without requiring cloud calls.

## Decision

Do not install or clone in this pass. The correct next execution is:

1. keep token rotation as P0
2. keep n8n permission policy display as first source-code target
3. request exact clone approval for `vendor/agent-lab`
4. shallow clone only
5. run manifest/security review
6. choose one repo for install approval

## Source Links

- https://github.com/modelcontextprotocol/modelcontextprotocol
- https://docs.n8n.io/advanced-ai/mcp/accessing-n8n-mcp-server/
- https://docs.n8n.io/advanced-ai/mcp/mcp_tools_reference/
- https://github.com/n8n-io/n8n
- https://github.com/czlonkowski/n8n-mcp
- https://www.n8n-mcp.com/docs
- https://github.com/OpenHands/OpenHands
- https://github.com/OpenHands/software-agent-sdk
- https://docs.openhands.dev/sdk/arch/overview
- https://github.com/crewAIInc/crewAI
- https://www.langchain.com/langgraph
- https://github.com/langchain-ai/langgraph
- https://github.com/langgenius/dify
- https://docs.dify.ai/
- https://github.com/simular-ai/Agent-S
- https://github.com/ggml-org/llama.cpp
