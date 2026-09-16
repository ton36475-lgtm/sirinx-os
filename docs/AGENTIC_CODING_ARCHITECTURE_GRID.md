# SIRINX OS — Agentic Coding Architecture (GODMODE Blueprint)

> **MIT License** — End-to-end goal spec driving agent-loop evolution
> Architecture: V4 LOCKED | Research: V1 LOCKED | Node: `local_mac_m2_core`
> All LLM via OmniRoute :20128 (257 providers, 94 MCP tools)

---

## 1. SYSTEM LAYER GRID (Mermaid)

```mermaid
graph TB
    %% ═══ USER LAYER ═══
    subgraph USER["👤 USER LAYER"]
        TG["Telegram Command Center<br/>/goal /approve /deploy"]
        CRD["Chrome Remote Desktop<br/>Owner Mobile → Mac M2"]
        DASH["Dev Dashboard<br/>dev.sirinx.co"]
    end

    %% ═══ EDGE LAYER ═══
    subgraph EDGE["🌐 EDGE LAYER (Cloudflare)"]
        CF_WORKER["Main Router Worker<br/>sirinx.co / api.sirinx.co"]
        CF_PAGES["Cloudflare Pages<br/>www.sirinx.co"]
        CF_D1[("D1 Database<br/>sirinx-unified-db")]
        CF_R2[("R2 Storage<br/>quarantine + assets")]
        CF_TUNNEL["Cloudflare Tunnel<br/>(future: Editing-PC)"]
    end

    %% ═══ ORCHESTRATION LAYER ═══
    subgraph ORCH["🧠 ORCHESTRATION LAYER (Mac M2 Core)"]
        HERMES["Hermes Agent HQ<br/>:8644"]
        EVOLUTION["Self-Evolution Engine<br/>L1→L5 pipeline (cron 30m)"]
        DISPATCHER["CMUX Agent Dispatcher<br/>brainstorm → lane → worktree"]
        DAG["Task DAG Resolver<br/>goal decompose → 11 intents"]
    end

    %% ═══ AI GATEWAY LAYER ═══
    subgraph AI_GW["🔌 AI GATEWAY (OmniRoute :20128)"]
        OMNI["OmniRoute Load Balancer<br/>257 providers"]
        MCP["MCP Server<br/>94 tools"]
        A2A["A2A Protocol v2<br/>canonical packets"]
        COST["Cost Guard<br/>$0.10/request max"]
    end

    %% ═══ AGENT WORKER LAYER ═══
    subgraph AGENTS["🤖 AGENT WORKERS (3 Worktrees)"]
        CLAUDE["Claude Architect<br/>.worktrees/claude<br/>read-only design + docs"]
        CODEX["Codex Captain<br/>.worktrees/codex<br/>write code + fix bugs"]
        OPENCODE["OpenCode Reviewer<br/>.worktrees/opencode<br/>review + QA + security"]
    end

    %% ═══ RESEARCH LAYER ═══
    subgraph RESEARCH["🔬 RESEARCH PLANE"]
        AGY["AGY + Gemini Deep Research<br/>Google Drive (READ_ONLY)<br/>search + synthesis"]
        GLM_CRITIC["GLM-5.2 Red-Team Critic<br/>via OmniRoute API<br/>offline critique only"]
    end

    %% ═══ DATA LAYER ═══
    subgraph DATA["💾 DATA LAYER"]
        QUEUE[("_A2A_QUEUE<br/>inbox → assigned → done")]
        LEDGER["Evidence Ledger<br/>hash + timestamp"]
        BRAIN[("Obsidian Brain<br/>SIRINX vault")]
        LOGS["Evolution Logs<br/>docs/evolution-log/"]
    end

    %% ═══ MEDIA LAYER ═══
    subgraph MEDIA["🎬 MEDIA LAYER (Editing-PC LAN)"]
        FFMPEG["FFmpeg Engine"]
        RENDER["Render Queue"]
        MEDIA_OUT["Media Output Share"]
    end

    %% ═══ EXTERNAL LAB (ISOLATED) ═══
    subgraph LAB["⚠️ EXTERNAL LAB (Quarantine Only)"]
        WARLAND["WarLand<br/>OSINT + Cyber Lab"]
        POIPET["Poipet-PC<br/>Research + Testing"]
        QUARANTINE["R2 Quarantine Bucket<br/>Mac pulls only"]
    end

    %% ═══ CONNECTIONS ═══
    TG -->|"/goal"| HERMES
    CRD -->|"remote session"| HERMES
    DASH -->|"read status"| HERMES

    HERMES --> DAG
    DAG --> DISPATCHER
    DISPATCHER --> CLAUDE
    DISPATCHER --> CODEX
    DISPATCHER --> OPENCODE

    HERMES --> OMNI
    CLAUDE --> OMNI
    CODEX --> OMNI
    OPENCODE --> OMNI
    AGY --> OMNI

    OMNI --> MCP
    OMNI --> A2A
    OMNI --> COST

    EVOLUTION --> DISPATCHER
    EVOLUTION --> QUEUE
    EVOLUTION --> LOGS

    CF_WORKER --> HERMES
    CF_WORKER --> CF_D1
    CF_WORKER --> CF_R2

    WARLAND -->|"HTTPS PUT only"| QUARANTINE
    POIPET -->|"HTTPS PUT only"| QUARANTINE
    QUARANTINE -->|"Mac pulls"| LEDGER

    AGY --> LEDGER
    GLM_CRITIC --> LEDGER
    LEDGER --> BRAIN
```

