# Godmode Continuation Grid

Status: LOCAL-ONLY GRID CHECKPOINT - NO EXTERNAL MUTATION

This grid turns the current SIRINX Godmode continuation state into a single Mermaid control map.

Source boundary:

- Observed from `.hermes/state.json`, `.hermes/context.md`, `.hermes/reports/*`, and current grid docs.
- Token values are intentionally omitted.
- Provider lanes remain blocked until exposed tokens are revoked/rotated outside chat.

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

  P0 --> ROTATE["Human revokes/rotates exposed tokens"]:::blocked
  ROTATE --> EVIDENCE["Record non-secret rotation evidence"]:::blocked
  VS --> LOCAL["Local API + Dashboard Evidence"]:::ready
  N8N --> APPROVE["APPROVE_IMPLEMENTATION for n8n permission policy display"]:::blocked
  APPROVE --> DISPLAY["Local dashboard policy display only"]:::future
  EXT --> CF["Cloudflare zone/scope evidence"]:::blocked
  EXT --> QR["Codex Mobile QR/MFA evidence"]:::blocked
  EXT --> GH["GitHub publish target evidence"]:::blocked
  EXT --> MSG["Telegram/LINE recipient evidence"]:::blocked
  EXT --> SOLIS["Solis read-only consent evidence"]:::blocked
  TEAM --> MISSION["Mission Control Vertical Slice"]:::future
  TEAM --> REPO["Agent Repo Lab Intake"]:::future
  TEAM --> MONO["Monorepo Phase 0 Scaffold"]:::future

  DISPLAY --> VERIFY["audit:secrets + diff check + verify:workspace"]:::future
  VERIFY --> VAULT["Obsidian + .hermes report update"]:::future
```

## Node Grid

| Node | Current status | Next action | Approval boundary |
| --- | --- | --- | --- |
| `P0 Secret Exposure Containment` | blocked by human action | revoke/rotate exposed provider tokens outside chat | no token values in chat/docs |
| `Night Watch` | `WARN`, exit 0 | keep callback treating WARN as non-blocking | patch only on true `FAILED` |
| `Validator Shield` | local tests and secret scan pass | pass explicit generated file paths to validator | block on finding |
| `Qwen 1M Context` | configured for deep planning | use for deep planner/reviewer only | no paid provider call without named task approval |
| `n8n MCP Policy` | drafted, not registered | display policy locally after approval | no MCP registration |
| `External Evidence Gates` | 5 blocked | fill one non-secret evidence gate | no external execution |
| `Subagent Team` | draft-only | keep as routing config | no live dispatch |
| `Mission Control` | future | command to approval to evidence to vault | source approval required |

## Gate State

```mermaid
stateDiagram-v2
  [*] --> Intake
  Intake --> LocalAudit
  LocalAudit --> SecretContainment: raw token exposure exists
  SecretContainment --> EvidenceReady: rotated + non-secret evidence
  LocalAudit --> PlanReady
  PlanReady --> ImplementationBlocked: no exact approval
  ImplementationBlocked --> LocalImplementation: APPROVE_IMPLEMENTATION for named target
  LocalImplementation --> ValidatorShield
  ValidatorShield --> Verification
  Verification --> ReportAndVault
  ReportAndVault --> [*]

  ValidatorShield --> ImplementationBlocked: finding or missing scope
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
  participant D as Dev Control API
  participant O as Obsidian

  U->>H: Goal / command
  H->>P: classify risk and approval
  P-->>H: local-only / blocked / approved target
  H->>V: validate generated files or command packet
  V-->>H: pass/fail with redacted findings only
  H->>D: local status or approved source slice
  D-->>H: local evidence
  H->>O: write concise decision note
```

## Implementation Notes

- Keep this file as the top-level Godmode continuation grid.
- Put reusable Mermaid snippets in `docs/knowledge/SIRINX_GODMODE_GRID_MERMAID_SYNTAX_2026-05-28.md`.
- Do not use this file to authorize implementation, provider calls, MCP activation, external sends, deploys, pushes, installs, or clones.
- First local source target remains: `APPROVE_IMPLEMENTATION for n8n permission policy display`.

