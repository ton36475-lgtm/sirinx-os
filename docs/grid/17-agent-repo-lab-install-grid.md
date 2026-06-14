# Agent Repo Lab Install Grid

Status: LOCAL-ONLY, GATED

Scope: Deep research, repo-intake, install matrix, agent-team topology, and next-phase execution gates for SIRINX Godmode Vibe Coding.

No repository was cloned. No package was installed. No third-party code was executed.

## Execution Grid

```mermaid
flowchart TB
  U["Operator request: old work + deep research + all repo files + Godmode Vibe Coding"] --> H["Hermes TUI Orchestrator"]
  H --> S["Spec-first swarm gate"]
  S --> C{"Action class"}

  C -->|A0-A2| D["Docs, reports, context, state, Obsidian note"]
  C -->|A3| P["Dry-run plans and approval packets"]
  C -->|A4| B["Source implementation gate"]
  C -->|A5| X["External or supply-chain gate"]

  B --> B1["Requires APPROVE_IMPLEMENTATION for target"]
  X --> X1["Requires exact clone/install/MCP/provider approval"]

  D --> R["Deep research sources"]
  R --> M["Repo install matrix"]
  M --> G["Agent Repo Lab grid"]
  G --> N["Fullstack agent-team node diagram"]
  N --> E["Evidence reports"]
  E --> V["Verification bundle"]

  V --> V1["git diff --check"]
  V --> V2["pnpm audit:secrets"]
  V --> V3["pnpm check"]
  V --> V4["state JSON parse"]

  X1 --> Q{"If clone approved"}
  Q -->|yes| Q1["git clone --depth 1 into vendor/agent-lab"]
  Q -->|no| Q2["Keep metadata-only status"]

  Q1 --> Q3["manifest review"]
  Q3 --> Q4["secret scan"]
  Q4 --> Q5["dependency and Docker review"]
  Q5 --> Q6{"Install approved for one repo?"}
  Q6 -->|no| Q2
  Q6 -->|yes| Q7["sandbox install only"]
```

## Permission Grid

| Lane | Current status | Allowed now | Blocked until |
| --- | --- | --- | --- |
| Old work review | active | docs/report/state | none |
| Deep research | active | official docs and GitHub metadata | none |
| Repo clone | blocked | command plan only | `APPROVE_AGENT_REPO_LAB_CLONE for vendor/agent-lab metadata-only shallow clone` |
| Repo install | blocked | install matrix only | `APPROVE_AGENT_REPO_LAB_INSTALL for <repo-name>` |
| n8n MCP registration | blocked | policy docs only | `APPROVE_HERMES_N8N_MCP_REGISTER` |
| n8n workflow read/write/execute | blocked | capability manifest only | workflow-specific approval |
| Source implementation | blocked | spec and approval packet only | `APPROVE_IMPLEMENTATION for <target>` |
| Provider calls | blocked | config policy only | rotated tokens and explicit provider approval |
| Deploy/push/publish | blocked | release plan only | explicit external gate approval |

## Repo Intake State Machine

```mermaid
stateDiagram-v2
  [*] --> MetadataOnly
  MetadataOnly --> CloneApproved: exact clone approval
  MetadataOnly --> Blocked: broad or ambiguous approval
  CloneApproved --> ShallowCloned: git clone --depth 1
  ShallowCloned --> ManifestReviewed: package, python, docker, workflows
  ManifestReviewed --> SecretScanned: pnpm audit:secrets
  SecretScanned --> InstallApproved: exact install approval for one repo
  SecretScanned --> Quarantined: finding or unclear risk
  InstallApproved --> SandboxInstalled: no production secrets, no external mutation
  SandboxInstalled --> IntegrationCandidate: tests pass and policy map exists
  IntegrationCandidate --> ApprovedIntegration: human approval
  ApprovedIntegration --> [*]
  Blocked --> [*]
  Quarantined --> [*]
```

## Repository Role Grid

| Repo | Primary role | Node owner | Default state |
| --- | --- | --- | --- |
| `ggml-org/llama.cpp` | local model runtime | Runtime DevOps | candidate |
| `OpenHands/OpenHands` | developer-worker platform reference | Codex Worker Architect | candidate |
| `OpenHands/software-agent-sdk` | composable code-agent SDK reference | Codex Worker Architect | candidate |
| `crewAIInc/crewAI` | crew/flow pattern reference | Agent Team Designer | research only |
| `langchain-ai/langgraph` | durable workflow benchmark | Workflow Researcher | research only |
| `langgenius/dify` | RAG/workflow product reference | Knowledge Product Architect | research only |
| `simular-ai/Agent-S` | computer-use research | Browser QA / Runtime Gatekeeper | high-risk sandbox only |
| `czlonkowski/n8n-mcp` | n8n node-doc bridge | n8n Workflow Architect | policy blocked |
| `n8n-io/n8n` | workflow engine source reference | n8n Workflow Architect | platform reference |

## Node Diagram

```mermaid
flowchart LR
  subgraph Control["Control plane"]
    H["Hermes Orchestrator"]
    PG["Policy Gate"]
    AG["Approval Gate"]
    AT["Audit Trail"]
  end

  subgraph Planning["Planning and knowledge"]
    CM["Context Manager"]
    KP["Knowledge Curator"]
    VP["Vibe Coding Planner"]
    DR["Deep Researcher"]
  end

  subgraph Security["Security shield"]
    VS["Validator Shield"]
    SS["Secret Scanner"]
    DC["Dangerous Command Scanner"]
    MP["MCP Permission Checker"]
  end

  subgraph Runtime["Runtime and workers"]
    RD["Runtime DevOps"]
    CD["Codex Developer Worker"]
    BQ["Browser QA"]
    N8["n8n Workflow Architect"]
    RI["Repo Intake Agent"]
  end

  H --> PG --> AG --> AT
  H --> CM --> KP
  H --> VP --> DR
  VP --> RI
  RI --> SS
  RI --> DC
  RI --> MP
  CD --> VS
  N8 --> MP
  RD --> VS
  BQ --> VS
  VS --> AT
```

## Next Exact Action

The next source-code implementation remains:

```text
APPROVE_IMPLEMENTATION for n8n permission policy display
```

The next repo-lab action, if the operator wants the GitHub repos cloned, is:

```text
APPROVE_AGENT_REPO_LAB_CLONE for vendor/agent-lab metadata-only shallow clone
```

## Stop Rule

If a step requires install, MCP start, provider call, workflow mutation, desktop control, deploy, push, publish, or message send, stop and request the specific approval phrase for that one action.
