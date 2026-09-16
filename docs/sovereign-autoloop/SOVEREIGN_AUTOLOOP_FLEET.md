# SOVEREIGN AUTOLOOP FLEET — Full Spec Driving Goal-Based End-to-End Integration

**Version:** 1.0  
**Status:** Active Specification  
**Scope:** SIRINX OS — All projects except AGM  
**Baseline:** Mac mini live test passed; Live Agent Studio MVP works locally  
**Integration Target:** Full end-to-end Hermes Autoloop Fleet with Free Model Pack, Chrome Remote Desktop, GhostClaw integration, Media Factory, and Code Reviewer/QA

---

## 🎯 EXECUTIVE SUMMARY

This specification defines the **Sovereign Hermes Autoloop Fleet** — a production-grade, goal-based autonomous agent fleet that operates across the entire SIRINX OS stack using:

- **Free Model Pack** (OpenRouter free tier + Local Ollama/llama.cpp)
- **Chrome Remote Desktop** integration for browser automation
- **GhostClaw Fleet Orchestrator** (Fleet → Ship → Crew hierarchy)
- **Sovereign Security Perimeter** (strict isolation gates)
- **Zero-Tunnel Edge Transport** (Cloudflare Workers + WAF)
- **PostgreSQL State Persistence** with evidence chain
- **Real-time Cloudflare Streams** to frontend

The system implements the **Loop Engineering** discipline: every action is logged, bounded, reversible, and approved when risk exists.

---

## 🏗️ SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SOVEREIGN AUTOLOOP FLEET                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐  │
│
│  │   FRONTEND   │───▶│   EDGE       │───▶│  ORCHESTRATOR│───▶│ MULTI-AG │ 
│  │  (Next.js)   │    │  (CF Workers)│    │  (Go/Rocky)  │    │  FLEET   │ 
│  │ Goal/Spinner │    │ Realtime/API │    │ Deterministic│    │ (Hermes) │ 
│  └──────────────┘    └──────────────┘    └──────────────┘    └────┬─────┘ 
│                                                                    │       
│                            ┌──────────────┐                        │       
│                            │  VERIFICATION│◀───────────────────────┘       
│                            │    GATE      │    (QA Reviewer / Schema)     
│                            └──────┬───────┘                               
│                                   │                                       
│                            ┌──────▼───────┐                               
│                            │  POSTGRESQL  │                               
│                            │  STATE +     │                               
│                            │  EVIDENCE    │                               
│                            └──────┬───────┘                               
│                                   │                                       
│                            ┌──────▼───────┐                               
│                            │  CF REALTIME │                               
│                            │    STREAM    │                               
│                            └──────┬───────┘                               
│                                   ▼                                       
│                            ┌──────────────┐                               
│                            │  FRONTEND    │                               
│                            │  TOAST: ✅   │                               
│                            └──────────────┘                               
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 CORE COMPONENTS

### 1. FREE MODEL PACK CONFIGURATION

**OpenRouter Free Models (Primary):**
| Model | Role | Context | Temperature | Gate |
|-------|------|---------|-------------|------|
| `nvidia/nemotron-3-ultra-550b-a55b:free` | General/Reasoning | 1M | 0.3 | Budget |
| `qwen/qwen3-coder:free` | Coding/Tool Use | 8K | 0.2 | Budget |
| `moonshotai/kimi-k2.7-code` | Long Horizon/UI | 12K | 0.15 | Budget |
| `deepseek/deepseek-v3.2-exp` | Architecture/Debug | 12K | 0.1 | Budget |
| `poolside/laguna-m.1:free` | Agentic Coding | 8K | 0.2 | Budget |

**Local Models (Fallback/Offline):**
| Model | Provider | Role | Context |
|-------|----------|------|---------|
| `llama3.2:3b` | Ollama | Compression/Classification | 128K |
| `qwen3-coder` | Ollama | Local Coding | 8K |
| `gemma2` | Ollama | Classification | 8K |

