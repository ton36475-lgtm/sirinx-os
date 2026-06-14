# 01 - Master Grid: MCP Stateless Agent-Native OS

Status: source split from `docs/knowledge/SIRINX_MCP_HERMES_VIDEO_AI_GRID_MERMAID_2026-05-26.md`

```mermaid
flowchart TB
  subgraph U["User / Operator Layer"]
    CEO["CEO / Human Operator"]
    WSL["WSL Operator"]
    CREATOR["Video Creator"]
    DEV["Full-Stack Developer"]
  end

  subgraph G["Governance Layer"]
    TRUTH["Truth Protocol: observed / template / blocked / not_run"]
    APPROVAL["Human Approval Gate"]
    SECRET["Secret Boundary"]
    POLICY["Policy / Compliance Gate"]
  end

  subgraph MCP["MCP 2026 Draft Core"]
    STATELESS["Stateless Requests"]
    META["_meta protocolVersion / clientInfo / clientCapabilities"]
    HANDLES["Explicit Handles: task_id / browser_id / job_id"]
    TOOLS["tools/list deterministic + cache-friendly"]
    TASKS["Tasks Extension"]
    APPS["MCP Apps Extension"]
  end

  subgraph AGENT["Agentic Runtime"]
    VIBE["Local Vibe Coding Agent"]
    HERMES["Hermes Agent / CLI / TUI"]
    SUB["Sub-Agent Fan-Out"]
    QUEUE["Long-Running Work Queue"]
  end

  subgraph PRODUCT["Product Workflows"]
    CODE["Coding / Repo / Diff / Verify"]
    VIDEO["AI Video Editing Pipeline"]
    SOC["SOC / Local Host Monitor"]
    DASH["Mission Control Dashboard"]
  end

  CEO --> APPROVAL
  DEV --> VIBE
  WSL --> HERMES
  CREATOR --> VIDEO
  APPROVAL --> POLICY --> SECRET --> TRUTH
  TRUTH --> VIBE
  VIBE --> STATELESS
  HERMES --> STATELESS
  STATELESS --> META
  STATELESS --> HANDLES
  STATELESS --> TOOLS
  TASKS --> QUEUE
  APPS --> DASH
  VIBE --> CODE
  HERMES --> CODE
  QUEUE --> VIDEO
  QUEUE --> SOC
  SUB --> TASKS
  SUB --> TOOLS
  CODE --> DASH
  SOC --> DASH
```

## Implementation Note

Use this as the parent map only. Do not add implementation details here; split work into the child grid files.

