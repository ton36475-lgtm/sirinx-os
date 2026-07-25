# ═══════════════════════════════════════════════
# SIRINX OS — SYSTEM MEMORY MASTER v1.0
# GhostClaw Unified Knowledge Base
# ═══════════════════════════════════════════════

**Generated:** 2026-07-26T04:00:00Z
**Host:** sirinxdev (Mac Mini M2, arm64)
**User:** Tony (Terbo) — sole human authority
**Branch:** migration/v5-rebase

---

## 1. CORE ARCHITECTURE

### Infrastructure
| System | Port | Status |
|--------|------|--------|
| Hermes Gateway | :8787-8788 | ✅ RUNNING (PID 86674) |
| Dev Control API | :8711 | ✅ RUNNING |
| OpenClaw Gateway | :18789 | ✅ RUNNING |
| OmniRoute | :20128 | ⚠️ OFFLINE |
| Cline Hub | :25463 | ✅ RUNNING (PID 77922) |
| Codex (omx) | — | ✅ RUNNING (PID 13227) |
| Hermes Dashboard | :9119 | ✅ RUNNING (PID 2705) |
| SLayer MCP | :stdin | ✅ RUNNING (PID 50912) |
| HyperResearch MCP | :stdin | ✅ RUNNING (PID 50949) |
| A2A Mesh | :9000-9006, :8788 | ✅ 8/8 LIVE |

### MCP Servers Active
- hyperresearch (sirinx-hyperresearch-readonly)
- slayer-demo
- hermes-tools

### Git Worktrees
- `main` — root
- `vibe/claude` — docs/security
- `vibe/codex` — backend/infra
- `vibe/opencode` — frontend/UI
- `codex/ghostclaw-durable-outbox-admission-20260724` — PR
- `codex/pr1-deploy-pipeline-safe-20260719` — PR

---

## 2. MODEL PROVIDERS

### Active Endpoints

| Provider | URL | Models | Status |
|----------|-----|--------|--------|
| OmniRoute | http://127.0.0.1:20128/v1 | auto/best-free, auto/best-coding | ⚠️ Offline |
| Aliyun MaaS | ws-pmpu62szcpaossb6.ap-southeast-1.maas.aliyuncs.com | 151 models (qwen3-coder-plus, qwen3.7-max, etc.) | ✅ WORKING |
| 9router Bridge | dev.sirinx.co/9router/api | CF Workers AI + routing | ✅ Active |
| MaxPlus | api.maxplus-ai.cc | deepseek-v4-pro, glm-5.2, kimi-k2.7-code | ✅ Available |
| OpenCode Zen | opencode.ai/zen/v1 | deepseek-v4-flash-free | ✅ Available |

### Free Priority Chain (Zero-Cost)
```
1. deepseek-v4-pro → 2. deepseek-v4-flash-free → 3. glm-5.2 → 
4. kimi-k2.7-code → 5. qwen3-coder-plus (Aliyun Free) → 
6. Groq llama-3.3-70b → 7. Gemini 1.5 Flash → 8. CF Workers AI
```

### Cloudflare Workers (Production)
- **sirinx-main-router** — PRODUCTION: routes www.sirinx.co → Pages, handles lead API (/api/trpc/lead.submit), D1 database
- +3 other workers

---

## 3. A2A BRIDGE — 11 AGENTS

| Agent | Role | Outbox | Status | Port |
|-------|------|--------|--------|------|
| Hermes | Commander | 63 | ACTIVE | :8788 |
| Codex | Builder | 41 | Running | :9001 |
| ZCode | Arch Review | 31 | RUNNING | — |
| Kiro | Builder | 25 | RUNNING | — |
| Copilot | GitHub MCP | 13 | STOPPED | — |
| OpenCode | Checker/UI | 10 | Running | :9005 |
| Zai_tui | Reviewer | 3 | Standby | — |
| Claude | Architect | 3 | Active | :9006 |
| Antigravity2 | Safety/Live | 2 | Standby | — |
| WebMCP | Web MCP | 1 | Standby | — |
| Planner | Planner | 1 | Standby | — |

### A2A Sync Infrastructure
- Sync scripts: `~/.hermes/profiles/solis/a2a-sync/*.sh` (one per agent)
- Session logs: `~/.hermes/profiles/solis/a2a-sync/*_sessions.jsonl`
- Bridge state: `.ghostclaw_runtime/a2a2a/bridge_active.json`
- Outbox: `.ghostclaw_runtime/a2a2a/outbox/<agent>/`
- Orchestrator: `scripts/gc-bridge-orchestrator.sh`

---

