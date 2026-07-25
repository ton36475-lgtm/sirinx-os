# ═══════════════════════════════════════════════
# GHOSTCLAW — FULL SYSTEM EXECUTION PLAN v1.0
# Tony: 🔴 AUTO EXECUTE — All tools approved
# ═══════════════════════════════════════════════

**Status:** 🔴 AUTO EXECUTE · 2026-07-26
**Council:** Daily 08:00 via A2A
**Control:** WhiteSide Dev Command Center (apps/9router/dashboard/whiteside.html)

---

## PHASE 1: INFRASTRUCTURE BASE (24h)

### 1.1 Cloudflare Worker Deploy
- [ ] `wrangler login` (Tony: OAuth browser)
- [ ] Deploy WhiteSide dashboard as Cloudflare Worker
- [ ] Verify dev.sirinx.co/9router → whiteside.html
- **Owner:** Tony + Hermes
- **Lane:** command

### 1.2 Supabase Brain Backend
- [ ] `supabase link` project
- [ ] Create agent_memory, sync_logs, model_registry tables
- [ ] Wire env vars to all agents
- - **Owner:** Codex (assigned)
- **Lane:** codex

### 1.3 Activepieces/n8n Workflow Engine
- [ ] Start Activepieces: `npx activepieces start`
- [ ] Create: model health check → Telegram notify workflow
- [ ] Create: deploy pipeline workflow
- [ ] Create: QA test trigger workflow
- **Owner:** OpenCode Kiro
- **Lane:** opencode

---

## PHASE 2: AGENT MESH (48h)

### 2.1 A2A Live Sync via Cloudflare
- [ ] Route A2A bridge traffic through Cloudflare CF Worker
- [ ] Sync scripts: all 11 agents write to Supabase
- [ ] Neural pulse: auto-daily knowledge sync
- **Owner:** Codex + Kiro
- **Lane:** codex

### 2.2 All 11 Agents — Provider Keys Installed
| Agent | Provider | Model |
|-------|----------|-------|
| Hermes | OmniRoute + 9router | auto/best-free |
| Codex | OmniRoute | auto/best-coding |
| OpenCode | OpenCode Zen | deepseek-v4-flash-free |
| ZCode | OmniRoute deepseek-pro | cl/deepseek/deepseek-v4-pro |
| Kiro | VIP Pool | kiro-auto (sonnet+opus) |
| Claude | Anthropic/Cointh | claude-sonnet-4 |
| Copilot | GitHub API | gpt-4o |
| Antigravity2 | OmniRoute | auto/best-free |
| WebMCP | 9router | cf/@cf/ |
| Planner | OmniRoute | auto/best-free |
| Zai_tui | OmniRoute | auto/best-free |

### 2.3 Vibe Coding Lanes
- Codex Lane → services/*, packages/*, crates/*
- OpenCode Lane → apps/*, tests/*, docs/*
- Claude Lane → security/*, policies/*, docs/*
- **Gate:** No cross-lane file edits without Hermes lease

---

## PHASE 3: WHITESIDE DASHBOARD UPGRADES (72h)

### 3.1 Phase 2 Features
- [ ] Live agent health polling (via A2A bridge)
- [ ] Provider matrix with real-time health
- [ ] Workflow trigger buttons (deploy, test, sync)
- [ ] Model usage metrics (tokens, costs)
- [ ] QA test results dashboard

### 3.2 Phase 3 Features
- [ ] Supabase- backed agent memory viewer
- [ ] Neural pulse timeline
- [ ] Git commit feed
- [ ] A2A message inspector
- [ ] Council meeting scheduler

---

## PHASE 4: QA ENGINEERING (continuous)

### 4.1 Auto-Test Every System
| System | Test | Frequency |
|--------|------|-----------|
| A2A Bridge | All 11 agents respond | Every 15m |
| OmniRoute | /v1/models returns | Every 5m |
| Aliyun MaaS | qwen3-coder-plus smoke | Every 30m |
| Cloudflare Workers | 4 workers health | Every 15m |
| WhiteSide Dashboard | All 7 tabs load | Every 30m |
| Activepieces | Workflow engine alive | Every 15m |

### 4.2 QA Auto-Review Pipeline
- Codex work → OpenCode review → QA pass/fail
- Hermes final gate before deploy
- Receipt written to `.ghostclaw_runtime/a2a2a/qa-reviews/`

---

## PHASE 5: AUTOLOOP (continuous)

Cycle: Review → Test → Commit → Push → Deploy → Pulse

```
Agent Loop (60s tick)
  ├── Review outbox for new work
  ├── Execute assigned tasks per lane
  ├── QA pass gate
  ├── Auto-commit (chore: auto-sync)
  ├── Push to origin HEAD
  └── Deploy via Cloudflare (if config changed)
```

---

## LANE ASSIGNMENTS

| Lane | Work Areas | Parallel Limit |
|------|------------|----------------|
| **Codex** | services/, packages/, crates/, infra/ | 1 active task |
| **OpenCode** | apps/, tests/, docs/bridge | 1 active task |
| **Claude** | security/, policies/, docs/ | 1 active task |
| **Kiro** | integrations/, features | 1 active task |
| **ZCode** | code review, arch review | Always available |
| **Planner** | roadmap, milestone tracking | Daily sync |
| **Hermes** | Telegram, gateway, commands | Commander |

---

## APPROVAL GATES

| Action | Gate | Auto? |
|--------|------|-------|
| Read file | None | ✅ Yes |
| Edit local file | Lane ownership check | ✅ Yes |
| Git commit | QA test pass | ✅ Yes |
| Git push | Scan for secrets | ✅ Yes |
| Cloudflare deploy | wrangler login | ⚠️ Tony |
| Install npm package | Review license | ✅ Yes |
| Kill/restart process | None | ✅ Yes |
| API call to external | Budget check | ✅ Yes |
| Customer messaging | Human gate | ❌ No |
| Secret write | Human gate | ❌ No |

---

*Plan approved by Tony · 2026-07-26 · 🔴 FULL AUTO EXECUTE*