---

## 2. AGENT LOOP EVOLUTION FLOW

```mermaid
flowchart LR
    subgraph INTAKE["📥 INTAKE"]
        IN1["Telegram /goal"]
        IN2["Cron trigger"]
        IN3["Error detected"]
    end

    subgraph BRAINSTORM["🧠 BRAINSTORM (pre-OmniRoute)"]
        BS1["Classify intent<br/>13 keyword patterns"]
        BS2["Determine lane<br/>architecture/backend/qa/..."]
        BS3["Safety scan<br/>10 forbidden patterns"]
        BS4["Tier classify<br/>A=auto / B=auto / C=approve"]
    end

    subgraph DISPATCH["📡 DISPATCH (via OmniRoute)"]
        D1["Create canonical A2A packet"]
        D2["Route to worktree<br/>claude / codex / opencode"]
        D3["Start agent with scoped manifest"]
    end

    subgraph EXECUTE["⚡ EXECUTE (isolated lane)"]
        E1["Agent calls OmniRoute<br/>for LLM inference"]
        E2["Agent writes code<br/>in worktree only"]
        E3["Run pnpm hq:test"]
    end

    subgraph DREAM["😴 DREAM MODE"]
        DM1["Snapshot git state"]
        DM2{"Test PASS?"}
        DM3["✅ Auto-approve"]
        DM4["❌ Rollback"]
    end

    subgraph DEPLOY["🚀 DEPLOY"]
        DP1["git commit (safe files)"]
        DP2["OpenCode review diff"]
        DP3["Telegram: Push? Deploy?"]
        DP4["git push → GitHub"]
        DP5["wrangler deploy → CF"]
    end

    subgraph EVOLVE["🧬 EVOLVE"]
        EV1["Mutation engine<br/>error → knowledge"]
        EV2["Skill creator<br/>pattern → skill"]
        EV3["CMUX checkpoint<br/>freeze.json"]
        EV4["Obsidian brain sync"]
    end

    IN1 --> BS1
    IN2 --> BS1
    IN3 --> EV1

    BS1 --> BS2 --> BS3 --> BS4
    BS4 -->|"Tier A/B"| D1
    BS4 -->|"Tier C/D"| DP3

    D1 --> D2 --> D3 --> E1 --> E2 --> E3
    E3 --> DM1 --> DM2
    DM2 -->|"YES"| DM3 --> DP1
    DM2 -->|"NO"| DM4 --> EV1

    DP1 --> DP2 --> DP3
    DP3 -->|"approve"| DP4 --> DP5
    DP3 -->|"deny"| EV1

    EV1 --> EV2 --> EV3 --> EV4
    EV4 -->|"feedback"| BS1
```

---

## 3. DATA FLOW (End-to-End)

```mermaid
sequenceDiagram
    actor U as Operator (Telegram)
    participant H as Hermes HQ
    participant BS as Brainstorm
    participant D as Dispatcher
    participant WT as Worktree Agent
    participant O as OmniRoute :20128
    participant T as Test Suite
    participant G as Git + GitHub
    participant CF as Cloudflare Edge
    participant E as Evolution Engine

    U->>H: /goal "fix LINE webhook"
    H->>BS: classify + route
    BS->>BS: lane=line-bot, tier=B, safe ✅
    BS->>D: dispatch to codex worktree
    D->>WT: manifest assigned
    WT->>O: POST /api/chat (GLM-5.2)
    O-->>WT: code suggestions
    WT->>WT: implement fix in worktree
    WT->>T: pnpm hq:test
    T-->>WT: PASS ✅
    WT->>G: git commit (auto)
    WT->>G: git push (auto Tier B)
    G->>CF: GitHub webhook (future)
    CF->>CF: Pages auto-deploy
    E->>E: checkpoint freeze.json
    E->>U: ✅ Task complete + report
```

