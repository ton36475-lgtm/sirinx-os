# Agent Repo Lab Install Plan - 2026-05-28

Status: PLAN ONLY

## Decision

Do not install all requested repos automatically. The correct engineering move is to treat them as untrusted supply-chain input and advance by gated phases.

## Goal

Build a local SIRINX Agent Repo Lab that can learn from high-signal AI agent repositories while preserving:

- no secret exposure
- no uncontrolled package execution
- no desktop-control grant
- no n8n workflow mutation
- no provider calls
- no deploy, push, publish, or message send

## Phase Plan

| Phase | Name | Action | Stop condition |
| --- | --- | --- | --- |
| P0 | Research | capture official docs, repo links, risk classification | complete in this pass |
| P1 | Clone approval | shallow clone into `vendor/agent-lab` | exact approval required |
| P2 | Manifest review | inspect package, Python, Docker, workflow, license files | findings report |
| P3 | Secret/security scan | run local secret scan and dangerous command review | fail closes |
| P4 | One-repo install approval | choose one repo and approve install | exact repo-specific approval |
| P5 | Sandbox run | run in isolated local mode with no real secrets | evidence report |
| P6 | Pattern extraction | convert lessons into SIRINX docs/skills only | no production integration |
| P7 | Integration proposal | draft one implementation packet | requires target approval |

## Candidate Order

1. `ggml-org/llama.cpp` for local inference.
2. `czlonkowski/n8n-mcp` for n8n node knowledge, after n8n policy display.
3. `OpenHands/software-agent-sdk` for code-agent architecture.
4. `OpenHands/OpenHands` for developer-worker UX and sandbox reference.
5. `simular-ai/Agent-S` for computer-use research, sandbox only.
6. `langgenius/dify` for RAG/workflow product reference.
7. `crewAIInc/crewAI` and `langchain-ai/langgraph` for non-primary orchestration comparisons.
8. `n8n-io/n8n` for official workflow engine source reference.

## Commands To Run Only After Clone Approval

```bash
cd /Users/sirinx/sirinx-os || exit 1
mkdir -p vendor/agent-lab
git clone --depth 1 https://github.com/ggml-org/llama.cpp vendor/agent-lab/llama.cpp
git clone --depth 1 https://github.com/czlonkowski/n8n-mcp vendor/agent-lab/n8n-mcp
git clone --depth 1 https://github.com/OpenHands/software-agent-sdk vendor/agent-lab/software-agent-sdk
git clone --depth 1 https://github.com/OpenHands/OpenHands vendor/agent-lab/OpenHands
git clone --depth 1 https://github.com/simular-ai/Agent-S vendor/agent-lab/Agent-S
git clone --depth 1 https://github.com/langgenius/dify vendor/agent-lab/dify
git clone --depth 1 https://github.com/crewAIInc/crewAI vendor/agent-lab/crewAI
git clone --depth 1 https://github.com/langchain-ai/langgraph vendor/agent-lab/langgraph
git clone --depth 1 https://github.com/n8n-io/n8n vendor/agent-lab/n8n
```

## Commands To Run After Clone, Before Install

```bash
cd /Users/sirinx/sirinx-os || exit 1
find vendor/agent-lab -maxdepth 3 \
  \( -name package.json -o -name pnpm-lock.yaml -o -name package-lock.json -o -name yarn.lock -o -name pyproject.toml -o -name requirements.txt -o -name Dockerfile -o -name docker-compose.yml -o -name compose.yml -o -name install.sh -o -name setup.py -o -name AGENTS.md -o -name CLAUDE.md \) \
  -type f | sort > .hermes/reports/AGENT_REPO_LAB_MANIFEST_FILES.txt
pnpm audit:secrets
git diff --check
```

## Prohibited Commands In This Phase

```bash
npm install
pnpm install
yarn install
pip install
uv sync
poetry install
docker compose up
docker run
make
bash install.sh
curl ... | bash
n8n start
n8n-mcp
hermes gateway restart
git push
```

## Verification For This Plan

This is a docs-only pass. Verification is:

```bash
node -e "JSON.parse(require('node:fs').readFileSync('.hermes/state.json','utf8')); console.log('state-json-ok')"
git diff --check
pnpm audit:secrets
pnpm check
```

## Next Approval

```text
APPROVE_AGENT_REPO_LAB_CLONE for vendor/agent-lab metadata-only shallow clone
```

This approval does not approve install, Docker, MCP registration, workflow access, provider use, desktop control, deploy, push, publish, or external send.
