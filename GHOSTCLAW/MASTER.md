# GHOSTCLAW Hermes Commander A2A2A OS v2.0
## Master Architecture

**Status:** ACTIVE - Phase 1 LANE_0 complete locally, LANE_1 ready
**Repository:** `/Users/sirinx/sirinx-os`
**Runtime:** `.thclaws/` (GHOSTCLAW core) + Hermes Agent (Mission Commander)
**Last Updated:** 2026-06-29

---

## 0. Prime Directive

GHOSTCLAW Hermes Commander A2A2A OS v2.0 คือระบบปฏิบัติการ Agentic แบบ Full-Stack ที่ใช้ **Authority Stack** แทน flat agent team โดยมีHermes เป็น Supreme Mission Commander สั่งการ Opus → Codex → Workers → KOB → Command Broker → Mission Control แบบมีลำดับชั้นชัดเจน

**Core Principle:** ไม่ใช่แค่ agent คุยกัน แต่ต้องคุมถึง action จริง — A2A2A = Agent → Agent → Action

---

## 1. Authority Stack (New Hierarchy)

```
                 ┌──────────────────────────────┐
                 │      Obsidian Brain          │
                 │  (Central Knowledge / Vault) │
                 └──────────────┬───────────────┘
                                │ reads/writes
                 ┌──────────────▼───────────────┐
                 │  Hermes Mission Commander    │
                 │  (Supreme Commander)         │
                 │  Model: hermes-prime-lite    │
                 │  Authority: A5              │
                 └──────────────┬───────────────┘
                                │ delegates
                 ┌──────────────▼───────────────┐
                 │  Opus Chief Architect        │
                 │  (System Designer)           │
                 │  Model: deepseek-r1-lite     │
                 │  Authority: A3 (plan only)   │
                 └──────────────┬───────────────┘
                                │ design → handoff
                 ┌──────────────▼───────────────┐
                 │  Codex Build Captain         │
                 │  (Repo Integrator / Git Exec)│
                 │  Model: hermes-prime-lite    │
                 │  Authority: A4 (repo scope)  │
                 └──────┬───────────┬───────────┘
                        │           │ dispatches
         ┌──────────────▼──┐  ┌─────▼──────────────┐
         │  GLM-5.2        │  │  DeepSeek Workers  │
         │  Worker Agents  │  │  (Module Writers)  │
         │  Authority: A3  │  │  Authority: A3     │
         └──────┬──────────┘  └─────┬──────────────┘
                │                   │
                └────────┬──────────┘
                         │ output → validate
              ┌──────────▼───────────┐
              │  KOB CLI Validator   │
              │  (Test / Lint / Run) │
              │  Authority: A2       │
              └──────────┬───────────┘
                         │ report
              ┌──────────▼───────────┐
              │  Command Broker      │
              │  (Execution Gate)    │
              │  Authority: A5 gate  │
              └──────────┬───────────┘
                         │
              ┌──────────▼───────────┐
              │  Mission Control     │
              │  (Audit / Vault /    │
              │   Status Dashboard)  │
              └──────────────────────┘
```

### 1.1 Autonomy Classification (per AGENTS.md §6)

| Role | Max Autonomy | Scope |
|---|---|---|
| Hermes Commander | A5 | Mission routing, lane assignment, stop/go |
| Opus Architect | A3 | Design docs only, no repo writes |
| Codex Build Captain | A4 | Repo scaffold, integrate, stage, test |
| GLM-5.2 Workers | A3 | Module writes within assigned lane |
| DeepSeek Workers | A3 | Reasoning, bug fix, refactor within lane |
| KOB Validator | A2 | Deterministic test/lint/typecheck |
| Command Broker | A5 gate | Executes only approved commands |

---

## 2. GHOSTCLAW Core (Ship Protocol)

GHOSTCLAW (`thclaws`) เป็น runtime engine ที่ใช้ **Fleet-Ship-Crew** model:

### 2.1 Fleet Structure