---

## 4. WORKTREE LANE ISOLATION

```mermaid
graph LR
    subgraph MAIN["main branch (migration/v5-rebase)"]
        M_CORE["Core scripts<br/>self-evolution-core.py<br/>deploy-pipeline.py<br/>cmux-agent-dispatcher.py"]
        M_CONFIG["Config<br/>omniroute-wiring.json<br/>cron-jobs-v4.json<br/>ronin-47-agent-cards.json"]
        M_DOCS["Docs<br/>CANONICAL_ARCH_V4<br/>RESEARCH_ARCH_V1<br/>47_RONIN_MATRIX"]
    end

    subgraph CLAUDE[".worktrees/claude (vibe/claude)"]
        C_ARCH["Architecture<br/>system design<br/>read-only analysis"]
        C_DOCS["Documentation<br/>guides + refs"]
    end

    subgraph CODEX[".worktrees/codex (vibe/codex)"]
        X_BACK["Backend<br/>services/ packages/<br/>API + DB + queue"]
        X_FRONT["Frontend<br/>apps/ UI components"]
        X_INFRA["Infra<br/>deploy scripts<br/>config wiring"]
        X_LINE["LINE Bot<br/>webhook + intent"]
    end

    subgraph OPENCODE[".worktrees/opencode (vibe/opencode)"]
        O_QA["QA<br/>test writing<br/>lint + validate"]
        O_REV["Review<br/>diff scan<br/>secret detection"]
        O_SEC["Security<br/>vulnerability check"]
    end

    DISPATCHER -->|"route by lane"| CLAUDE
    DISPATCHER -->|"route by lane"| CODEX
    DISPATCHER -->|"route by lane"| OPENCODE
```

---

## 5. CRON TIMELINE (7 Jobs)

```mermaid
gantt
    title SIRINX OS Cron Timeline (7 jobs, repeating)
    dateFormat mm:ss
    axisFormat %M:%S

    section Loop
    loop-engineering (5m)    :a1, 00:00, 5m
    loop-engineering (5m)    :a2, after a1, 5m
    loop-engineering (5m)    :a3, after a2, 5m

    section Dispatch
    agent-dispatch (7m)      :b1, 00:00, 7m
    agent-dispatch (7m)      :b2, after b1, 7m

    section Disk
    disk-health (10m)        :c1, 00:00, 10m
    disk-health (10m)        :c2, after c1, 10m

    section Health
    health-check (15m)       :d1, 00:00, 15m

    section Brainstorm
    collect-brainstorm (20m) :e1, 00:00, 20m

    section Evolution
    self-evolution (30m)     :f1, 00:00, 30m

    section Daily
    daily-report (08:00)     :g1, 00:00, 1m
```

---

## 6. RESEARCH PIPELINE (CEH v13 → Knowledge)

```mermaid
flowchart TD
    DRIVE[("Google Drive<br/>CEH v13<br/>22 PDFs + 21 Videos")]
    
    DRIVE -->|"AGY READ_ONLY"| INVENTORY["Stage 1: Recursive Inventory<br/>file ID + path + hash + MIME"]
    INVENTORY --> PDF_ANALYSIS["Stage 2: PDF Evidence<br/>raw parsing (NOT text layer)<br/>page-level topic index"]
    INVENTORY --> VIDEO_ANALYSIS["Stage 3: Video Evidence<br/>audio extraction → transcript<br/>timestamped segments"]
    INVENTORY --> LAB_REGISTER["Stage 4: Lab Safety<br/>metadata + hash ONLY<br/>NEVER execute"]
    
    PDF_ANALYSIS --> SYNTHESIS["Stage 5: Knowledge Synthesis<br/>Module 01-20<br/>defensive knowledge"]
    VIDEO_ANALYSIS --> SYNTHESIS
    LAB_REGISTER --> SYNTHESIS
    
    SYNTHESIS --> CROSSWALK["Stage 6: Crosswalk<br/>MITRE ATT&CK<br/>OWASP / NIST / CIS"]
    
    CROSSWALK --> SANITIZER["Sanitizer<br/>remove PII + credentials<br/>hash sources"]
    
    SANITIZER --> GLM_CRITIC["GLM-5.2 Red-Team Critic<br/>via OmniRoute API<br/>challenge + find gaps"]
    
    GLM_CRITIC --> VALIDATOR["Deterministic Validator<br/>source verification<br/>page/timestamp check"]
    
    VALIDATOR --> KNOWLEDGE[("GhostClaw Knowledge<br/>14 deliverables<br/>JSONL ingestion pack")]
```

