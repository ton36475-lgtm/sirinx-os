# 11 - Gateway Agent A2A2LoopSync Grid

Status: local-only control contract

```mermaid
flowchart TB
  HUMAN["Human Goal"] --> GATE["Unified Gateway Agent"]

  subgraph RUNTIME["Runtime Lanes"]
    CODEX["Codex Local Host"]
    HERMES["Hermes TUI Manual Lane"]
    GEMINI["Gemini CLI Manual Review"]
    A2A["A2A2LoopSync Evidence Loop"]
  end

  subgraph EXISTING["Existing SIRINX Contracts"]
    VIBE["Local Vibe Coding Agent"]
    RONIN["47 Ronin Agent Team"]
    INBOX["Hermes Inbox Dry-Run"]
    SOC["A2ASync SOC Status"]
    TRUTH["Truth Protocol"]
    PENDING["Pending Gate Ledger"]
  end

  subgraph OUTPUT["Gateway Output"]
    PARTS["Part Assignments"]
    EVIDENCE["Evidence Packet"]
    KNOWLEDGE["Knowledge Split"]
    VERIFY["Verification Matrix"]
    APPROVAL["Approval Packet"]
    STOP["Stop Before External Action"]
  end

  GATE --> CODEX
  GATE --> HERMES
  GATE --> GEMINI
  GATE --> A2A
  GATE --> VIBE
  VIBE --> RONIN
  VIBE --> INBOX
  VIBE --> SOC
  SOC --> TRUTH
  TRUTH --> PENDING
  RONIN --> PARTS
  INBOX --> PARTS
  A2A --> EVIDENCE
  EVIDENCE --> KNOWLEDGE
  KNOWLEDGE --> VERIFY
  VERIFY --> APPROVAL
  APPROVAL --> STOP

  HERMES -. "blocked if context < 64000" .-> STOP
  GEMINI -. "manual review only, no auto-run" .-> STOP
  STOP -. "no deploy / push / publish / real MCP / connector / secret / send" .-> APPROVAL
```

## Definition Of Done

- Gateway exposes runtime lanes without invoking them.
- Dry-run planning creates part assignments only.
- A2A2LoopSync emits evidence and next exact steps.
- Existing Vibe Agent remains the safe action planner.
- External actions stop at an approval packet.