**Model Router Rules:**
- **T0 (Trivial):** Local qwen_worker → Laguna free fallback
- **T1 (Simple):** Laguna free → Qwen3 coder free → Validator review
- **T2 (Complex):** Qwen3 coder free + Codex peer review → Hermes/Fable synthesis
- **T3 (Architecture):** DeepSeek architect + Codex peer + Optional GLM mapper → Fable5 orchestrator
- **T4 (Critical):** Human gate only

### 2. CHROME REMOTE DESKTOP INTEGRATION

**Architecture:**
```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Hermes Agent   │────▶│  Chrome DevTools │────▶│  Remote Desktop  │
│  (via MCP)      │     │  Protocol (CDP)  │     │  (Headless/Full) │
└─────────────────┘     └──────────────────┘     └──────────────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
            ┌───────────────┐      ┌───────────────┐
            │  QA/Debug     │      │  Automation   │
            │  Screenshots  │      │  Form Fill    │
            │  Console Logs │      │  Click/Type   │
            │  Network      │      │  Scroll/Wait  │
            └───────────────┘      └───────────────┘
```

**Integration Points:**
- **MCP Server:** `chrome-devtools-mcp` (stdio)
- **Profile Isolation:** `.sirinx/chrome/hermes` / `.sirinx/chrome/qa`
- **CDP Endpoint:** `http://127.0.0.1:9222` (configurable)
- **Capabilities:** Full browser automation, screenshot, console, network, performance metrics

**Configuration (config.yaml):**
```yaml
chrome_remote_desktop:
  enabled: true
  cdp_url: "http://127.0.0.1:9222"
  profiles:
    hermes: ".sirinx/chrome/hermes"
    qa: ".sirinx/chrome/qa"
  headless: true
  viewport: { width: 1920, height: 1080 }
  timeout_ms: 30000
  record_sessions: false
  allow_private_urls: false
```

### 3. GOAL-BASED AUTOLOOP PIPELINE

**State Machine (7 States):**
```
SPEC_INTAKE → CONTRACT_EXTRACT → STRATEGY_DESIGN → IMPLEMENT → VALIDATE → REVIEW → COMMIT_LOCAL
```

**Routing Matrix:**
| State | Agent | Action | Permission |
|-------|-------|--------|------------|
| SPEC_INTAKE | opencode | read_repo | Read-only |
| CONTRACT_EXTRACT | opencode | read_repo | Read-only |
| STRATEGY_DESIGN | codex | plan_only | Read-only |
| IMPLEMENT | codex | write_leased_paths | Lease required |
| VALIDATE | opencode | test_sandbox | Read-only |
| REVIEW | opencode | review_only | Read-only |
| COMMIT_LOCAL | codex | commit_local_after_human_decision | Human approval |

**Gate System:**
- **Policy Gates:** Middleware validates every action against lease, budget, human approval
- **Cost Guard:** Daily token/cost limits per project
- **Evidence Chain:** Cryptographic hash chain of all events (tamper-evident)
- **Lease System:** File-level locks with expiration, overlap prevention

### 4. GHOSTCLAW FLEET ORCHESTRATOR INTEGRATION

**Fleet → Ship → Crew Hierarchy:**
```
FLEET: SIRINX OS
│
├── 🚢 FLAGSHIP: Hermes Commander (Mission Control)
│   ├── 🧭 Navigator: Opus (Chief Architect) — A3
│   ├── 📜 Scribe: Brain Curator — A2
│   └── 🛠️ Artificer: Skill Curator — A2
│
├── 🚢 SHIP: Build Operations
│   ├── ⚓ Captain: Codex (Build Captain) — A4
│   ├── 👷 Engineer-G: GLM-5.2 Worker — A3
│   ├── 👷 Engineer-D: DeepSeek Worker — A3
│   └── 🔍 Inspector: KOB Validator — A2
│
├── 🚢 SHIP: Integration & Bridge
│   ├── ⚓ Captain: Integration Bridge — A4
│   ├── 💻 Operator: Mac Operator — A3
│   └── 🔭 Scout: Research Agent — A2
│
├── 🚢 SHIP: QA & Security
│   ├── ⚓ Captain: QA Agent — A4
│   ├── 🧠 Analyst: Adaptive Control (DeepSeek) — A3
│   └── 🛡️ Sentinel: Security Scan — A2
│
└── 🚢 SHIP: Frontend & Backend
    ├── ⚓ Captain: Lead Agent — A4
    ├── 🖥️ Builder-FE: Frontend Agent — A3
    └── ⚙️ Builder-BE: Backend Agent — A3
```

