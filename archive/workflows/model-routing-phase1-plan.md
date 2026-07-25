# Phase 1 - Model Routing Plan
# Prepared for codex-worker implementation
# Source: agents-md-update-pack.md §3 + production.md §3

## Model Routing Table (Production Specification)

| Route | Model | Endpoint | Budget Guard | Status |
|-------|-------|----------|-------------|--------|
| `orchestrate` | kimi-k3 | api.moonshot.ai/v1 | ≤$0.50/run | Ready |
| `verify` | kimi-k3 | api.moonshot.ai/v1 | ≤$0.50/run | Ready |
| `audit` | kimi-k3 | api.moonshot.ai/v1 | ≤$0.50/run | Ready |
| `root-cause` | kimi-k3 | api.moonshot.ai/v1 | ≤$0.50/run | Ready |
| `worker` | glm-5.2 | api.z.ai/api/paas/v4 | ≤$0.30/run | Ready |
| `research` | glm-5.2 | api.z.ai/api/paas/v4 | ≤$0.30/run | Ready |
| `draft` | glm-5.2 | api.z.ai/api/paas/v4 | ≤$0.30/run | Ready |
| `transform` | glm-5.2 | api.z.ai/api/paas/v4 | ≤$0.30/run | Ready |
| `mechanical` | deepseek-v4-pro | DeepSeek API | ≤$0.05/run | Ready |
| `ide-session` | GLM Coding Plan Pro | open.bigmodel.cn/api/coding | plan quota | Ready |
| `dev-test` | kob-ai credits | kob-ai.dev endpoint | 0.50 credits | Ready |
| `offline-fallback` | ollama local | localhost:11434 | free | Ready |

## Cache-First Prompt Policy (Important for K3)

**Rule:** วาง constitution + AGENTS.md + repo map เป็น stable prefix เสมอ
- Target K3 cache-hit ≥80% in coding workloads
- Per-request content goes last (แค่ส่วนที่เปลี่ยน)
- Cost reduction: input จาก $3.00 → ~$0.30/MTok

## Blended Cost Formula (AA recommended)

**Input Costs (cache-aware 7:2:1):**
- K3: $2.31/MTok
- GLM-5.2: $0.90/MTok  
- DS V4 Pro: $0.18/MTok

**Cost per task:**
- Full K3 swarm: ~$2.40
- Mixed routing: ~$0.80 (67% savings)

## Codex Worker Implementation Tasks

### Priority 1 - Model Configuration
1. Update LiteLLM proxy config (`/Users/sirinx/sirinx-os/integrations/omniroute/config/liteLLM.config.yaml`)
2. Configure cost tags per route
3. Set up API keys (from .env or secrets manager - NO hardcoded values)

### Priority 2 - Cache Optimization
1. Create stable prompt prefix template
2. Add cache-hit monitoring (daily report)
3. Validate ≥80% hit rate

### Priority 3 - Budget Controls
1. Set up cost ceiling alerts ($5 max per day)
2. Implement auto-block เมื่อเกิน budget
3. Add receipt field: `budget_status`

## Receipts Required

Each model route change must produce:
- Model route receipt
- Cost analysis receipt  
- Cache hit rate receipt

---

## ⛔ BLOCKED - Security Phase 0 Pending Approval

| Issue | Required Action | Block Status |
|-------|-----------------|------------|
| `android-release.keystore` leaked in ghost-claw-os | git filter-repo + revoke | BLOCKED_WAITING_APPROVAL |

---

**Ready for codex-worker to implement when Security approval received**