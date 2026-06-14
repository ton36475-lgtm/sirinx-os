# SIRINX MCP / Hermes / Video AI / AI Apps Grid Mermaid Pack

Date: 2026-05-26
Mode: knowledge extraction, local-only, no external connector activation
Status: GRID MERMAID KNOWLEDGE EXTRACT READY - WAITING FOR IMPLEMENTATION APPROVAL

## Atomic Grid Split

Use the smaller files in `docs/grid/` for Codex execution. The master pack remains a source reference only.

- `docs/grid/README.md`
- `docs/grid/01-master-grid.md`
- `docs/grid/02-mcp-migration.md`
- `docs/grid/03-agentic-parallel.md`
- `docs/grid/04-mcp-tasks-lifecycle.md`
- `docs/grid/05-mcp-apps.md`
- `docs/grid/06-hermes-wsl.md`
- `docs/grid/07-ai-video-pipeline.md`
- `docs/grid/08-ai-apps-taxonomy.md`
- `docs/grid/09-full-stack-implementation.md`
- `docs/grid/10-risk-verification.md`

## Source Boundary

- Verified technical source: official MCP draft/spec/blog pages checked on 2026-05-26.
- Unverified social/market claims: OpenClaw star count, platform skill percentage, course conversion claims, and third-party tool rankings. Treat as research signals, not facts.
- Attached visual sources: Hermes WSL/TUI poster, Claude Code video editing course poster, AI apps taxonomy posters.

## 1. Master Grid - MCP Stateless Agent-Native OS

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

## 2. MCP Migration Grid - 2025-11-25 To 2026 Draft

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

## 3. Agentic Impact Grid

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

## 4. MCP Tasks Lifecycle Grid

```mermaid
stateDiagram-v2
  [*] --> working: CreateTaskResult
  working --> input_required: receiver needs input
  input_required --> working: tasks/input_response
  working --> completed: success
  working --> failed: execution error
  working --> cancelled: tasks/cancel
  input_required --> cancelled: tasks/cancel
  completed --> [*]
  failed --> [*]
  cancelled --> [*]
```

## 5. MCP Apps Grid

```mermaid
flowchart LR
  TOOL["MCP Tool Description"] --> URI["_meta.ui.resourceUri"]
  URI --> HOST["Host preloads ui:// resource"]
  HOST --> HTML["HTML / JS / CSS Resource"]
  HTML --> IFRAME["Sandboxed iframe"]
  IFRAME --> RPC["postMessage JSON-RPC"]
  RPC --> CALL["tools/call / ui methods"]
  CALL --> RESULT["Interactive dashboard / form / workflow"]

  subgraph SECURITY["Security Boundary"]
    CSP["CSP allowlist"]
    PERM["Permission request"]
    ISOLATE["No parent DOM / cookie / localStorage access"]
  end

  IFRAME --> SECURITY
```

## 6. Hermes WSL Performance Grid

```mermaid
flowchart TB
  subgraph NORMAL["WSL: hermes normal mode"]
    N1["Frequent stdout flush"]
    N2["ANSI / emoji / spinner overhead"]
    N3["PTY latency"]
    N4["Subprocess context switch"]
    N5["Symptoms: slow, reconnecting, timeout, connection lost"]
  end

  subgraph TUI["WSL: hermes --tui"]
    T1["Alternate screen buffer"]
    T2["Frame-based redraw"]
    T3["Buffered UI updates"]
    T4["Async state kept in memory"]
    T5["Symptoms: lower latency, stable connection, higher throughput"]
  end

  subgraph OPT["Hermes Engineering Fixes"]
    O1["Detect WSL_DISTRO_NAME"]
    O2["Disable spinner / emoji when terminal is weak"]
    O3["NO_COLOR fallback"]
    O4["Buffered output flush"]
    O5["Default to TUI on WSL"]
    O6["Prefer ext4 project path over /mnt/c"]
  end

  NORMAL --> OPT
  TUI --> OPT
```

## 7. AI Video Editing Pipeline Grid

```mermaid
flowchart LR
  RAW["Raw video clips"] --> INGEST["Upload / ingest"]
  INGEST --> ANALYZE["AI analysis"]
  ANALYZE --> TRANSCRIBE["Transcribe speech"]
  TRANSCRIBE --> SUB["Generate subtitles"]
  TRANSCRIBE --> CUT1["Cut dead air"]
  TRANSCRIBE --> CUT2["Cut mistakes"]
  TRANSCRIBE --> CUT3["Cut unclear speech"]
  SUB --> STYLE["Apply creator style memory"]
  CUT1 --> STYLE
  CUT2 --> STYLE
  CUT3 --> STYLE
  STYLE --> ASSETS["Template packs: titles / subtitles / lower thirds / frames / animation"]
  ASSETS --> EXPORT["Edited clip with subtitles"]
  EXPORT --> REVIEW["Human review"]
  REVIEW --> PUBLISH["Publish only after approval"]
```

