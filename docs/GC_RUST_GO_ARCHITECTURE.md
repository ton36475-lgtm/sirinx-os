# 🏗️ GC RUNTIME ARCHITECTURE — Rust & Go Core
**Version:** 1.0.0 | **Status:** ✅ Active | **Last Updated:** 2026-07-24

---

## 🧭 Overview

ระบบ GC Core ทำงานบน **Rust + Go** เท่านั้น — ไม่มี Python, Node.js, หรือ heavy dependencies
ออกแบบมาให้ **กินทรัพยากรน้อยที่สุด** พร้อม Self-Evolution + RAG + Harness Engineering

```
┌──────────────────────────────────────────────────────────────────┐
│                     AGENT FLEET (11+ Agents)                     │
│  Hermes · Codex · Claude · OpenCode · zcode · Kiro · Copilot    │
│  webmcp · planner · antigravity2 · zai_tui                     │
└──────────────────────────┬───────────────────────────────────────┘
                           │ A2A2A Bridge Protocol
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                🦀 RUST CORE (gc-runtime-core)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐     │
│  │  Vector Store │  │  RAG Engine  │  │  Harness Trainer   │     │
│  │  (memmap f32) │  │  (cosine-sim)│  │  (eval + improve)  │     │
│  └──────────────┘  └──────────────┘  └────────────────────┘     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  gc-neural CLI — stdin/stdout JSON-LD protocol (1.6MB)     │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────┬───────────────────────────────────────┘
                           │ Unix Socket / HTTP
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                🐹 GO ORCHESTRATION (gc-orch)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │  Bridge  │  │  Queue   │  │ Scheduler│  │   Monitor      │  │
│  │  (A2A2A) │  │ (P0-P3)  │  │ (cron)   │  │ (health/alert) │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────────┘  │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                🔧 SCRIPT LAYER (thin wrappers)                    │
│  gc-self-evolve.sh · gc-rag-harness.py · gc-maker-gate.sh        │
│  gc-metrics-collector.sh · gc-neural-synapse.sh · qa-auto-review │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🦀 Rust Core (gc-runtime-core)

### Vector Store (`src/vector.rs`)
- **Engine:** Memory-mapped f32 flat binary (`memmap2`)
- **Index:** JSON index file (`.index.json`)
- **Default dim:** 128 floats
- **Search:** Cosine similarity with linear scan (O(n) for small-N, pure memory)
- **IO:** Zero-copy reads, append-only writes
- **Deps:** `memmap2`, `serde_json`, `rand` — <10 crates total
- **Memory:** 512 bytes per vector (128 × f32) + 256 bytes index overhead

```
.gc-runtime/neural/vectors/
├── vectors.bin      # Flat f32 array [N × dim]
├── vectors.index.json  # Metadata index
└── store.json       # Persistent state
```

### RAG Engine (`src/rag.rs`)
- **Input:** Query text → base64-hashed → search vector store
- **Context assembly:** Top-K results → formatted as prompt context
- **No network:** Pure local library
- **Latency:** <1ms for 10K vectors on M2

### Harness Trainer (`src/harness.rs`)
- **Evaluation:** Track agent:task → passed/failed → score history
- **Gap analysis:** Identify underperforming agent-task pairs
- **Improvement loop:** Generate action recommendations
- **Data format:** JSON training samples with agent_id, task_id, timestamp, passed

### Store Layer (`src/store.rs`)
- **Format:** Flat JSON files (`.json`)
- **Content:** Training samples, evaluation results
- **IO:** `serde_json` serialization/deserialization

### CLI (`src/bin/gc-neural.rs`)
- **Binary size:** 1.6MB (stripped)
- **Commands:**
  - `status` — Show engine health
  - `harness eval <agent> <task> <passed>` — Evaluate and store
  - `rag store <dir>` — Store documents as vectors
  - `rag query <text> <k>` — Search nearest vectors
- **Protocol:** stdin/stdout JSON-LD (no HTTP, no network)

---

## 🐹 Go Orchestration (gc-orch)

### Bridge (`bridge/`)
- **Connects** all 11 agents via A2A2A protocol
- **Outbox pattern:** Each agent has `.ghostclaw_runtime/a2a2a/outbox/<agent>/`
- **Heartbeat:** HTTP health check every 30s
- **Port:** 8721 (HTTP control plane)

### Queue (`queue/`)
- **Priority tiers:** P0 (blocker), P1 (feature), P2 (improvement), P3 (background)
- **Backend:** In-memory (Go map) with JSON recovery
- **API:** REST endpoints for queue operations

### Scheduler (`sched/`)
- **Cron-based** scheduling (5m auto-loop interval)
- **Integration:** Triggers gc-neural-synapse.sh on schedule

### Monitor (`mon/`)
- **Agent health:** Active/Standby tracking (6/11 currently active)
- **Bridge state:** Queue stats, neural sync timestamp, running count

---

## 🔄 Self-Evolution Pipeline

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  COLLECT │───▶│  EVAL    │───▶│  STORE   │───▶│  QUERY   │───▶│ IMPROVE  │
│  Agent   │    │  Harness │    │  Vector  │    │  RAG     │    │  Evolve  │
│  Data    │    │  Trainer │    │  DB      │    │  Engine  │    │  Agents  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

1. **COLLECT:** gc-rag-harness.py → gc-orch → agent queue state
2. **EVAL:** gc-neural (Rust) harness → evaluate agent-task performance
3. **STORE:** gc-neural (Rust) vector → memory-mapped vector store  
4. **QUERY:** gc-neural (Rust) RAG → retrieve relevant training history
5. **IMPROVE:** Generate improvement recommendations → update queue

**Resource cost:** ~2MB RAM for Rust core, ~5MB for Go orchestrator
**Total:** <10MB for entire runtime, zero background CPU when idle

---

## 📊 Resource Budget

| Component | Language | RAM | CPU | Binary Size | Deps |
|-----------|----------|-----|-----|-------------|------|
| gc-runtime-core | Rust | ~2MB | 0% idle | 1.6MB | <10 crates |
| gc-orch | Go | ~5MB | 0% idle | 8MB | stdlib only |
| gc-neural (CLI) | Rust | ~2MB | spike | 1.6MB | — |
| **Total** | — | **<10MB** | **~0% idle** | **~12MB** | **Minimal** |

---

## 🗺️ Migration Plan (Phase 4)

### Phase 4A — Replace Shell Scripts with Go (Current)
- ✅ gc-bridge-orchestrator.sh → gc-orch (Go, port 8721)
- ✅ gc-priority-queue.sh → gc-orch queue endpoint
- 🔄 gc-system-report.sh → gc-orch monitor endpoint
- 🔄 gc-council-orchestrator.sh → gc-orch scheduler

### Phase 4B — Rust Core Expansion
- ✅ gc-runtime-core + gc-neural (vector, rag, harness)
- 🔄 Add HTTP transport to gc-neural (optional, for faster Go↔Rust)
- 🔄 Implement `rag store` + `rag query` in gc-neural
- 🔄 Training sample persistence → harness trainer

### Phase 4C — Full Self-Evolution
- ✅ Self-evolution loop (gc-rag-harness.py)
- 🔄 Auto-improvement → task generation → queue update
- 🔄 Agent feedback loop → retrain recommendations
- 🔄 Performance dashboards → gc-orch metrics

### Phase 4D — Production Hardening
- [ ] Graceful shutdown (SIGTERM handlers)
- [ ] File-lock safety for vector store
- [ ] Crash recovery (auto-rebuild index)
- [ ] Runtime benchmark suite
- [ ] Memory-mapped safety (mlock, prefault)

---

## 📋 Key API Endpoints

### gc-orch (Go, :8721)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/status` | GET | System health + version |
| `/queue` | GET | Queue state (P0-P3) |
| `/agents` | GET | Agent fleet status |
| `/neural/sync` | POST | Trigger neural sync |

### gc-neural (Rust CLI)
| Command | Description |
|---------|-------------|
| `gc-neural status` | Engine health |
| `gc-neural harness eval <agent> <task> <passed>` | Evaluate agent |
| `gc-neural rag store <dir>` | Index docs as vectors |
| `gc-neural rag query <text> <k>` | Semantic search |

---

## 🔐 Safety Constraints

1. **No network exposure** — gc-neural is CLI-only, no HTTP
2. **No heavy deps** — Rust: 10 crates, Go: stdlib only
3. **No secrets** — All config via env vars, `.env` ignored by git
4. **No auto-deploy** — Migration requires human approval per phase
5. **Crash-safe** — Vector store is append-only, index rebuildable
6. **Resource-locked** — ~10MB total, no runaway processes

---

## 📈 Current System State

```
🧠 Neural Network: 3 hub nodes · 10 synaptic edges · 6 active agents
🐹 Go Bridge: Port 8721 · Running · 11 agents tracked
🦀 Rust Core: v0.1.0 · 4/4 tests pass · 1.6MB binary
📋 Queue: 7 items (1×P0, 2×P1, 3×P2, 1×P3)
📊 Harness: 7 samples evaluated · Self-evolution loop ready
```
