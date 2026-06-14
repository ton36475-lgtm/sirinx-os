# 13 - Connector Capability Registry Grid

Status: local-only capability registry

```mermaid
flowchart TB
  GOAL["Plugin list from operator"] --> REG["Connector Registry API"]

  subgraph OWNERS["7 Owner Lanes"]
    SHOGUN["shogun: Superpowers"]
    PLANNER["planner: ClickUp / Figma / Canva"]
    BACKEND["backend: OpenAI Developers"]
    SCRIBE["scribe: Notion / Google Drive / Sheets / Docs / Decks"]
    QA["qa: Computer Use / Chrome / Browser"]
    DEVOPS["devops: GitHub"]
    SECURITY["security: Supabase"]
  end

  subgraph CONTRACT["Local-Only Contract"]
    LOCAL["externalWrites=false"]
    ACTIVATE["canActivate=false"]
    MCP["canRunMcp=false"]
    SECRET["canReadSecrets=false"]
    APPROVAL["requiresApproval=true"]
  end

  subgraph DOWNSTREAM["Downstream Consumers"]
    GATEWAY["Gateway Agent summary"]
    TEAM["47 Ronin inherited visibility"]
    A2A["A2A2LoopSync owner packets"]
    STOP["Stop before connector activation"]
  end

  REG --> SHOGUN
  REG --> PLANNER
  REG --> BACKEND
  REG --> SCRIBE
  REG --> QA
  REG --> DEVOPS
  REG --> SECURITY

  SHOGUN --> LOCAL
  PLANNER --> ACTIVATE
  BACKEND --> MCP
  SCRIBE --> SECRET
  QA --> APPROVAL
  DEVOPS --> APPROVAL
  SECURITY --> APPROVAL

  LOCAL --> GATEWAY
  ACTIVATE --> TEAM
  MCP --> A2A
  SECRET --> STOP
  APPROVAL --> STOP

  STOP -. "no external connector / real MCP / paid API / secret read / send" .-> REG
```

## Definition Of Done

- All 15 connectors are represented as local capability records.
- The registry exposes exactly 7 owner packets.
- Gateway Agent includes connector summary without activating anything.
- The wiring map routes `gateway-agent -> connector-registry -> ai-team-pairing`.