**5 Co-Worker Roles (Per Ship):**
1. **Navigator (🧭)** — Plans route, designs architecture
2. **Engineer (👷)** — Builds, integrates, writes code
3. **Operator (💻)** — Runs tests, validates, lints
4. **Sentinel (🛡️)** — Watches safety, reviews code
5. **Scribe (📜)** — Records decisions, updates Brain/KMS

**A2A2A Protocol:**
```
A₁ Agent Request  →  Hermes issues structured mission order
A₂ Agent Process  →  Opus/Codex/Workers analyze, design, write
A₃ Action         →  KOB validates, Command Broker gates, Mission Control records
```

### 5. VERIFICATION GATE (QA REVIEWER AGENT)

**Schema Guardian:**
```json
{
  "validator": {
    "type": "json_schema",
    "strict": true,
    "max_loops": 5,
    "schemas": {
      "agent_output": "schemas/agent_output.schema.json",
      "a2a_envelope": "schemas/a2a_envelope.schema.json",
      "mission_card": "schemas/mission_card.schema.json"
    }
  }
}
```

**Validation Flow:**
```
Agent Output → Schema Check → Pass → Continue
                    ↓ Fail
            Exception JSON → Loop Back (max 5)
                    ↓ Max Loops
            BLOCK → Human Escalation
```

**QA Reviewer Agent Card:**
```yaml
Role: QA Reviewer
Purpose: Validate all agent outputs against schemas, catch structural failures
Allowed Tools: read_file, search_files, execute_code (validation only)
Forbidden Tools: write_file, terminal, git, deploy
Approval Required: Schema violations, structural failures
Autonomy Level: A2 (Deterministic validation only)
```

### 6. SOVEREIGN SECURITY PERIMETER

**Isolation Gates:**
```yaml
security_gates:
  - name: "brand_isolation"
    rule: "Discard any reference to corporate branding, production DB, customer PII"
    action: "strip_and_log"
    
  - name: "credential_isolation"
    rule: "No .env, secrets, tokens, cookies, keychains in context"
    action: "block_and_alert"
    
  - name: "external_action_isolation"
    rule: "No paid API, customer send, cloud mutation without human approval"
    action: "require_gate_approval"
    
  - name: "lane_isolation"
    rule: "No cross-lane writes without Hermes routing"
    action: "block_and_route_through_hermes"
```

**Configuration:**
```yaml
sovereign_perimeter:
  enabled: true
  strict_mode: true
  blocked_patterns:
    - "production.*database"
    - "customer.*data"
    - "api.*key"
    - "secret"
    - "token"
    - "credential"
    - "brand.*name"
  allowed_experimental:
    - "mock_adapter"
    - "dry_run"
    - "local_test"
```

### 7. ZERO-TUNNEL EDGE TRANSPORT

**Cloudflare Workers Architecture:**
```typescript
// Edge Gateway - Cloudflare Worker
export default {
  async fetch(request, env, ctx): Promise<Response> {
    // 1. WAF Check
    if (await waf.check(request)) return new Response("Blocked", { status: 403 });
    
    // 2. Auth (Cloudflare Access)
    const auth = await access.verify(request);
    if (!auth.valid) return new Response("Unauthorized", { status: 401 });
    
    // 3. Priority Routing
    const priority = getPriority(request);
    const target = routeToOrchestrator(priority);
    
    // 4. WebSocket Upgrade for Realtime
    if (request.headers.get("Upgrade") === "websocket") {
      return handleWebSocket(request, target);
    }
    
    // 5. HTTP Proxy to Go Backend
    return proxyToGoBackend(request, target);
  }
};
```

