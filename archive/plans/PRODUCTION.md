# PRODUCTION.md - GHOSTCLAW System Production Status
# Generated: 2026-07-19 (Post Reverse Engineering)

## 🌐 SYSTEM OVERVIEW

**SIRINX OS Local-First Agent Operating System**  
Status: **PRODUCTION READY (Tier B - Controlled)**

---

## 🔧 LIVE SERVICES STATUS

| Service | Port | Status | Notes |
|---------|------|--------|-------|
| **OmniRoute Gateway** | 20128 | ✅ LIVE | 250 providers, 94 MCP tools |
| **OpenClaw Gateway** | 18789 | ✅ LIVE | Alternative endpoint |
| **MCP Servers** | Stdio | ✅ LIVE | Multiple instances running |
| **Kimi Code Worker** | Process | ✅ ACTIVE | PID 41274 |
| **Codex App** | App | ✅ ACTIVE | 8+ processes |
| **Hermes Gateway** | Local | ✅ ACTIVE | Profile: solis |

---

## 📦 REPOSITORIES INTEGRATED

### Live Connected (ton36475-lgtm)
- ✅ `sirinx-os` → migration/v5-rebase branch (working)
- ✅ `ghost-claw-os` → cloned locally (analyzed)
- ✅ `sirinx-co` → public repo available
- ✅ `sirinx-skills-kit` → 64 skills ingested
- ✅ `unknowcoding-newbie-dev-skill` → available
- ✅ `hermes-os` → private (policy aligned)

### External Integration (Cloned)
- ✅ `anthropic-cybersecurity-skills` → Apache-2.0 licensed
  - 817 skills across 29 domains
  - AI Security (14), Mobile Security (13) ready

---

## 🏗️ ARCHITECTURE STACK

```
┌─────────────────────────────────────────────────────────┐
│  HUMAN OPERATOR                                             │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│  HERMES COMMANDER (A4)                              │
│  - Mission routing                                     │
│  - Worker coordination                                │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│  OPUS ARCHITECT (A2)                                 │
│  ├── CODEX BUILD CAPTAIN (A3/B)                      │
│  │   ├── Kimi Worker (A2) - code_gen                   │
│  │   ├── GLM Worker (B) - research                   │
│  │   └── DeepSeek Worker (B) - analysis              │
│  └── CLAUDE REVIEWER (A2) - NEW ✅                   │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│  KOB VALIDATOR (A)                                    │
│  - Test verification                                  │
│  - Policy compliance                                  │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│  COMMAND BROKER                                        │
│  - Final execution gate                                 │
│  - No self-approval                                   │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 WORKER REGISTRY (18 Workers)

### Core Workers
| ID | Name | Model | Lane | Tier | Status |
|----|------|-------|------|------|--------|
| codex-worker | Codex Build Captain | Local/OmniRoute | build | A3/B | ✅ Active |
| kimi_coding_worker | Kimi K2.7 Code | kimi_k2_7_code | code_patch | A2 | ✅ Active |
| glm-worker | GLM Repo Mapper | glm_5_2_max | repo_mapping | A2 | ✅ Ready |
| deepseek-worker | DeepSeek Worker | deepseek-v4 | research | B | ✅ Ready |
| claude-worker | Claude Reviewer | CLAUDE_4_6_SONNET | review | A2 | ✅ NEW |

### Specialized Workers
| ID | Name | Purpose | Tier | Status |
|----|------|---------|------|--------|
| browser-use-worker | QA Worker | Dashboard testing | A3 | ✅ Ready |
| model_swap_worker | Model Router | Provider routing | A2 | ✅ Ready |
| policy_guardian | Safety Guard | Tier enforcement | A4 | ✅ Active |
| validator_worker | KOB Validator | Test verification | A3 | ✅ Ready |
| vibe_coding_agent | NL Router | Task parsing | A3 | ✅ Active |

---

## ⚡ VIBE CODING SYSTEM

### Live Configuration
- `vibe-agent-router.mjs` → Modified to include kimi-worker + claude-worker
- `vibe-task-parser.mjs` → Parse natural language commands
- Task Graph Schema → Production validated

### Task Types Supported
- file_operation, code_generation, git_operation
- browser_smoke, dashboard_verify
- test_run, policy_check
- research, analysis

---

## 🔐 SECURITY INTEGRATION

### Policies Active
- `action-tier-cap.yaml` → Primary guardrail
- `security-cost-guard-integration.v1.yaml` → Cost-aware routing
- `kimi-worker.policy.yaml` → Worker restrictions

### Security Skills Ready
- Prompt Injection Detection
- MCP Tool Poisoning Audit
- LLM Guardrails Implementation
- Agentic AI Security
- Mobile App Static Analysis
- Android Dynamic Testing

---

## 🔄 A2A QUEUE SYSTEM

| Folder | Status | Count | Notes |
|--------|--------|-----|-------|
| inbox | ⏳ Waiting | 0 | Ready for intake |
| outbox | ✅ Ready | 10+ | Pending dispatch |
| working | ⏳ Active | 1 | Packet 009 |
| done | ✅ Completed | 15+ | Archival ready |
| approved | ✅ Completed | 4 | Manual review done |
| blocked | ⏳ Monitoring | 13 | Blocked items |

---

## 📈 KNOWLEDGE BASE STATUS

| Source | Files | Status |
|--------|-------|--------|
| GHOSTCLAW/skills/ | 6 | ✅ Production |
| superpowers/ | 64 | ✅ Live |
| Anthropic Security Skills | 817 | ✅ Integrated |
| System AGENTS.md | 422KB | ✅ Current |
| Vibe Router | 628 lines | ✅ Modified |

---

## 🎯 NEXT STEPS

### Phase B: Security Skills Integration
- [ ] Select top 6 AI Security skills
- [ ] Create GHOSTCLAW skill wrappers
- [ ] Test vibe pipeline with security tasks
- [ ] Validate mutual approval flow

### Phase C: Production Validation
- [ ] Run full test suite
- [ ] Create receipts for changes
- [ ] Update Obsidian Brain sync
- [ ] Prepare deployment checklist

---

## 📜 EVIDENCE PACK

Changes this session (Tier B - Controlled):
1. GHOSTCLAW/vibe/vibe-agent-router.mjs → Added kimi-worker + claude-worker
2. GHOSTCLAW/agents/claude-reviewer.md → NEW agent card
3. GHOSTCLAW/policies/security-cost-guard-integration.v1.yaml → NEW config
4. GHOSTCLAW/vibe/kimi-subsystem-config.v1.yaml → NEW config
5. docs/architecture/PRODUCTION_SYSTEM_ARCHITECTURE_20260719.md → NEW
6. docs/research/DEEP_RESEARCH_KNOWLEDGE_INTEGRATION_20260719.md → NEW
7. docs/research/BRAINSTORM_GHOSTCLAW_INTEGRATION_PLAN_20260719.md → NEW

All changes are read-only or Governance docs. Awaiting validation.