```
FLEET: SIRINX OS
├── FLAGSHIP: Hermes Commander
│   ├── Crew: Opus (Chief Architect)
│   ├── Crew: Brain Curator
│   └── Crew: Skill Curator
│
├── SHIP: Build Operations
│   ├── Captain: Codex (Build Captain)
│   ├── Crew: GLM-5.2 Worker
│   ├── Crew: DeepSeek Worker
│   └── Crew: KOB Validator
│
├── SHIP: Integration & Bridge
│   ├── Captain: Integration Bridge Agent
│   ├── Crew: Mac Operator
│   └── Crew: Research Scout
│
├── SHIP: QA & Security
│   ├── Captain: QA Agent
│   ├── Crew: Adaptive Control (DeepSeek)
│   └── Crew: Security Scan Agent
│
└── SHIP: Frontend & Backend
    ├── Captain: Lead Agent
    ├── Crew: Backend Agent
    └── Crew: Frontend Agent
```

### 2.2 5 Co-Workers (Ship Protocol)

แต่ละ Ship มี Co-Worker ประจำ 5 ตำแหน่ง:

| Co-Worker | Role | Responsibility |
|---|---|---|
| **Navigator** | Opus | วางเส้นทาง architecture |
| **Engineer** | Codex | ประกอบ/สร้าง repo |
| **Operator** | KOB | ตรวจสอบ/รันคำสั่ง |
| **Sentinel** | QA + Adaptive Control | เฝ้าระวัง safety |
| **Scribe** | Brain Curator | บันทึกทุกอย่างลง Brain |

### 2.3 Ship Protocol Rules

1. **No ship crosses another ship's lane** — file ownership exclusive per ship
2. **Captain approves before crew acts** — Codex reviews before GLM/DeepSeek writes
3. **Navigator before Engineer** — Opus design must exist before Codex builds
4. **Operator after Engineer** — KOB validates after Codex integrates
5. **Sentinel watches all** — QA reviews every lane before merge
6. **Scribe records all** — Brain gets updated after every action

---

## 3. A2A2A Protocol

### 3.1 Definition

```
A2A2A = Agent → Agent → Action
```

ไม่ใช่แค่ agent ส่งข้อความหากัน แต่ต้องมี Action จริงที่ตรวจสอบได้:

| Phase | Name | Description |
|---|---|---|
| **A₁** | Agent Request | Hermes ออก Mission Order |
| **A₂** | Agent Process | Opus/Codex/Workers วิเคราะห์/สร้าง |
| **A₃** | Action | KOB/Command Broker ทำ validation/execute |

### 3.2 Message Format

```json
{
  "a2a2a_version": "2.0",
  "mission_id": "M-2026-0627-001",
  "correlation_id": "sirinx-a2a2a-abc123",
  "from": {
    "agent": "hermes-commander",
    "role": "mission-commander"
  },
  "to": {
    "agent": "opus-architect",
    "role": "chief-architect"
  },
  "action_requested": "design_architecture",
  "context": {
    "goal": "...",
    "constraints": ["dry-run-only", "no-deploy"],
    "lane": "GHOSTCLAW/core"
  },
  "response_expected": {
    "format": "architecture.md",
    "within_lane": "GHOSTCLAW/docs/"
  },
  "human_approval_required": false,
  "timestamp": "2026-06-27T00:00:00Z",
  "ttl_seconds": 600
}
```

### 3.3 Flow States

```
PENDING → ROUTED → PROCESSING → ACTION_PENDING → ACTION_EXECUTING → COMPLETED
                                               ↘ BLOCKED (needs approval)
                                               ↘ FAILED (needs rollback)
```

---

## 4. Command Broker Policy

### 4.1 Allowed Commands (Default)

```yaml
read_only:
  - file_read
  - git_status
  - git_diff
  - test_run
  - lint_check
  - type_check
  - kms_read
  - brain_query

scoped_write:
  - file_write (within assigned lane)
  - git_add (within assigned lane)
  - git_commit (with approval)
  - kms_write
  - brain_update
```

### 4.2 Approval-Required Commands

```yaml
requires_approval:
  - git_push
  - git_merge
  - npm_publish
  - deploy
  - cloud_mutation
  - external_api_write
  - customer_message_send
  - paid_api_call
  - env_read
```

### 4.3 Loop Guard Rules

```
MAX_CONSECUTIVE_RETRIES = 2
MAX_TASK_RUNTIME_MINUTES = 60
MAX_SPEND_PER_TASK_USD = 5
STOP_ON_REPEATED_FAILURE = true
CIRCUIT_BREAKER_AFTER_N_FAILURES = 3
```

