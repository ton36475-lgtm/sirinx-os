# SIRINX OS — Multi-Node Production Architecture Schema v3.0

## System Topology

```
                        ┌─────────────────────────────────────┐
                        │         CLOUDFLARE EDGE             │
                        │   (Workers + D1 + Pages + Tunnel)   │
                        │                                     │
                        │  sirinx.co ──────────────────┐      │
                        │  dev.sirinx.co ──────────────┤      │
                        │  api.sirinx.co ──────────────┤      │
                        │  opal.sirinx.co ─────────────┤      │
                        │  omniroute.sirinx.co ────────┤      │
                        └──────────────────────────────┼──────┘
                                                       │
                    ┌──────────────────────────────────┼──────────────────┐
                    │                                  │                  │
                    ▼                                  ▼                  ▼
         ┌──────────────────┐          ┌──────────────────┐    ┌──────────────────┐
         │  MAC MINI M2 NODE│          │  VPS CLOUD NODE  │    │  PC NODE (Poipet)│
         │  (Dev + Control) │          │  (Production DB) │    │  (Heavy Worker)  │
         │                  │          │                  │    │                  │
         │  Hermes :8644    │          │  MySQL           │    │  OmniRoute GPU   │
         │  Dev Ctrl :8711  │          │  Redis           │    │  FFmpeg          │
         │  Skills :3800    │          │  n8n             │    │  CMUX 47 Ronin   │
         │  A2A Bridge      │          │  Monitoring      │    │  Local AI (GPU)  │
         │                  │          │                  │    │                  │
         └────────┬─────────┘          └────────┬─────────┘    └────────┬─────────┘
                  │                             │                       │
                  └─────────────────────────────┼───────────────────────┘
                                                │
                                    ┌───────────┴───────────┐
                                    │   OMNIROUTE GATEWAY   │
                                    │   (AI Load Balancer)  │
                                    │                       │
                                    │  250 Providers        │
                                    │  94 MCP Tools         │
                                    │  A2A Protocol         │
                                    │  Canonical Routing    │
                                    └───────────────────────┘
```

## Node Definitions

### Node 1: Mac Mini M2 (Dev + Control Center)
```yaml
identity: mac-mini-m2-control
role: development + command center
specs:
  cpu: Apple M2
  ram: 8GB
  disk: 228GB (16GB free target)
running:
  - hermes-gateway (:8644)
  - dev-control-api (:8711)
  - skills-api (:3800)
  - a2a-bridge (cron 5m)
  - self-evolution-core (cron 30m)
  - 9 cron jobs
deploy_target: cloudflare (via wrangler)
```

### Node 2: VPS Cloud Server (Production DB + n8n)
```yaml
identity: vps-production
role: production database + automation
specs:
  provider: TBD (pending provisioning)
running:
  - mysql (production data)
  - redis (cache + queue)
  - n8n (workflow automation)
  - grafana (monitoring)
deploy_target: direct (rsync dist/)
```

### Node 3: PC Node Poipet (Heavy Worker + GPU)
```yaml
identity: poipet-pc-heavy-worker
role: heavy compute + GPU inference
specs:
  gpu: TBD
running:
  - omniroute-gateway (:20128)
  - local-ai (Ollama / llama.cpp)
  - ffmpeg (video processing)
  - cmux (47 Ronin agent panes)
deploy_target: cloudflare-tunnel
```

## Data Flow

```
1. Operator → Telegram → Hermes → OmniRoute → Agent dispatch
2. Agent (codex/claude/opencode) → local code → test → Dream Mode verify
3. Dream Mode PASS → git commit → GitHub remote (ton36475-lgtm)
4. GitHub → Cloudflare Pages (auto-deploy)
5. Cloudflare Worker → sirinx.co live
6. Self-Evolution Engine → 30m check → auto-repair → checkpoint
```

## Lane Isolation (No Overlap)

