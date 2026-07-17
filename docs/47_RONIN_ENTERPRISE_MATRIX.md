# SIRINX OS — 47 Ronin Enterprise Corporate Matrix (Dream Mode Architecture)

## 4 Divisions — Isolated Asynchronous Lanes

```
[HERMES COMMAND CENTER — Master Orchestrator]
        │
        ├─► [Alignment & Security Division]        (Ronin 01-10)
        │     Network policy, governance, safety gates
        │
        ├─► [Architecture & Compiler Division]     (Ronin 11-20)
        │     Code compilation, path updates, architecture
        │
        ├─► [Runtime & Site Reliability Division]  (Ronin 21-30)
        │     CMUX control, disk management, SRE
        │
        └─► [Dream Mutation & Evolution Division]  (Ronin 31-47)
              Sandbox simulation, mutation engine
```

## Division 1: Alignment & Security (Ronin 01-10)

| # | Role | Title | Specialty |
|---|------|-------|-----------|
| 01 | shogun | CEO / Mission Commander | Strategic command, Tier C approval |
| 02 | planner | COO | Goal decomposition, DAG |
| 03 | security-lead | CISO | Security strategy, threat model |
| 04 | pentester | Security Engineer | Vulnerability scanning |
| 05 | compliance | Compliance Manager | SOC2, GDPR, PDPA |
| 06 | audit-agent | Internal Auditor | Audit trail, evidence |
| 07 | safety-gate | Safety Gate Keeper | Forbidden pattern block, tier classification |
| 08 | secret-scanner | Secret Detection | .env reads, API keys in output |
| 09 | cost-guard | Cost Controller | Budget tracking, spend alerts |
| 10 | sentinel | System Sentinel | Monitoring, kill switch |

## Division 2: Architecture & Compiler (Ronin 11-20)

| # | Role | Title | Specialty |
|---|------|-------|-----------|
| 11 | backend | CTO | Tech stack decisions |
| 12 | claude-architect | Principal Architect | System design (read-only) |
| 13 | codex-captain | VP Engineering | Repo execution, TypeScript, Rust |
| 14 | backend-eng-1 | Senior Backend Engineer | API, database |
| 15 | backend-eng-2 | Backend Engineer | Microservices, queues |
| 16 | frontend | CPO | Product vision |
| 17 | frontend-eng-1 | Senior Frontend Engineer | React, Next.js |
| 18 | frontend-eng-2 | Frontend Engineer | CSS, animations |
| 19 | compiler-eng | Compiler Engineer | Build optimization, path resolution |
| 20 | integration-lead | Integration Director | OmniRoute, MCP, A2A wiring |

## Division 3: Runtime & SRE (Ronin 21-30)

| # | Role | Title | Specialty |
|---|------|-------|-----------|
| 21 | devops-engineer | SRE / Platform | Docker, Cloudflare, deploy |
| 22 | sre-oncall | SRE On-Call | Incident response, uptime |
| 23 | cmux-operator | CMUX Controller | Pane management, checkpoint |
| 24 | disk-manager | Disk Space Manager | Cache purge, log rotation |
| 25 | log-rotator | Log Rotation Daemon | Log truncation, archival |
| 26 | process-supervisor | Process Supervisor | Service restart, PID tracking |
| 27 | network-bridge | Network Bridge | Port wiring, endpoint health |
| 28 | webhook-manager | Webhook Specialist | Event routing, n8n |
| 29 | line-operator | LINE Bot Manager | Messaging, handoff |
| 30 | health-checker | Health Check Daemon | Service probe, alert |

## Division 4: Dream Mutation & Evolution (Ronin 31-47)

| # | Role | Title | Specialty |
|---|------|-------|-----------|
| 31 | evolution-engine | Dream Mode Agent | Self-improvement loop |
| 32 | mutation-engine | Mutation Engine | Error → skill → evolve |
| 33 | auto-healer | Self-Healing Daemon | Auto-repair, restart |
| 34 | dream-sandbox | Sandbox Simulator | Speculative test run |
| 35 | skill-creator | Skill Generator | Pattern → skill creation |
| 36 | skill-curator | Skill Curator | Skill pruning, merge |
| 37 | ml-researcher | ML Research Lead | Model evaluation |
| 38 | prompt-engineer | Prompt Engineer | Prompt optimization |
| 39 | ai-evaluator | AI Safety Researcher | Red-teaming |
| 40 | code-reviewer | Code Reviewer | Auto-review mutations |
| 41 | test-generator | Test Generator | Create tests for new code |
| 42 | pattern-detector | Pattern Detector | Error pattern matching |
| 43 | brain-sync | Obsidian Brain Sync | Knowledge persistence |
| 44 | memory-keeper | Memory Manager | Cross-session memory |
| 45 | content-writer | Technical Writer | Documentation |
| 46 | creative-producer | Creative Engineer | Motion, video |
| 47 | local-ai | Local AI Specialist | Ollama, LM Studio |

## Execution Modes

| Mode | Flow | Safety |
|------|------|--------|
| **Normal** | Goal → Plan → Ask → Execute → Report | Full gates |
| **YOLO** | Goal → Execute → Report | Gates scan, skip approval |
| **Dream Mode** | Goal → Sandbox copy → Test → Approve → Deploy | Simulation barrier |
| **GODMODE** | Goal → Dream → Mutate → Evolve → Report | Evolution Engine guards |

## Dream Mode Flow (Speculative Run)

```
Agent gets task
    │
    ▼
┌─────────────────────────────────────┐
│ Step 1: COPY code to sandbox        │
│ storage/dream-sandbox/dream_<ts>/   │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│ Step 2: Apply changes in sandbox    │
│ (git stash → modify → test)        │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│ Step 3: Run pnpm hq:test in sandbox │
└──────────────┬──────────────────────┘
               ▼
        ┌──────┴──────┐
        │ PASS?       │
        ├─YES─────────┤
        │             │
        ▼             ▼
  AUTO-APPROVE    REJECT
  Deploy via     Rollback
  Git Loop       git stash pop
        │             │
        ▼             ▼
  Commit         Report
  to Telegram    error
```

## CMUX Never-Dying Loop

```
[Normal: Agent works in lane] ──► [Save checkpoint JSON always]
                                          │
    ┌─────────── CRASH / POWER / DISCONNECT ──────────┘
    ▼
[CMUX restarts] ──► [Scan latest JSON] ──► [Auto-resume execution]
```

| State Parameter | Memory File | Recovery Purpose |
|-----------------|-------------|------------------|
| CMUX Master Snapshot | storage/cmux_snapshots/freeze.json | PID + pane layout for restart |
| A2A Queue Tracker | _A2A_QUEUE/packet-bus.ts | Packet state, prevent duplication |
| Obsidian Brain Sync | Obsidian Vault/PROJECT_STATE.md | Last execution results |