---

## 5. Obsidian Brain Integration

### 5.1 Knowledge Flow

```
Agent Action → KMS Write → Obsidian Sync → Brain Index
                                    ↓
                            Hermes reads before routing
```

### 5.2 Vault Structure

```
GHOSTCLAW/
├── MASTER.md              ← this file
├── AGENTS.md              ← agent cards
├── A2A2A_PROTOCOL.md      ← protocol spec
├── FLEET_ORCHESTRATOR.md  ← fleet/ship spec
├── COMMAND_BROKER.md      ← broker policy
├── agents/                ← agent definition files
│   ├── hermes-commander.md
│   ├── opus-architect.md
│   ├── codex-captain.md
│   ├── glm-worker.md
│   ├── deepseek-worker.md
│   └── kob-validator.md
├── protocols/             ← protocol definitions
│   └── a2a2a-message-schema.json
├── policies/              ← policy documents
│   ├── loop-guard.yaml
│   ├── cost-guard.yaml
│   └── approval-matrix.yaml
└── vault/                 ← mission records
    ├── missions/
    ├── decisions/
    └── audit/
```

---

## 6. Mission Lifecycle

### 6.1 Standard Flow

```
1. OPERATOR INPUT (Human / Cron / Webhook)
       ↓
2. HERMES reads Brain → analyzes goal → checks constraints
       ↓
3. HERMES creates Mission Card → breaks into Lanes
       ↓
4. HERMES routes Lane-1 to Opus (if architecture needed)
       ↓
5. OPUS produces architecture.md → returns to Hermes
       ↓
6. HERMES routes architecture + Lane to Codex
       ↓
7. CODEX inspects architecture → creates scaffold → dispatches to Workers
       ↓
8. GLM/DEEPSEEK Workers write modules → return patches to Codex
       ↓
9. CODEX integrates patches → runs tests → reports to Hermes
       ↓
10. HERMES routes to KOB for validation
       ↓
11. KOB runs test/lint/typecheck → validation report
       ↓
12. COMMAND BROKER gates the final action
       ↓
13. MISSION CONTROL records result → updates Brain
       ↓
14. HERMES reports MISSION COMPLETE to Operator
```

### 6.2 Mission Card Template

```yaml
mission_id: M-2026-0627-001
goal: ""
constraints:
  - dry-run-only
  - no-deploy
  - no-push
lanes:
  - id: L1
    assignee: opus-architect
    task: design_architecture
    output: architecture.md
  - id: L2
    assignee: codex-captain
    task: build_scaffold
    depends_on: L1
  - id: L3
    assignee: kob-validator
    task: validate
    depends_on: L2
status: PENDING
human_approval_required: false
created_at: ""
created_by: "hermes-commander"
```

---

## 7. Safety Rules (Inherited from AGENTS.md)

| Rule | Applies To |
|---|---|
| No deploy without approval | All agents |
| No git push without approval | All agents |
| No cloud mutation without approval | All agents |
| No .env reads | All agents |
| No paid API without PAID_API_ENABLED=true | All agents |
| No customer messages without approval | All agents |
| No secrets in context | All agents |
| Dry-run first | MCP, external, cloud |

---

## 8. Verification Commands

```bash
# Validate architecture
cat GHOSTCLAW/MASTER.md

# Check agent roster
ls -la GHOSTCLAW/agents/

# Verify A2A2A schema
cat GHOSTCLAW/protocols/a2a2a-message-schema.json | python3 -m json.tool

# Check KMS consistency
cat .thclaws/kms/sirinx-brain/index.md

# Run full GHOSTCLAW validation
pnpm ghostclaw:validate
```

---

## 9. Current Phase Gates

| Gate | Status | Next |
|---|---|---|
| Master Architecture | DONE_LOCAL | Agent Cards |
| Agent Cards | DONE_LOCAL | Architecture packet |
| A2A2A Protocol | DONE_LOCAL | Architecture packet |
| Fleet Orchestrator | DONE_LOCAL | Architecture packet |
| Command Broker | DONE_LOCAL | Architecture packet |
| Brain Update | DONE_LOCAL_PREFLIGHT | Formal LANE_6 after LANE_5 |
| Live Integration Test | BLOCKED | Requires later build lane and approval |