```
┌─ LANE: GITHUB ──────────────────────────────────────┐
│ Owner: devops-engineer (#21)                        │
│ Files: .git/, .github/, git configs                 │
│ Actions: commit, push, PR, review                   │
│ Tier: C (always human approve via Telegram)         │
└─────────────────────────────────────────────────────┘

┌─ LANE: CLOUDFLARE ──────────────────────────────────┐
│ Owner: devops-engineer (#21)                        │
│ Files: infra/cloudflare/**                          │
│ Actions: wrangler deploy, pages publish             │
│ Tier: C (always human approve via Telegram)         │
└─────────────────────────────────────────────────────┘

┌─ LANE: OMNIROUTE ───────────────────────────────────┐
│ Owner: integration-lead (#20)                       │
│ Files: integrations/omniroute/**, config/omniroute* │
│ Actions: build, start, wire agents                  │
│ Tier: B (auto in GODMODE)                           │
└─────────────────────────────────────────────────────┘

┌─ LANE: CORE ENGINE ─────────────────────────────────┐
│ Owner: evolution-engine (#31)                       │
│ Files: scripts/self-evolution*, scripts/task-dag*   │
│ Actions: health check, purge, test, mutate          │
│ Tier: A (always auto)                               │
└─────────────────────────────────────────────────────┘

┌─ LANE: TELEGRAM ────────────────────────────────────┐
│ Owner: shogun (#01)                                 │
│ Files: config/telegram*, skills/telegram*           │
│ Actions: send message, inline button, poll          │
│ Tier: B (auto in GODMODE)                           │
└─────────────────────────────────────────────────────┘

┌─ LANE: A2A BRIDGE ──────────────────────────────────┐
│ Owner: integration-lead (#20)                       │
│ Files: _A2A_QUEUE/**                                │
│ Actions: dispatch, convert, safety scan             │
│ Tier: A (always auto)                               │
└─────────────────────────────────────────────────────┘

┌─ LANE: DOCS + BRAIN ────────────────────────────────┐
│ Owner: content-writer (#45)                         │
│ Files: docs/**, PROJECT_STATE.md, SKILLS_REGISTRY   │
│ Actions: update, sync obsidian                      │
│ Tier: A (always auto)                               │
└─────────────────────────────────────────────────────┘
```

## OmniRoute Production Wiring

```yaml
# All agent LLM calls route through OmniRoute :20128
# OmniRoute handles: provider selection, load balancing, cost guard, fallback

agent_dispatch_flow:
  1. Hermes receives /goal via Telegram
  2. Goal decomposer classifies intent → agent
  3. A2A bridge creates canonical packet → inbox
  4. Bridge dispatches to CLI (codex/claude/opencode)
  5. CLI uses OmniRoute for LLM calls:
     POST http://127.0.0.1:20128/api/chat
     {
       "model": "auto",  # OmniRoute picks best provider
       "messages": [...],
       "cost_guard": { "max_per_request": 0.10 }
     }
  6. CLI returns result → bridge → done/blocked
  7. Result reported to Telegram
```

## GitHub Remote (ton36475-lgtm)

```yaml
remote: github.com/ton36475-lgtm/sirinx-co
branch: migration/v5-rebase
auto_commit: true (GODMODE Tier A/B)
auto_push: false (Tier C — Telegram approve)
auto_review: true (OpenCode reviewer runs on commit)
auto_deploy: false (Tier C — Telegram approve)

commit_flow:
  1. Agent makes change in lane
  2. Self-evolution engine runs pnpm hq:test
  3. If PASS → auto-commit with structured message
  4. OpenCode reviewer scans diff
  5. If review OK → Telegram inline button: [Push] [Deploy]
  6. Operator taps [Push] → git push origin
  7. Operator taps [Deploy] → wrangler deploy + pages publish
```

## Telegram Command Center

```
/goal <text>              → decompose → dispatch → report
/status                   → system overview
/approve <id>             → approve Tier C
/deny <id>                → deny + rollback
/push                     → git push (with inline confirm)
/deploy                   → cloudflare deploy (with inline confirm)
/agents                   → 47 Ronin status
/evolve                   → trigger evolution cycle manually
/dream <text>             → run Dream Mode simulation
/kill <task_id>           → force stop
/panic                    → halt everything
```

### Inline Buttons
```
┌─────────────────────────────────────────┐
│ 🔔 COMMIT READY: e5e08c3               │
│ 4 files changed, +8427 lines           │
│                                        │
│ [✅ Push to GitHub] [❌ Discard]       │
│ [📋 Review Diff] [🏗️ Deploy CF]        │
└─────────────────────────────────────────┘
```

## Cloudflare Deploy Pipeline

```
1. wrangler deploy (main-router worker)
   → sirinx.co, www.sirinx.co
   → D1 database: sirinx-unified-db

2. wrangler pages publish (static sites)
   → sirinx.co landing
   → dev.sirinx.co dashboard

3. Cloudflare Tunnel (PC Node Poipet)
   → omniroute.sirinx.co → localhost:20128
   → local-ai.sirinx.co → localhost:11434
```

## Scaling Plan (Future Nodes)

```
Current: 1 node (Mac Mini M2)
Phase 2: + PC Node Poipet (GPU worker)
Phase 3: + VPS Cloud (production DB)
Phase 4: + Additional Cloudflare Workers
Phase 5: + Edge nodes (regional latency)
```