---

## 7. COMPONENT STATUS MATRIX

| Layer | Component | Status | Files | Action Needed |
|-------|-----------|--------|-------|---------------|
| **Edge** | CF Main Router | ✅ LIVE | 280 LOC worker.js | Route binding (Zone:Edit) |
| **Edge** | CF Pages | ✅ LIVE | sirinx.co 200 | — |
| **Edge** | CF D1 | ✅ Bound | sirinx-unified-db | Schema migration |
| **Edge** | CF R2 | ⚠️ Configured | quarantine bucket | Presigned URL setup |
| **Orchestration** | Hermes HQ | ✅ Running :8644 | v0.18.2 | — |
| **Orchestration** | Self-Evolution | ✅ Cron 30m | self-evolution-core.py | — |
| **Orchestration** | CMUX Dispatcher | ✅ Cron 7m | cmux-agent-dispatcher.py | — |
| **Orchestration** | Task DAG | ✅ Ready | task-dag-resolver.py | — |
| **AI Gateway** | OmniRoute | ✅ UP :20128 | 257 providers | — |
| **AI Gateway** | MCP Tools | ✅ 94 tools | filesystem, git, process | — |
| **AI Gateway** | A2A Protocol | ✅ v2 canonical | 31 packets dispatched | — |
| **AI Gateway** | Cost Guard | ✅ Active | $0.10/req max | — |
| **Agent** | Claude Architect | ⚠️ Idle | .worktrees/claude 2 tasks | Assign work |
| **Agent** | Codex Captain | ⚠️ Idle | .worktrees/codex 20 tasks | Assign work |
| **Agent** | OpenCode Reviewer | ⚠️ Idle | .worktrees/opencode 9 tasks | Assign work |
| **Data** | A2A Queue | ✅ 0 inbox | 31 assigned, 0 blocked | Collect done |
| **Data** | Evidence Ledger | ⚠️ Stub | needs hash schema | Build schema |
| **Data** | Obsidian Brain | ✅ Connected | vault path exists | Auto-sync |
| **Data** | Evolution Logs | ✅ 5 cycles | docs/evolution-log/ | — |
| **Research** | AGY Plane | 🔲 Not started | AGY prompt ready | Execute via AGY CLI |
| **Research** | GLM-5.2 Critic | 🔲 Not started | prompt ready | Execute via OmniRoute |
| **Media** | Editing-PC | 🔲 Offline | LAN worker | Provision when needed |
| **Lab** | WarLand | 🔲 Offline | External lab | Quarantine setup |
| **Lab** | Poipet-PC | 🔲 Offline | External lab | Quarantine setup |
| **App** | sirinx-site | ✅ 11 files | Live on CF | Polish UI |
| **App** | solar-intelligence | ✅ 27 files | opal.sirinx.co | Deploy |
| **App** | dev-dashboard | ⚠️ 2 files | stub | **BUILD OUT** |
| **App** | centerbrain-shell | ⚠️ 19 files | partial | Complete features |
| **App** | live-agent-studio | ⚠️ 4 files | stub | **BUILD OUT** |
| **Service** | api-gateway | ⚠️ 4 files | ghostclaw routes only | Expand |
| **Service** | dev-control-api | ✅ 150 files | full API | Polish |
| **Service** | skills-api | ✅ 9 files | running :3800 | Expand skills |
| **Service** | orchestrator | ⚠️ 7079 files | bloated | **AUDIT + TRIM** |
| **Deploy** | GitHub remote | ✅ Pushed | ton36475-lgtm/sirinx-os | PR #1 open |
| **Deploy** | Deploy Pipeline | ✅ Ready | deploy-pipeline.py | — |

---

## 8. REFACTOR PRIORITY (End-to-End Rebuild Order)