**Ingress Configuration:**
```yaml
# cloudflare/tunnel-config.yaml
tunnel: office-brain
credentials-file: ~/.cloudflared/office-brain.json
ingress:
  - hostname: dev.sirinx.co
    service: http://127.0.0.1:5177
    originRequest:
      noTLSVerify: true
  - hostname: hermes.dev.sirinx.co
    service: http://127.0.0.1:3000
  - hostname: hermes-api.dev.sirinx.co
    service: http://127.0.0.1:8642
  - hostname: ws.sirinx.co
    service: ws://127.0.0.1:8643  # WebSocket for realtime
  - service: http_status:404
```

**Realtime Stream:**
- **Protocol:** WebSocket over Cloudflare Workers
- **Channels:** `spec-updates`, `agent-events`, `gate-notifications`, `cost-alerts`
- **Frontend:** Server-Sent Events (SSE) fallback

### 8. POSTGRESQL STATE PERSISTENCE

**Schema (Extends Hermes Autoloop V2):**
```sql
-- Fleet state
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
  model_assignment VARCHAR(128),
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

-- Autoloop state (from Hermes V2)
CREATE TABLE spec_queue (...);
CREATE TABLE a2a_tasks (...);
CREATE TABLE agent_log (...);
CREATE TABLE evidence_events (...);
CREATE TABLE gate_approvals (...);
CREATE TABLE file_leases (...);
CREATE TABLE scheduled_jobs (...);
CREATE TABLE monitoring_receipts (...);
CREATE TABLE project_budget (...);
CREATE TABLE agent_cost_log (...);
CREATE TABLE notification_events (...);
CREATE TABLE governance_backups (...);
```

**Evidence Chain:**
- Every event creates a hash: `SHA256(prev_hash + event_json)`
- Chain stored in `evidence_events.chain_hash`
- Verification: `verify_evidence_chain(conn)` on boot

### 9. FRONTEND INTEGRATION (Next.js + Cloudflare Realtime)

**Toast Notification System:**
```typescript
// apps/dev-dashboard/src/hooks/useRealtimeToast.ts
export function useRealtimeToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  useEffect(() => {
    const ws = new WebSocket("wss://ws.sirinx.co/stream");
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "mission_complete") {
        setToasts(prev => [...prev, {
          id: data.mission_id,
          type: "success",
          message: `✅ ${data.ship} — ${data.goal}`,
          timestamp: Date.now()
        }]);
      }
      // ... handle other types
    };
    
    return () => ws.close();
  }, []);
  
  return toasts;
}
```

**UI States:**
- **Goal Submission:** Button disabled + spinner
- **Running:** Progress bar with current state
- **Gate Waiting:** Yellow toast "⏳ Waiting for approval"
- **Success:** Green toast with checkmark
- **Failure:** Red toast with error + retry button

---

## 🔄 INTEGRATION WORKFLOWS

### Workflow A: Media Factory Automation (Ghost Claw OS + 360° Video)

```
User Goal: "Create 360° video render pipeline for Ghost Claw OS"
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ HERMES MISSION COMMANDER                                    │
│ Creates mission, assigns to Build Ops Ship                  │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ OPUS (Navigator) — Architecture Design                      │
│ Output: media-factory-architecture.md                       │
│   - Sharding strategy                                       │
│   - 360° video parameters (resolution, fps, codec)         │
│   - Ghost Claw OS integration points                        │
│   - Parameter schema validation                             │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ CODEX (Captain) → GLM/DeepSeek (Engineers)                  │
│ Lane: apps/media-factory/**, packages/media-core/**         │
│ Output: Source files, sharding config, render params        │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ KOB (Operator) — Validation                                 │
│ Runs: typecheck, lint, unit tests, schema validation        │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ QA AGENT (Sentinel) — Review                                │
│ Safety review, parameter bounds check, integration test     │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ COMMIT_LOCAL (Human Approval) → PostgreSQL → Realtime → UI  │
└─────────────────────────────────────────────────────────────┘
```

