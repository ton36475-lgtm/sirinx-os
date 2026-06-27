# Fleet Orchestrator Specification

**Part of:** GHOSTCLAW Hermes Commander A2A2A OS v2.0
**Runtime:** `.thclaws/` (GHOSTCLAW engine)
**Status:** ACTIVE

---

## 1. Fleet Model

GHOSTCLAW uses a **Fleet → Ship → Crew** hierarchy:

```
FLEET: SIRINX OS
│
├── 🚢 FLAGSHIP: Hermes Commander (Mission Control)
│   ├── 🧭 Navigator: Opus (Chief Architect)
│   ├── 📜 Scribe: Brain Curator
│   └── 🛠️ Artificer: Skill Curator
│
├── 🚢 SHIP: Build Operations
│   ├── ⚓ Captain: Codex (Build Captain)
│   ├── 👷 Engineer-G: GLM-5.2 Worker
│   ├── 👷 Engineer-D: DeepSeek Worker
│   └── 🔍 Inspector: KOB Validator
│
├── 🚢 SHIP: Integration & Bridge
│   ├── ⚓ Captain: Integration Bridge
│   ├── 💻 Operator: Mac Operator
│   └── 🔭 Scout: Research Agent
│
├── 🚢 SHIP: QA & Security
│   ├── ⚓ Captain: QA Agent
│   ├── 🧠 Analyst: Adaptive Control (DeepSeek)
│   └── 🛡️ Sentinel: Security Scan
│
└── 🚢 SHIP: Frontend & Backend
    ├── ⚓ Captain: Lead Agent
    ├── 🖥️ Builder-FE: Frontend Agent
    └── ⚙️ Builder-BE: Backend Agent
```

---

## 2. Ship Protocol

### 2.1 The 6 Rules

| # | Rule | Enforcement |
|---|---|---|
| 1 | **No ship crosses another ship's lane** | File ownership lock per ship |
| 2 | **Captain approves before crew acts** | Codex gate before worker writes |
| 3 | **Navigator before Engineer** | Opus design must exist before Codex builds |
| 4 | **Operator after Engineer** | KOB validates after Codex integrates |
| 5 | **Sentinel watches all** | QA reviews every lane before merge |
| 6 | **Scribe records all** | Brain gets updated after every action |

### 2.2 Lane Assignment

Each ship owns specific directories:

```yaml
flagship:
  lanes:
    - GHOSTCLAW/**
    - .thclaws/kms/**
    - brain/**
  exclusive: true

build_ops:
  lanes:
    - services/**
    - packages/**
    - apps/**
  exclusive: true

integration:
  lanes:
    - .thclaws/mcp.json
    - config/**
    - tools/**
  exclusive: false

qa_security:
  lanes:
    - tests/**
    - security/**
    - playwright-report/**
  exclusive: false

frontend_backend:
  lanes:
    - apps/dev-dashboard/**
    - apps/web-sirinx/**
    - services/dev-control-api/**
  exclusive: true
```

---

## 3. 5 Co-Workers System

ทุก Ship ต้องมี Co-Worker 5 ตำแหน่ง:

### 3.1 Navigator (🧭)
- **Role:** Opus (Flagship) / Lead Agent (per ship)
- **Duty:** วางแผนเส้นทางก่อนลงมือ
- **Output:** `navigation-plan.md`
- **Rule:** ต้องมีแผนก่อน Engineer เริ่ม

### 3.2 Engineer (👷)
- **Role:** Codex + GLM/DeepSeek
- **Duty:** สร้าง/ประกอบ/เขียนโค้ด
- **Input:** Navigation plan
- **Output:** Source files, patches
- **Rule:** ทำงานใน lane ตัวเองเท่านั้น

### 3.3 Operator (💻)
- **Role:** KOB Validator
- **Duty:** รัน test/lint/typecheck
- **Input:** Engineer output
- **Output:** Validation report
- **Rule:** ต้อง validate ก่อน Captain รับรอง

