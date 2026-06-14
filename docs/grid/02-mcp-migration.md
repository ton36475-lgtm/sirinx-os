# 02 - MCP Migration Grid

Status: verified technical source required before implementation

```mermaid
flowchart LR
  subgraph OLD["Old MCP Transport Pattern"]
    O1["initialize handshake"]
    O2["Mcp-Session-Id"]
    O3["Sticky routing / shared session store"]
    O4["Connection-bound capabilities"]
  end

  subgraph NEW["2026 Draft Stateless Pattern"]
    N1["No protocol-level sessions"]
    N2["No Mcp-Session-Id header"]
    N3["Every request is self-contained"]
    N4["_meta carries protocol version, client identity, capabilities"]
    N5["Ordinary load balancer friendly"]
  end

  subgraph APPSTATE["Application State Still Allowed"]
    H1["Server mints explicit handle"]
    H2["Model returns handle as tool argument"]
    H3["Examples: task_id, browser_id, export_id, job_id"]
  end

  O1 --> O2 --> O3 --> O4
  O4 -->|"breaking migration"| N1
  N1 --> N2 --> N3 --> N4 --> N5
  N3 --> H1 --> H2 --> H3
```

## Definition Of Done

- Identify which SIRINX MCP-like endpoints assume hidden transport sessions.
- Replace hidden session assumptions with explicit handles.
- Stop before running any real MCP server or connector.

