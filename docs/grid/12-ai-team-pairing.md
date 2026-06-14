# 12 - AI Team Pairing Grid

Status: local-only pairing contract

```mermaid
flowchart TB
  GOAL["Pair all AI team"] --> PAIR["AI Team Pairing API"]

  subgraph ROSTER["47 Ronin Roster"]
    ACTIVE["12 active Hermes profiles"]
    VIRTUAL["35 virtual roster roles"]
  end

  subgraph RUNTIME["Runtime Pairing"]
    CODEX["Codex Control"]
    HERMES["Hermes TUI Manual"]
    GEMINI["Gemini CLI Manual Review"]
    A2A["A2A2LoopSync Evidence"]
  end

  subgraph GATES["Messaging / External Gates"]
    TG["Telegram target evidence"]
    LINE["LINE scope evidence"]
    APPROVAL["Final human approval"]
    STOP["Stop before send / gateway / connector"]
  end

  PAIR --> ACTIVE
  PAIR --> VIRTUAL
  ACTIVE --> CODEX
  VIRTUAL --> CODEX
  ACTIVE --> HERMES
  VIRTUAL --> GEMINI
  CODEX --> A2A
  HERMES --> A2A
  GEMINI --> A2A
  A2A --> TG
  A2A --> LINE
  TG --> APPROVAL
  LINE --> APPROVAL
  APPROVAL --> STOP

  STOP -. "no Telegram send / LINE send / per-profile gateway / external connector" .-> PAIR
```

## Definition Of Done

- All 47 roles have a local owner profile.
- Every role has a runtime lane and A2A channel.
- Messaging stays blocked until evidence and approval exist.
- No CLI is auto-run from pairing output.