**360° Video Parameter Schema:**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["project_id", "sharding", "video_360"],
  "properties": {
    "project_id": { "type": "string" },
    "sharding": {
      "type": "object",
      "required": ["segments", "overlap_degrees", "stitch_method"],
      "properties": {
        "segments": { "type": "integer", "minimum": 6, "maximum": 24 },
        "overlap_degrees": { "type": "number", "minimum": 10, "maximum": 60 },
        "stitch_method": { "enum": ["optical_flow", "feature_match", "depth_based"] }
      }
    },
    "video_360": {
      "type": "object",
      "required": ["resolution", "fps", "codec", "bitrate_mbps", "projection"],
      "properties": {
        "resolution": { "enum": ["4K", "5.7K", "8K", "12K"] },
        "fps": { "type": "integer", "enum": [24, 30, 60, 120] },
        "codec": { "enum": ["h264", "h265", "vp9", "av1"] },
        "bitrate_mbps": { "type": "number", "minimum": 25, "maximum": 200 },
        "projection": { "enum": ["equirectangular", "cubemap", "eac"] }
      }
    },
    "ghost_claw_integration": {
      "type": "object",
      "properties": {
        "parameter_injection_api": { "type": "string", "format": "uri" },
        "status_webhook": { "type": "string", "format": "uri" },
        "asset_registry_sync": { "type": "boolean" }
      }
    }
  }
}
```

### Workflow B: Code Reviewer & Automate QA Pipeline

```
User Goal: "Clear code debt across project X with automated review"
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ HERMES → QA & Security Ship                                 │
│ Captain: QA Agent                                           │
│ Crew: Adaptive Control (DeepSeek) + Security Sentinel       │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: Discovery (Research Agent)                         │
│ - Scan repo for TODO/FIXME/technical debt markers           │
│ - Analyze git history for hotspots                          │
│ - Run static analysis (SonarQube/ESLint/TypeScript)         │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: Prioritization (Adaptive Control)                  │
│ - Score by: frequency, severity, business impact            │
│ - Generate prioritized backlog                              │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 3: Automated Fix (Codex + GLM Workers)                │
│ - Each fix in isolated lane                                 │
│ - Schema validation on every patch                          │
│ - KOB runs tests after each fix                             │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 4: Review Gate (QA Agent)                             │
│ - Security scan (npm audit, Snyk, OWASP ZAP baseline)       │
│ - Regression test suite                                     │
│ - Performance benchmarks                                    │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 5: Human Approval → Commit → Deploy Gate              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Week 1-2)
- [ ] Free Model Pack configuration in Hermes config.yaml
- [ ] Chrome Remote Desktop MCP server setup
- [ ] PostgreSQL schema migration (extends Hermes V2)
- [ ] Cloudflare Worker edge gateway scaffold

### Phase 2: Autoloop Core (Week 2-3)
- [ ] Goal-based state machine implementation
- [ ] A2A envelope + dispatch system
- [ ] Lease system with overlap prevention
- [ ] Evidence chain + verification
- [ ] Cost guard + budget tracking

### Phase 3: Fleet Integration (Week 3-4)
- [ ] GhostClaw Fleet Orchestrator integration
- [ ] Ship/Crew agent registration
- [ ] 5 Co-Worker role enforcement
- [ ] A2A2A protocol implementation
- [ ] Lane assignment + collision prevention

### Phase 4: Verification & Security (Week 4-5)
- [ ] QA Reviewer Agent with schema validation
- [ ] Sovereign Security Perimeter gates
- [ ] Max 5 loop retry with exception JSON
- [ ] Human approval integration (Telegram)

### Phase 5: Edge & Realtime (Week 5-6)
- [ ] Cloudflare Workers deployment
- [ ] WebSocket realtime stream
- [ ] Frontend toast integration
- [ ] WAF + Access configuration

### Phase 6: Workflows (Week 6-8)
- [ ] Media Factory Automation pipeline
- [ ] Code Reviewer & QA Automation pipeline
- [ ] 360° video parameter schema
- [ ] Ghost Claw OS integration

