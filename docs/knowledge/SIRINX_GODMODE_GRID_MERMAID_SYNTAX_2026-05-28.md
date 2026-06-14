# SIRINX Godmode Grid Mermaid Syntax - 2026-05-28

Status: LOCAL-ONLY SYNTAX REFERENCE

This reference stores reusable Mermaid syntax for SIRINX Godmode / Vibe Coding planning and handoff.

## Master Continuation Grid

```mermaid
flowchart TB
  classDef ready fill:#12351f,stroke:#34d399,color:#eafff4
  classDef blocked fill:#3b1111,stroke:#fb7185,color:#fff1f2
  classDef warn fill:#3b2f0a,stroke:#facc15,color:#fff7cc
  classDef local fill:#10233f,stroke:#60a5fa,color:#eaf3ff
  classDef future fill:#252238,stroke:#a78bfa,color:#f3e8ff

  OP["Operator / Tony"]:::ready --> H["Hermes TUI Orchestrator"]:::local
  H --> P0["P0 Secret Exposure Containment"]:::blocked
  H --> NW["Night Watch: WARN exit 0"]:::warn
  H --> VS["Validator Shield + Secret Scan"]:::ready
  H --> QWEN["OpenRouter Qwen3.7 Max 1M Context"]:::local
  H --> N8N["n8n MCP Permission Policy"]:::blocked
  H --> EXT["External Evidence Gates: 5 blocked"]:::blocked
  H --> TEAM["Subagent Team Draft / Vibe Coding"]:::local
```

## All-Node Topology

```mermaid
flowchart TD
  OP["Operator"] --> H["Hermes Orchestrator"]
  H --> PG["Policy Gate"]
  PG --> AG["Approval Gate"]
  PG --> VS["Validator Shield"]
  PG --> CM["Context Manager"]
  PG --> IR["Intent Router"]

  IR --> PLAN["Planner Node"]
  IR --> GRILL["Grill Node"]
  IR --> SPEC["Spec Writer"]
  IR --> ENV["Environment Scanner"]
  IR --> VIBE["Vibe Coding Agent"]
  IR --> CODER["Coder Agent"]
  IR --> QA["QA Guardrail"]
  IR --> REVIEW["Code Reviewer"]
  IR --> RUNTIME["Runtime DevOps"]
  IR --> BROWSER["Browser QA"]
  IR --> N8N["n8n Workflow Architect"]
  IR --> REPO["Repo Intake Agent"]
  IR --> KNOW["Knowledge Curator"]
  IR --> REPORT["Reporter"]

  VIBE --> VS
  CODER --> VS
  QA --> REPORT
  REVIEW --> REPORT
  KNOW --> OBS["Obsidian / .hermes Reports"]
  REPORT --> OBS
```

## Gate State Machine

```mermaid
stateDiagram-v2
  [*] --> Intake
  Intake --> LocalAudit
  LocalAudit --> SecretContainment: provider tokens exposed
  SecretContainment --> EvidenceReady: revoked/rotated + non-secret evidence
  LocalAudit --> ImplementationBlocked: no exact approval
  ImplementationBlocked --> LocalImplementation: APPROVE_IMPLEMENTATION for named target
  LocalImplementation --> ValidatorShield
  ValidatorShield --> Verification
  Verification --> VaultUpdate
  VaultUpdate --> [*]

  ValidatorShield --> ImplementationBlocked: findings
  EvidenceReady --> ExternalGateReview
  ExternalGateReview --> ExternalExecutionBlocked: no exact external approval
```

## Execution Sequence

```mermaid
sequenceDiagram
  participant U as Operator
  participant H as Hermes
  participant P as Policy Gate
  participant V as Validator Shield
  participant A as Local API
  participant B as Browser QA
  participant O as Obsidian

  U->>H: Command
  H->>P: Risk classify
  P-->>H: Allowed local-only or blocked
  H->>V: Validate generated files/commands
  V-->>H: Redacted pass/fail
  H->>A: Read local status or approved source slice
  A-->>H: Evidence
  H->>B: Localhost verification when UI changes
  B-->>H: Smoke result
  H->>O: Decision note
```

## Permission Grid

| Class | Meaning | Status |
| --- | --- | --- |
| A0 | Read repo docs/state | allowed |
| A1 | Local read-only status checks | allowed |
| A2 | Docs/reports/state/Obsidian updates | allowed |
| A3 | Implementation packets and dry-run plans | allowed |
| A4 | Source changes for named target | blocked until exact approval |
| A5 | Install, clone, MCP register, provider call, send, deploy, push, publish | blocked until gate-specific approval |

## Reuse Rule

Use these snippets in future grid files only when the work remains local-only and approval-gated. For source/API/dashboard work, create or update tests before implementation and run Validator Shield plus secret scan before completion.

