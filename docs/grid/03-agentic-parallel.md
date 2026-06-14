# 03 - Agentic Parallel Tool Grid

Status: architecture pattern, local-only

```mermaid
flowchart TB
  REQ["Agent Goal"] --> PLAN["Plan / Tool Selection"]
  PLAN --> LIST["tools/list"]
  LIST --> CACHE["Cache capability list with TTL / deterministic order"]
  CACHE --> FAN["Parallel tool fan-out"]

  FAN --> A["Instance A"]
  FAN --> B["Instance B"]
  FAN --> C["Instance C"]

  A --> TASK1["Task Handle"]
  B --> TASK2["Task Handle"]
  C --> TASK3["Task Handle"]

  TASK1 --> POLL["tasks/get / tasks/result"]
  TASK2 --> POLL
  TASK3 --> POLL

  POLL --> MERGE["Synthesize results"]
  MERGE --> VERIFY["Verify / Risk Matrix"]
  VERIFY --> PACKET["Approval Packet"]
  PACKET --> STOP["Stop before external effect"]
```

## Definition Of Done

- One fan-out job must have an explicit handle per worker.
- Each worker output must be merged through verification, not trusted directly.
- External writes remain blocked until an approval packet exists.