### Phase 7: Validation & Hardening (Week 8-10)
- [ ] End-to-end dry-run test suite
- [ ] Security penetration test
- [ ] Load testing (concurrent missions)
- [ ] Cost benchmarking (token efficiency)
- [ ] Documentation + runbooks

---

## 🛡️ SAFETY & COMPLIANCE

### Hard Rules (Non-Negotiable)
1. **No deploy without explicit human approval**
2. **No git push without explicit human approval**
3. **No cloud mutation without explicit human approval**
4. **No real .env reads or secret exposure**
5. **No paid API calls without budget gate + approval**
6. **No customer messages without approval**
7. **No public exposure of internal services**
8. **Dry-run first for all external actions**
9. **Schema validation on every agent output**
10. **Evidence chain verification on every boot**

### Autonomy Levels Enforced
| Level | Description | Default Max |
|-------|-------------|-------------|
| A0 | Static UI/docs | Production |
| A1 | Deterministic script | Production |
| A2 | LLM-assisted draft | Production |
| A3 | LLM in workflow | Production |
| A4 | Bounded agent (allowlist) | Internal tools |
| A5 | External action + human approval | Cloud/deploy |
| A6 | Automatic external action | Prohibited |
| A7 | Unbounded shell | Prohibited |

### Release Gates (14 Gates)
See `RELEASE_GATE.md` — all must pass before production.

---

## 📊 OBSERVABILITY & METRICS

**Required Metrics per AI Run:**
```json
{
  "correlation_id": "uuid",
  "intent": "string",
  "retrieved_sources": ["source1", "source2"],
  "prompt_version": "string",
  "model_name": "string",
  "latency_ms": 1234,
  "cost_estimate_usd": 0.0012,
  "guardrail_verdict": "PASS|WARN|BLOCK",
  "tokens": { "input": 1000, "output": 500 }
}
```

**Dashboards:**
- **Grafana:** System health, latency, cost, error rates
- **Dev Dashboard:** Mission queue, agent status, gate states
- **Telegram:** Real-time alerts, approval requests

---

## 🔗 FILE SCOPE & LOCATIONS

### New Files to Create
```
/Users/sirinx/sirinx-os/
├── docs/sovereign-autoloop/
│   ├── SOVEREIGN_AUTOLOOP_FLEET.md          # This spec
│   ├── FREE_MODEL_PACK.yaml                  # Model configurations
│   ├── CHROME_REMOTE_DESKTOP_SETUP.md        # CDP integration guide
│   ├── AUTOLOOP_STATE_MACHINE.yaml           # State definitions
│   ├── VERIFICATION_GATE_SCHEMA.json         # JSON schemas
│   ├── SECURITY_PERIMETER_RULES.yaml         # Isolation rules
│   ├── EDGE_GATEWAY_WORKER.ts                # Cloudflare Worker
│   ├── POSTGRESQL_SCHEMA.sql                 # Extended schema
│   ├── REALTIME_STREAM_PROTOCOL.md           # WS/SSE protocol
│   ├── MEDIA_FACTORY_WORKFLOW.md             # 360° video pipeline
│   ├── CODE_REVIEWER_QA_WORKFLOW.md          # Code debt pipeline
│   └── VALIDATION_TEST_SUITE.md              # Test scenarios
│
├── hermes/autoloop/
│   ├── free_model_router.py                  # Model selection logic
│   ├── chrome_cdp_client.py                  # CDP integration
│   ├── sovereign_gates.py                    # Security perimeter
│   ├── fleet_integration.py                  # GhostClaw bridge
│   ├── verification_gate.py                  # QA Reviewer
│   └── realtime_publisher.py                 # Cloudflare Stream
│
├── services/
│   ├── edge-gateway/                         # Cloudflare Worker
│   │   ├── wrangler.toml
│   │   ├── src/index.ts
│   │   └── src/waf.ts
│   ├── orchestrator-go/                      # Go backend
│   │   ├── go.mod
│   │   ├── cmd/orchestrator/main.go
│   │   ├── internal/autoloop/
│   │   └── internal/fleet/
│   └── postgres-state/                       # DB migrations
│       └── migrations/
│
├── apps/dev-dashboard/
│   └── src/hooks/useRealtimeToast.ts         # Frontend integration
│
└── schemas/
    ├── agent_output.schema.json
    ├── a2a_envelope.schema.json
    ├── mission_card.schema.json
    └── video_360_params.schema.json
```