```mermaid
flowchart TD
    R1["🔴 P0: Foundation<br/>Fix orchestrator bloat (7079 files)<br/>Clean dead code<br/>Consolidate services"] --> R2
    R2["🟠 P1: AI Backend<br/>Build services/ai-backend/<br/>FastAPI + RAG + guardrails<br/>Connect to OmniRoute"] --> R3
    R3["🟠 P1: API Gateway<br/>Expand services/api-gateway/<br/>REST + auth + rate limit<br/>Wire to all services"] --> R4
    R4["🟡 P2: Dev Dashboard<br/>Build apps/dev-dashboard/<br/>Mission Control UI<br/>Release gates + kill switches"] --> R5
    R5["🟡 P2: Live Agent Studio<br/>Build apps/live-agent-studio/<br/>Chat + approval + TTS<br/>LINE/YouTube ingestion"] --> R6
    R6["🟢 P3: Research Pipeline<br/>Execute AGY inventory<br/>Run GLM-5.2 critic<br/>Generate 14 deliverables"] --> R7
    R7["🟢 P3: Media Pipeline<br/>Wire Editing-PC<br/>FFmpeg automation<br/>Render queue"] --> R8
    R8["🔵 P4: External Labs<br/>Set up R2 quarantine<br/>WarLand + Poipet isolation<br/>Pull-only model"]
```

---

## 9. SKILL INTEGRATION MAP

| Skill | Category | Integrates With |
|-------|----------|-----------------|
| sirinx-unified-master-v2 | autonomous | ALL (master orchestrator) |
| godmode-autonomous-evolution | autonomous | evolution engine, dream mode |
| sirinx-unified-master-orchestrator | autonomous | replaced by v2 |
| goal-decomposer | automation | DAG resolver, dispatcher |
| telegram-approval-workflow | automation | deploy pipeline, Telegram bot |
| autonomous-loop-engineering | autonomous | loop engineering cron |
| antigravity-support | — | AGY research plane |
| claude-code | autonomous-ai-agents | claude worktree |
| codex | autonomous-ai-agents | codex worktree |
| opencode | autonomous-ai-agents | opencode worktree |
| dynamic-workflow | autonomous-ai-agents | fan-out workflow |
| vibe-coding-sidebar | autonomous-ai-agents | parallel coding |
| hermes-agent | — | Hermes HQ config |

---

## 10. CANONICAL FILE MAP

```
sirinx-os/
├── scripts/
│   ├── self-evolution-core.py       # L1-L5 evolution engine
│   ├── cmux-agent-dispatcher.py     # brainstorm → dispatch → collect
│   ├── deploy-pipeline.py           # commit → review → push → deploy
│   ├── task-dag-resolver.py         # goal → 11 intents → route
│   ├── a2a-bridge.py                # inbox → CLI dispatch
│   ├── auto-loop-engineering.mjs    # cron 5m loop cycle
│   ├── cron-disk-check.mjs          # cron 10m disk monitor
│   ├── cron-health-check.mjs        # cron 15m services
│   └── cron-daily-report.mjs        # cron 8am report
├── config/
│   ├── omniroute-wiring.json        # gateway config
│   ├── omniroute-gateway-wiring.json # per-agent model routing
│   ├── ronin-47-agent-cards.json    # 47 agents, 12 departments
│   ├── unified-skills-registry.json # 188 skills
│   └── cron-jobs-v4.json            # 7 cron definitions
├── docs/
│   ├── CANONICAL_NETWORK_ARCHITECTURE_V4.md   # topology LOCKED
│   ├── CANONICAL_RESEARCH_ARCHITECTURE_V1.md  # research LOCKED
│   ├── ARCHITECTURE_SCHEMA_V3.md              # superseded by V4
│   ├── 47_RONIN_ENTERPRISE_MATRIX.md          # org chart
│   └── evolution-log/                         # cycle reports
├── infra/cloudflare/
│   ├── main-router/                 # Worker (LIVE)
│   └── sirinx-edge-worker.js        # Edge worker
├── _A2A_QUEUE/
│   ├── inbox/                       # 0 (all dispatched)
│   ├── assigned/{claude,codex,opencode}/  # 31 tasks
│   ├── done/                        # 0 (pending collection)
│   ├── blocked/                     # 0
│   └── archive/                     # 140 historical
├── storage/
│   ├── cmux_snapshots/freeze.json   # checkpoint
│   ├── dream-sandbox/               # Dream Mode test area
│   ├── mutations/                   # error mutations
│   ├── agent-tasks/                 # worktree manifests
│   └── agent-results/               # dispatch reports
└── skills/autonomous/
    └── sirinx-unified-master-v2/SKILL.md  # MASTER (MIT)
```
