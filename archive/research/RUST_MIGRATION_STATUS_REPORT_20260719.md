# Rust/SIRINX Monorepo Migration Status Report
# Generated from: Kimi_Agent_QA Archive Research
# Source Files: /tmp/kimi-qa-extract/*.md

## 📊 MIGRATION STATUS

### Current Phase
**Status:** In Progress → migration/v5-rebase branch
- 8 worktrees ทำงานอยู่
- 8 Rust crates พบในระบบ
- Agent routing พร้อมใช้

### Architecture Components
| File | Purpose | Migration Status |
|------|---------|----------------|
| crates/ghostclaw-providers | LLM provider adapter | ✅ Partial (openrouter.rs exists) |
| crates/ghostclaw-providers/Cargo.toml | Provider config | ✅ Ready |
| research/latentmas/crates/ | Experimental agents | 🔄 Development |
| research/latentmas/crates/katgpt-orchestrator | Orchestration | 🔄 Development |
| research/latentmas/crates/latent-protocol | Agent protocol | 🔄 Development |

---

## 🔴 SECURITY FINDINGS (จาก production.md §6)

### URGENT - Phase 0
1. **android-release.keystore รั่ว**
   - Repo: ghost-claw-os, automation-mobile-app
   - ต้อง: revoke + rotate + git filter-repo

2. **secrets/ directory**
   - Repo: sirinx
   - ต้อง: rotate + purge + .gitignore

3. **node_modules/ อยู่ใน git history**
   - Repo: ghost-claw-os
   - ต้อง: purge + .gitignore

---

## 📋 MODEL ROUTING RECOMMENDATIONS (จาก agents-md-update-pack.md §3)

### Cost-Optimized Routing
| Role | Model | Endpoint | Cost/Run | Reason |
|------|-------|----------|--------|--------|
| orchestrate/verify/audit | Kimi K3 | api.moonshot.ai/v1 | ≤$0.50 | Cache hit >90% |
| worker/research/draft | GLM-5.2 | api.z.ai/api/paas/v4 | ≤$0.30 | Fastest, MIT weights |
| mechanical | DeepSeek V4 Pro | DeepSeek API | ≤$0.05 | Cheapest output |

**Note:** "maxplus api" ไม่มีใน Moonshot - คือ MiniMax Token Plan ($20/$50/mo)

---

## 🎯 NEXT STEPS

### 1. Security Phase 0 (Urgent)
```yaml
tasks:
  - revoke_android_keystore: ghost-claw-os
  - rotate_secrets_dir: sirinx
  - purge_node_modules: ghost-claw-os
  - add_gitleaks_hook: all_repos
```

### 2. Model Routing Upgrade (Phase 1)
```yaml
tasks:
  - add_kimi_k3_route: omniRoute :20128
  - add_glm_5_2_route: omniRoute
  - add_deepseek_v4_route: omniRoute
  - configure_cache_prefix_policy: AGENTS.md
```

### 3. Skill Integration (Phase 2)
```yaml
tasks:
  - dynamic_tool_loading_for_49_skills: vibe router
  - bind_to_skills_registry: SKILLS_REGISTRY.md
  - apply_qa_swarm_pattern_v1_2: governance
```

---

## 🔗 SYSTEM WIRING

### Current Connections
- **Hermes** → vibe-agent-router (port 20128 via OmniRoute)
- **Codex Worker** → 5+ processes active
- **Kimi Worker** → PID 41274 active
- **Claude Worker** → Ready (added research task type)

### Missing Connections
- `/api/handshake` endpoint → 404 (จำเป็นต้องสร้าง)
- Claude worker live execution → รอ task dispatch

---

## 📈 RECEIPT

```
receipt_id: receipt_rust_migration_status_20260719
status: DONE
evidence_sources:
  - /tmp/kimi-qa-extract/brainstorm-k3-swarm-reverse-engineering.md (213 lines)
  - /tmp/kimi-qa-extract/production.md (110 lines)
  - /tmp/kimi-qa-extract/agents-md-update-pack.md (134 lines)
  - /tmp/kimi-qa-extract/qa-engineering-swarm-prompt-pattern.md (516 lines)
```