### 3.4 Sentinel (🛡️)
- **Role:** QA + Adaptive Control
- **Duty:** เฝ้าระวัง safety, review code
- **Input:** Engineer + Operator output
- **Output:** Safety report, code review
- **Rule:** Sentinel มีสิทธิ์ STOP ถ้าพบปัญหา

### 3.5 Scribe (📜)
- **Role:** Brain Curator
- **Duty:** บันทึกทุกการตัดสินใจ
- **Input:** All outputs
- **Output:** KMS updates, Brain entries, audit log
- **Rule:** ต้องบันทึกก่อน mission ถือว่าสมบูรณ์

---

## 4. Fleet Orchestration Flow

```
1. OPERATOR → Hermes: "Build feature X"
2. Hermes → Opus (Navigator): "Design architecture for X"
3. Opus → Hermes: architecture.md
4. Hermes → Codex (Captain, Build Ops): "Build X per architecture"
5. Codex → GLM (Engineer-G): "Write module A"
6. Codex → DeepSeek (Engineer-D): "Write module B"
7. GLM → Codex: module-a.ts
8. DeepSeek → Codex: module-b.ts
9. Codex integrates → runs local tests
10. Codex → KOB (Operator): "Validate build"
11. KOB → Codex: validation-report.json
12. Codex → QA (Sentinel): "Review integration"
13. QA → Codex: safety-report.md
14. Codex → Hermes: "Build complete, validated, reviewed"
15. Hermes → Brain Curator (Scribe): "Record mission"
16. Brain Curator → Brain: mission record + decisions
17. Hermes → Operator: "MISSION COMPLETE — Feature X ready"
```

---

## 5. Collision Prevention

### 5.1 File Ownership Lock

```yaml
lock_mechanism: lane-based
lock_granularity: file
max_concurrent_writers_per_file: 1
deadlock_timeout_seconds: 300
```

### 5.2 Ship-to-Ship Communication

Ships communicate ONLY through Hermes. Example:

```
❌ Build Ops Engineer → Frontend Engineer (direct)
✅ Build Ops Captain → Hermes → Frontend Captain → Frontend Engineer
```

### 5.3 Merge Order

When multiple ships modify the same repo:
1. Build Ops finishes first
2. QA validates
3. Frontend/Backend applies on top
4. Integration bridge syncs connectors
5. Fleet-wide validation

---

## 6. Database Schema (Fleet State)

```sql
CREATE TABLE fleet_ships (
  ship_id VARCHAR(64) PRIMARY KEY,
  ship_name VARCHAR(128) NOT NULL,
  captain_agent VARCHAR(64) NOT NULL,
  status VARCHAR(32) DEFAULT 'DOCKED',
  current_mission_id VARCHAR(64),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ship_crew (
  crew_id VARCHAR(64) PRIMARY KEY,
  ship_id VARCHAR(64) REFERENCES fleet_ships(ship_id),
  agent_name VARCHAR(64) NOT NULL,
  co_worker_role VARCHAR(32) NOT NULL,  -- Navigator, Engineer, Operator, Sentinel, Scribe
  status VARCHAR(32) DEFAULT 'STANDBY'
);

CREATE TABLE fleet_missions (
  mission_id VARCHAR(64) PRIMARY KEY,
  ship_id VARCHAR(64) REFERENCES fleet_ships(ship_id),
  goal TEXT NOT NULL,
  status VARCHAR(32) DEFAULT 'PENDING',
  created_by VARCHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE TABLE lane_assignments (
  lane_id VARCHAR(64) PRIMARY KEY,
  mission_id VARCHAR(64) REFERENCES fleet_missions(mission_id),
  ship_id VARCHAR(64) REFERENCES fleet_ships(ship_id),
  file_pattern VARCHAR(256) NOT NULL,
  assigned_agent VARCHAR(64) NOT NULL,
  status VARCHAR(32) DEFAULT 'ASSIGNED'
);
```
