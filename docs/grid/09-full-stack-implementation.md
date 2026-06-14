# 09 - Full-Stack Implementation Grid For SIRINX

Status: implementation blueprint, local-only

```mermaid
flowchart TB
  subgraph FRONT["Frontend"]
    UI["Mission Control Dashboard"]
    APPUI["Future MCP Apps iframe UI"]
    VIDEOUI["Video Editing Review UI"]
  end

  subgraph API["Backend API"]
    VIBEAPI["/api/vibe-coding-agent"]
    SOCAPI["/api/soc/status"]
    MCPAPI["MCP Stateless Gateway"]
    TASKAPI["Task Registry API"]
  end

  subgraph DATA["State / Memory"]
    VAULT["Obsidian / Vault"]
    A2A["A2A Queue"]
    TASKDB["Task Handle Store"]
    CACHE["tools/list TTL Cache"]
  end

  subgraph OPS["Ops"]
    WSLTUI["Hermes --tui default on WSL"]
    VERIFY["verify:workspace / dashboard:e2e"]
    SECRET["Secret Scan"]
    APPROVAL["Approval Gate"]
  end

  UI --> VIBEAPI
  UI --> SOCAPI
  APPUI --> MCPAPI
  VIDEOUI --> TASKAPI
  VIBEAPI --> VAULT
  SOCAPI --> A2A
  MCPAPI --> CACHE
  TASKAPI --> TASKDB
  WSLTUI --> VERIFY
  VERIFY --> SECRET
  SECRET --> APPROVAL
  APPROVAL -->|"approved only"| MCPAPI
```

## Definition Of Done

- Frontend reads only local API state until external approval.
- MCP gateway remains a blueprint until exact implementation approval.
- Every queue/task handle must have provenance and cancellation behavior.