## 8. AI Apps 2026 Taxonomy Grid

```mermaid
flowchart TB
  ROOT["AI Apps 2026 Ecosystem"]

  ROOT --> GENERAL["General Assistants"]
  GENERAL --> CLAUDE["Claude"]
  GENERAL --> CHATGPT["ChatGPT"]
  GENERAL --> PERP["Perplexity"]

  ROOT --> DEVTOOLS["Development / Programming"]
  DEVTOOLS --> CURSOR["Cursor"]
  DEVTOOLS --> LOVABLE["Lovable"]
  DEVTOOLS --> REPLIT["Replit"]
  DEVTOOLS --> BOLT["Bolt"]
  DEVTOOLS --> CLCODE["Claude Code"]

  ROOT --> CONTENT["Content Creation"]
  CONTENT --> HEYGEN["HeyGen"]
  CONTENT --> SYNTH["Synthesia"]
  CONTENT --> DESCRIPT["Descript"]
  CONTENT --> OPUS["Opus Clip"]
  CONTENT --> BEEHIIV["Beehiiv"]
  CONTENT --> KAPWING["Kapwing"]

  ROOT --> PRODUCTIVITY["Productivity"]
  PRODUCTIVITY --> GRAM["Grammarly"]
  PRODUCTIVITY --> NOTEBOOK["NotebookLM"]
  PRODUCTIVITY --> NOTION["Notion AI"]
  PRODUCTIVITY --> GAMMA["Gamma"]
  PRODUCTIVITY --> GRANOLA["Granola"]
  PRODUCTIVITY --> OTTER["Otter AI"]
  PRODUCTIVITY --> WISPR["Wispr Flow"]

  ROOT --> CREATIVE["Creativity"]
  CREATIVE --> ELEVEN["ElevenLabs"]
  CREATIVE --> SUNO["Suno"]
  CREATIVE --> MID["Midjourney"]
  CREATIVE --> RUNWAY["Runway"]
  CREATIVE --> KLING["Kling"]
  CREATIVE --> PIKA["Pika Labs"]
  CREATIVE --> IDEO["Ideogram"]
  CREATIVE --> CANVA["Canva"]
  CREATIVE --> VEO["Google Veo"]
  CREATIVE --> FIREFLY["Adobe Firefly"]

  ROOT --> AUTO["Automation / Integration"]
  AUTO --> N8N["n8n"]
  AUTO --> ZAP["Zapier"]
  AUTO --> LINDY["Lindy AI"]
  AUTO --> CHATBASE["Chatbase"]
  AUTO --> GEMINI["Gemini"]
  AUTO --> MANUS["Manus AI"]
  AUTO --> MAKE["Make"]
  AUTO --> CLAY["Clay"]
```

## 9. Full-Stack Implementation Grid For SIRINX

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

## 10. Risk / Verification Grid

```mermaid
flowchart LR
  INPUT["Any claim / tool / workflow"] --> CLASSIFY{"Claim Type"}
  CLASSIFY -->|"Observed"| OBS["Local command / official source / current evidence"]
  CLASSIFY -->|"Template"| TEMPLATE["Layout / placeholder / demo copy"]
  CLASSIFY -->|"Blocked"| BLOCK["Requires approval or missing evidence"]
  CLASSIFY -->|"Unverified"| RESEARCH["Research signal only"]

  OBS --> ALLOW["Can enter docs as fact"]
  TEMPLATE --> LABEL["Must label as template"]
  BLOCK --> STOP["Stop before external effect"]
  RESEARCH --> VERIFY["Verify before business decision"]

  STOP --> APPROVAL["Human approval packet"]
```

## Verified MCP Notes

- The official draft changelog says the draft removes protocol-level sessions and `Mcp-Session-Id`, and shifts request identity/capability data into `_meta`.
- The draft overview requires per-request `io.modelcontextprotocol/*` fields.
- The Tasks draft defines durable task state, `taskId`, terminal states, `tasks/get`, `tasks/result`, and cancellation behavior.
- MCP Apps are an extension that renders HTML UI resources in sandboxed iframes and communicates through JSON-RPC/postMessage.

## Stop Point

```text
GRID MERMAID KNOWLEDGE EXTRACT READY - WAITING FOR IMPLEMENTATION APPROVAL
```