## 4. VIBE CODING — Multi-Lane Config

### Lane Architecture
```
Hermes (Commander) → Routes work to:
  ├── Codex Lane :9001   — Backend/API/Infra (services/*, packages/*)
  ├── OpenCode Lane :9005 — Frontend/UI (apps/*)
  └── Claude Lane :9006   — Docs/Security (docs/*, policies/*)
```

### Config Files (`.vibe-coding/`)
- `lanes.yaml` — Lane definitions, ownership, model assignments
- `a2a-protocol.yaml` — Inter-lane communication protocol
- `ronin-integration.yaml` — Department-to-lane mapping
- `vibe-orchestrator.py` — Orchestration engine
- `sidebar-layout.tsx` — UI integration

### Agent Loop
- Auto-sync every 60 seconds (PID 71035)
- Cycles: review → commit → push → deploy → pulse
- Last commits: continuous auto-sync on main

---

## 5. SECURITY NOTES

### ⚠️ RED Auto-Approve Found (CRITICAL)
**File:** `ghostclaw-os/crates/core/src/lib.rs:216-228`
**Issue:** `AutoApproveAttempt` allows machine auto-approval of RED tasks
**Violates:** v1.0 [8] FORBIDDEN — "Adding any auto-approve path for 🔴 Red tasks"
**Status:** ⛔ AWAITING HUMAN DECISION — Remove or document with 🔴

### Safety Gates
| Tier | Auto | Human Gate |
|------|------|------------|
| T0 Format/Typo | ✅ Yes | No |
| T1 Small patch | ✅ Yes | No |
| T2 Feature slice | ✅ Codex review | No |
| T3 Architecture | ⚠️ Gate | Required |
| T4 Deploy/Secret | ❌ No | HUMAN ONLY |

### Key Rotation Needed
- MaxPlus API keys compromised (noted in Claude worktree commit)

---

## 6. GIT REPOSITORIES

### sirinx-os (monorepo)
| Directory | Purpose |
|-----------|---------|
| `apps/` | Applications (9router, etc.) |
| `crates/` | Rust crates (ghostclaw-os core) |
| `services/` | Backend services |
| `scripts/` | Automation scripts |
| `integrations/` | OmniRoute, etc. |
| `docs/` | Documentation |
| `memory/` | System memory & runtime |
| `brain/` | Knowledge base |
| `skills/` | Skills & prompt packs |
| `tests/` | Test suites |
| `councils/` | Council decisions & records |

### External
- `SIRINXDev/_external_repos/slayer/` — SLayer semantic layer
- `SIRINXDev/_external_repos/hyperresearch/` — HyperResearch MCP

---

## 7. SUPABASE STATUS

- **CLI:** ✅ v2.100.0 installed at `/opt/homebrew/bin/supabase`
- **Status:** Not yet linked to project
- **Target Use:** Agent brain backend, API wiring, shared memory mesh

---

## 8. KEY FILES & PATHS

| File | Purpose |
|------|---------|
| `.env` | Environment variables (gitignored) |
| `.ghostclaw_runtime/a2a2a/` | A2A queue root |
| `scripts/gc-bridge-orchestrator.sh` | Bridge orchestrator |
| `integrations/omniroute/` | OmniRoute config |
| `docs/decisions/` | Decision records (P098 Rev B/C/D/E) |
| `apps/9router/bridge/agent-provider-config.yaml` | Bridge provider config |
| `apps/9router/MODEL_LIST.md` | 391 models catalogued |
| `apps/9router/wrangler.toml` | Cloudflare worker config |
| `vibe-coding-config/` | Vibe coding lane configs |
| `packages/types/` | Shared TypeScript types |
| `.mcp.json` | MCP server registry |
| `SYSTEM_SCHEMA.yaml` | Lane ownership |

---

## 9. IMMEDIATE ACTION ITEMS

### Priority 0 (BLOCKING)
- [ ] ⛔ RED auto-approve: human decision needed

### Priority 1 (Infrastructure)
- [ ] Install Wrangler: `npm install -g wrangler`
- [ ] Link Supabase project
- [ ] Restart OmniRoute
- [ ] Deploy Cloudflare Worker (omni-bridge)

### Priority 2 (Integration)
- [ ] Wire Supabase as agent brain backend
- [ ] Complete A2A live sync through Cloudflare
- [ ] Set up Postman API collections
- [ ] Connect all agent brains to shared memory mesh

### Priority 3 (Planning)
- [ ] Rust/Go migration plan
- [ ] 47 Ronins subagent fleet setup
- [ ] Council brainstorm meeting
- [ ] Full automation loop via CUA