### Existing Files to Modify
```
/Users/sirinx/sirinx-os/
├── .hermes/profiles/solis/config.yaml        # Add free models, CDP, fleet config
├── hermes/autoloop/commander.py              # Extend with fleet integration
├── hermes/autoloop/dispatch.py               # Add model routing
├── hermes/autoloop/middleware.py             # Add sovereign gates
├── GHOSTCLAW/FLEET_ORCHESTRATOR.md           # Sync with this spec
├── configs/model_router.registry.yaml        # Add free model pack
└── CLOUDFLARE_EDGE_PLAN.md                   # Add Worker ingress
```

---

## ✅ VERIFICATION CHECKLIST

### Pre-Deployment Validation
- [ ] All 14 Release Gates documented and passing
- [ ] Free model pack configured and tested
- [ ] Chrome CDP connection verified (screenshots, console, network)
- [ ] PostgreSQL schema migrated and verified
- [ ] Evidence chain verification passes on boot
- [ ] Cost guard blocks over-budget missions
- [ ] Sovereign perimeter blocks branded/production references
- [ ] Lease system prevents overlap (concurrent test)
- [ ] Schema validation catches malformed agent output
- [ ] Max 5 loop retry works with exception JSON
- [ ] Human approval gate works via Telegram
- [ ] Cloudflare Worker responds to health check
- [ ] WebSocket realtime stream delivers to frontend
- [ ] Frontend toast shows success/failure correctly
- [ ] Media Factory workflow dry-run completes
- [ ] Code Reviewer QA workflow dry-run completes

### Security Validation
- [ ] No secrets in config, logs, or context
- [ ] PII masked in all outputs
- [ ] WAF blocks malicious requests
- [ ] Cloudflare Access protects dev.sirinx.co
- [ ] No cross-lane writes without Hermes
- [ ] No worker-to-worker direct communication
- [ ] All external actions require approval

### Performance Baselines
- [ ] Autoloop tick < 100ms (no active missions)
- [ ] Mission dispatch < 500ms
- [ ] Schema validation < 50ms
- [ ] Evidence chain verify < 200ms
- [ ] Cost check < 10ms
- [ ] WebSocket latency < 100ms edge-to-client

---

## 🚀 NEXT ACTIONS

### Immediate (This Session)
1. **Create Free Model Pack configuration** in Hermes config.yaml
2. **Add Chrome Remote Desktop MCP** server configuration
3. **Extend PostgreSQL schema** with fleet tables
4. **Create Cloudflare Worker scaffold** for edge gateway

### Short Term (Next Session)
1. Implement sovereign security gates in middleware
2. Build verification gate (QA Reviewer) with schema validation
3. Integrate GhostClaw fleet orchestrator bridge
4. Create realtime publisher for Cloudflare Streams

### Medium Term
1. Build Media Factory Automation workflow
2. Build Code Reviewer & QA Automation workflow
3. Frontend toast integration
4. End-to-end dry-run test suite

---

## 📝 DECISION LOG

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-08 | Use OpenRouter free tier + local Ollama | Cost control, sovereignty, no vendor lock-in |
| 2026-07-08 | Chrome CDP via MCP | Standard protocol, isolates browser profile |
| 2026-07-08 | PostgreSQL for state | ACID, evidence chain, fleet scale |
| 2026-07-08 | Cloudflare Workers + WAF | Zero-tunnel, edge security, realtime |
| 2026-07-08 | 7-state autoloop | Proven in Hermes V2, extensible |
| 2026-07-08 | Max 5 loop retry | Balance automation vs human escalation |
| 2026-07-08 | GhostClaw Fleet integration | Existing hierarchy, proven lane model |

---

**Status:** READY FOR IMPLEMENTATION  
**Next Step:** Begin Phase 1 implementation with Free Model Pack + Chrome CDP + PostgreSQL schema