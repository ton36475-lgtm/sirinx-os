---
name: ghostclaw-master-orchestrator
description: Master orchestration skill that coordinates all GhostClaw OS subsystems — governance, workflow, agents, infrastructure, and external integrations into one cohesive autonomous system.
version: 2.0.0
---

# GhostClaw Master Orchestrator v2.0

## Role

This is the **umbrella skill** that ties together all GhostClaw OS capabilities. Any agent loading this skill knows the full system map, can navigate all subsystems, and can delegate work to parallel agents.

## 🧠 Neural Knowledge Architecture

```
                    ┌──────────────────────┐
                    │     OBSIDIAN BRAIN    │
                    │   (Central Synapse)    │
                    └───────┬──────┬───────┘
                            │      │
         ┌──────────────────┼──────┼──────────────────┐
         ▼                  ▼      ▼                  ▼
    ┌────────┐       ┌────────┐ ┌────────┐       ┌────────┐
    │ Hermes │◄─────►│ Codex  │ │ OpenCode│◄─────►│  Kiro  │
    └───┬────┘       └───┬────┘ └───┬────┘       └───┬────┘
        │                │          │                │
        ▼                ▼          ▼                ▼
    ┌──────────────────────────────────────────────────────┐
    │              A2A BRIDGE (Signal Layer)                │
    └──────────────────────────────────────────────────────┘
```

- **Hub (Synapse)**: Obsidian 08_AI_MEMORY/
- **Signal Layer**: A2A Live Sync Bridge
- **Nodes**: 11 agents + 6 processes
- **Edges**: 10 synaptic connections
- **Script**: `scripts/gc-neural-synapse.sh` [build|sync|status]
- **Pulse**: Auto-generates Neural Pulse YYYY-MM-DD.md daily
- **Registry**: `.ghostclaw_runtime/neural/node-registry.json`

## VERIFIED Mac Mini M2 State (2026-07-17T07:45+07:00)

| Item | Verified Value |
|------|---------------|
| OS | macOS 26.5.2 (arm64) |
| Repo Root | /Users/sirinx/sirinx-os |
| Branch | migration/v5-rebase |
| GhostClaw Tests | 84/84 PASS (per PROJECT_STATE.md, not re-verified this session) |
| Skills API :3800 | ✅ ok (node PID 81132) |
| Dev Control API :8711 | ✅ ok (node PID 80848) |
| Python services :8643/:8644 | ✅ ok (python3.1 PID 63321) |
| Auto-Loop | cron every 5m, last run ok |
| Cron Jobs | **5 active** (loop 5m, disk 10m, health 15m, daily 08:00, daily-summary 09:00) |
| **Disk Usage** | **⚠️ 58% (8.6GB free)** — was 41%/17GB on 07-16, disk filling fast |
| RAM | ~7GB active pages (16K page size) |
| pm2 | **not running** |
| OmniRoute :8787 | **not listening** — binary ready but server not started |
| Telegram Gateway | **fully closed** — polling=false, webhook=false |
| SIRINXDev repo | branch `feat/sirinx-web-line-trust-v1` at /Users/sirinx/SIRINXDev/sirinx-agent-native-os |
| Hermes Profiles | 12 profiles (solis active + backend/data/design/devops/frontend/growth/planner/qa/sales/scribe/shogun) |

**Critical gap**: See `sirinx-autonomous-ops` skill → `references/gap-analysis-automation-stack-2026-07-17.md` for full automation stack gap analysis. Python A2A bridge bypasses TypeScript safety gates — the #1 blocker for trusted autonomous operation.

### System Map (18 tmux windows — VERIFIED)

| # | Window | Purpose |
|---|--------|---------|
| 0 | overview | Health monitor |
| 1 | skills-api | Skills API :3800 ✅ |
| 2 | dev-api | Dev Control API :8711 ✅ |
| 3 | codex | Codex CLI (26 agents) |
| 4 | claude | Claude Code (26 agents) |
| 5 | opencode | OpenCode CLI |
| 6 | hermes | Hermes Agent (33 skills) |
| 7 | tests | Test Runner |
| 8 | cloudflare | Cloudflare Simulation |
| 9 | infra | Infrastructure Hub |
| 10 | gridguist | GridGuist UI Framework |
| 11 | watcher | System Watcher |
| 12 | live-extractor | YouTube Live Extractor |
| 13 | thaimart-workflow | ThaiMart K01-K15 |
| 14 | cynative | Cynative Infrastructure Research v1.5.1 |
| 15 | cynative- | Cynative secondary |
| 16 | auto-loop | Loop Engineering (cron 5m) |
| 17 | omniroute | OmniRoute Free AI Gateway v3.8.48 |
| 18 | markdownify | Markdownify MCP (PDF/Image/Audio/DOCX → Markdown) |

## 🔄 Loop Engineering v2.0 — 10-Phase Cycle

```
📥 TRIAGE → 🏛️ COUNCIL → 🔬 RESEARCH → 📤 DISPATCH → 🔧 MAKER
   → ✅ CHECKER → 🛡️ GUARD → 💾 MEMORY → 📊 FEEDBACK → 🔄 RECOVERY
```

### Phase Status

| # | Phase | Script | Status |
|---|-------|--------|--------|
| 1 | 📥 TRIAGE | `gc-priority-queue.sh` | ✅ Built |
| 2 | 🏛️ COUNCIL | `gc-council-orchestrator.sh` | ✅ Built |
| 3 | 🔬 RESEARCH | `gc-researcher-cycle.py` | ✅ Built |
| 4 | 📤 DISPATCH | A2A2A outbox | ✅ Active |
| 5 | 🔧 MAKER | Codex/Kiro/Copilot | ✅ 3 active |
| 6 | ✅ CHECKER | OpenCode/zcode/QA | ✅ Active |
| 7 | 🛡️ GUARD | Governance contracts | ✅ 25 tests |
| 8 | 💾 MEMORY | Obsidian Brain + Bridge | ✅ Active |
| 9 | 📊 FEEDBACK | (pending) | ⬜ Missing |
| 10 | 🔄 RECOVERY | (pending) | ⬜ Missing |

### Priority Queue (P0-P3)
```
🔴 P0: Blocker → Immediate fix required
🟡 P1: Feature → Council priority, current sprint
🟢 P2: Improvement → Tech debt, research finding
⚪ P3: Background → Maintenance, logging
```
**Command:** `bash scripts/gc-priority-queue.sh [add|list|process|status]`

## 🏛️ Agent Council (Daily 08:00)

**Script:** `scripts/gc-council-orchestrator.sh`
**Output:** `.ghostclaw_runtime/council-minutes/COUNCIL-YYYYMMDD-NNN.json`
**Integration:** Auto-pulls latest Data Research topics as agenda

### Fleet Structure (4 Ships × 5 Co-Workers)

| Ship | Lead | Co-Workers |
|------|------|------------|
| Flagship (Mission Control) | Hermes👍 | Navigator🧭, Scribe📜 |
| Build Operations | Codex | Engineer👷, Operator💻 |
| Integration & Bridge | Kiro | Navigator🧭, Engineer👷, Operator💻 |
| QA & Security | Copilot | Sentinel🛡️, Operator💻 |

## 🔬 Data Researcher (Knowledge Engine)

**Scripts:** `scripts/gc-data-researcher.sh`, `scripts/gc-researcher-cycle.py`
**Pipeline:** Scan system gaps → Generate 7 research questions → Dispatch to codex/opencode/zcode → Auto-feed council agenda → Save to Obsidian
**Deep Research:** `research/deep-research` skill (computer_use → ChatGPT Deep Research mode)

## 📊 System Report (Midnight)

**Script:** `scripts/gc-system-report.sh`
**Contents:** Git log, system topology, agent status, recent changes, research status, config snapshot
**Screenshots:** Captured daily, deleted after 3 days (auto-cleanup)
**Evidence:** For rollback when system crashes or has problems

## 📄 Agent PRODUCT Files

All 11 agents have PRODUCT.md defining their role, ship, co-worker position, mission, and boundaries:
- `hermes`, `codex`, `opencode`, `zcode`, `kiro`, `copilot`
- `claude`, `antigravity2`, `webmcp`, `planner`, `zai_tui`
**Path:** `.ghostclaw_runtime/PRODUCT/`

```
ghostclaw-master-orchestrator (this)
├── ghostclaw-governance-contracts     → Tier, Capability, Lease, Approval, Receipt
├── ghostclaw-engineering-loop         → Full P000A→P010 pipeline
├── autonomous-loop-engineering        → Auto Tier A/B + cron
├── thaimart-k15-workflow             → K01-K15 + ThaiMart spec
├── ghostclaw-agent-delegation         → Parallel agent dispatch
└── ghostclaw-integration-onboarding   → External tool integration
```

## Standard Operating Procedure

### Phase 1: Audit (always start here)

```bash
cd /Users/sirinx/sirinx-os

# 1. Git status
git status --porcelain | wc -l

# 2. Rust compile
cargo check 2>&1 | grep -E 'error|Finished'

# 3. Key module syntax
for f in packages/types/src/*.mjs services/dev-control-api/server.mjs; do
  node --check "$f" && echo "✅" || echo "❌ $f"
done

# 4. GhostClaw tests (must be 84/84)
npx vitest run packages/types/src/ tests/p0*/ tests/loop-engineering/ 2>&1 | tail -3
```

### Phase 2: Fix (delegate if needed)

```
# If Rust fails → delegate_task to fix imports
# If JS tests fail → delegate_task to fix test files
# If server.mjs breaks → patch immediately, never embed shell in .mjs
```

### Phase 3: Execute (autonomous for Tier A/B)

```bash
# Run auto-loop
node scripts/auto-loop-engineering.mjs

# Or register custom tasks via API
curl -X POST http://localhost:8711/api/thaimart/workflow/create -d '{...}'
```

### Phase 4: Verify + Report

```bash
# Verify chain
node -e "import('./packages/types/src/loop-engineering-workflow.mjs').then(m => { ... })"

# Check cron
# Check tmux windows
tmux list-windows -t ghostclaw
```

## Key Constraints

1. **ThaiMart adapter = disabled_pending_contract** — no network calls
2. **OpenResearcher = LICENSE_GATE BLOCKED** — pattern study only
3. **Cynative = PASS** — read-only infrastructure research ready
4. **No secrets in code** — use secret_ref handles
5. **No commit/push/deploy** without explicit human gate
6. **Tier X = forever blocked** — cookie_export, mfa_bypass, credential_scraping

## Verification Commands

```bash
# Full system check
cargo check && \
npx vitest run packages/types/src/ tests/p0*/ tests/loop-engineering/ && \
node --check services/dev-control-api/server.mjs && \
node scripts/auto-loop-engineering.mjs && \
echo "🎉 ALL SYSTEMS GO"
```

## tmux Quick Reference

```bash
# Attach
tmux attach -t ghostclaw

# Switch to specific window
tmux select-window -t ghostclaw:16    # auto-loop

# Two-digit window (Ctrl+B ' then type number)
```

## Cron Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| auto-loop-engineering | every 5m | Auto-execute Tier A/B tasks |
| cron-disk-check | every 10m | Disk space monitor + auto cleanup when >85% |
| cron-health-check | every 15m | Health check APIs (:3800, :8711), Rust, tests |
| cron-daily-report | 08:00 daily | Generate daily system report JSON |

### Cron Scripts
- `scripts/auto-loop-engineering.mjs` — Loop engine entry point
- `scripts/cron-disk-check.mjs` — Disk usage + cleanup (npm cache, go-build, brew, /tmp)
- `scripts/cron-health-check.mjs` — Service health + Rust compile + GhostClaw test count
- `scripts/cron-daily-report.mjs` — JSON report saved to `data/cron-reports/daily-YYYY-MM-DD.json`

## Agent Role Assignments (user-defined)

| System | Role | Skill | Can Do | Cannot Do |
|--------|------|-------|--------|-----------|
| **Claude Code** | Architect (FIRST) | governance-contracts | Design types, traits, interfaces, schemas, review architecture | Write implementation code |
| **Codex** | Worker (SECOND) | engineering-loop + autonomous-loop | Write code following Claude's contracts, fix bugs, run tests | Push, deploy, skip Approval Gate |
| **OpenCode** | Reviewer (THIRD) | governance-contracts | Review code, security audit, test coverage | Write code, deploy |
| **Hermes** | Commander | master-orchestrator (this) | Dispatch, verify, commit, orchestrate | Write code directly |
| **Auto-Loop** | Autonomous | autonomous-loop-engineering | Execute Tier A/B every 5m, create receipts | Tier D/X, deploy, push |

### Architecture-First Workflow (MANDATORY)

```
1. Claude designs interfaces/types/contracts
2. Codex implements following Claude's contracts
   (independent work like test fixes can run parallel with step 1)
3. OpenCode reviews + security audit
4. Hermes commits + pushes
```

### Skill Installation to All Systems

After creating or updating skills, force-install to all agent systems:

```bash
SRC=~/.hermes/profiles/solis/skills/ghostclaw-os
for T in ~/.codex/skills ~/.claude/skills ~/.opencode/skills \
         /Users/sirinx/sirinx-os/skills \
         /Users/sirinx/sirinx-os/GHOSTCLAW/skills; do
  mkdir -p "$T" && cp -r "$SRC"/* "$T/"
done
```

Also deploy `AGENT_ROSTER.md` defining each system's role to all skill dirs.

## Error Recovery

| Error | Recovery |
|-------|----------|
| Rust compile fails | Check ghostclaw-core lib.rs exports match imports |
| server.mjs syntax | `node --check` — never embed tmux/shell in .mjs |
| vitest transform fails | Check import paths (../../ not ../../../) |
| crypto undefined | Use `import { createHash } from 'node:crypto'` |
| Object.freeze blocks test | Don't freeze top-level return objects |
| **npm install -g timeout / ENOSPC** | **Disk full! `npm cache clean --force && rm -rf ~/.npm/_npx ~/.npm/_cacache`** |
| **npm -g still slow after cleanup** | **Use `git clone --depth=1` + `node bin/xxx.mjs` directly; symlink to `~/.local/bin`** |
| **pnpm global bin not in PATH** | **Use `~/.local/bin` symlink: `ln -sf /path/to/bin.mjs ~/.local/bin/<name>`** |
| **tmux session lost** | **`bash scripts/ghostclaw-tmux.sh` recreates base 14 windows; manually add omniroute, markdownify, auto-loop after** |
| **Services down after tmux restart** | **Start in tmux panes: `tmux send-keys -t ghostclaw:dev-api "cd services/dev-control-api && node server.mjs" Enter`; same for skills-api** |
| **MCP server exits immediately in foreground** | **Normal — MCP uses stdio protocol; test via `echo '{"jsonrpc":"2.0",...}' \| node dist/index.js`** |
| **`markitdown` CLI hangs on stdin** | **Use Python API instead: `.venv/bin/python3 -c "from markitdown import MarkItDown; m=MarkItDown(); print(m.convert('file.md').text_content)"`** |

## Mac Mini M2 Environment Notes

- **Hardware**: Apple M2, 8GB unified memory, 10-core GPU, Metal 4, 228GB disk
- **Disk**: npm caches alone can consume 13GB+; always check `df -h /` before global installs. Target <50% usage.
- **Network**: npm global install consistently times out (5+ min); prefer git clone + local binary
- **Background processes**: use `terminal(background=true, notify_on_complete=true)` for installs; foreground terminal times out at 300s
- **macOS has NO `timeout` command**: Use `terminal(background=true)` + `process(action='poll')` instead. Do NOT use `&` in foreground terminal — it's blocked.
- **Apps installed via .pkg need sudo to remove**: `rm -rf "/Applications/X.app"` fails silently without sudo. Use `sudo rm -rf` or skip.
- **Disk cleanup priority**: `~/.npm/_cacache` (8GB+), `~/.npm/_npx` (4GB+), `~/.codex` (6GB+), go-build cache (782MB), ms-playwright (2.1GB), Google cache (1.6GB)
- **Performance**: OrbStack Docker VM is #1 CPU hog (32.8%), NOT Ollama. See `references/mac-mini-performance-management.md` for full diagnostic + cleanup procedure.

## File Inventory

### v2.0 Systems

#### Neural Architecture
- `scripts/gc-neural-synapse.sh` — Neural Knowledge Architecture [build|sync|status]
- `.ghostclaw_runtime/neural/node-registry.json` — Node registry (11 agents + 6 processes + 10 edges)
- `.ghostclaw_runtime/neural/state-snapshot.json` — Latest neural state snapshot
- `08_AI_MEMORY/Neural Pulse YYYY-MM-DD.md` — Auto-generated daily
- `.ghostclaw_runtime/GC-LOOP-ENGINEERING-v2.md` — Full architecture document

#### Agent Council + Research
- `scripts/gc-council-orchestrator.sh` — Daily council meeting orchestrator
- `scripts/gc-data-researcher.sh` — Data Research sub-agent (bash)
- `scripts/gc-researcher-cycle.py` — Auto research cycle (Python)
- `.ghostclaw_runtime/council-minutes/` — Meeting minutes
- `.ghostclaw_runtime/research/` — Research findings

#### Priority Queue
- `scripts/gc-priority-queue.sh` — P0-P3 priority system
- `.ghostclaw_runtime/queue/` — Queue items

#### System Report
- `scripts/gc-system-report.sh` — Midnight system report + screenshot
- `.ghostclaw_runtime/reports/` — Reports
- `.ghostclaw_runtime/reports/screenshots/` — Screenshots (auto-delete after 3 days)

#### Agent Roles
- `.ghostclaw_runtime/PRODUCT/{agent}.md` — Product files for all 11 agents

#### Skills
- `skills/research/deep-research/SKILL.md` — Deep Research via ChatGPT
- `skills/ghostclaw-os/ghostclaw-agent-council/SKILL.md` — Agent Council

### Legacy Systems

### Governance Layer
- `packages/types/src/ghostclaw-governance.mjs` — Tier, Capability, Lease, Approval, Receipt, Panic
- `packages/types/src/ghostclaw-governance.test.mjs` — 25 negative tests
- `packages/types/src/ghostclaw-threat-model.mjs` — 21 threats

### Worker Layer
- `packages/types/src/worker-interfaces.mjs` — Browser/Cloud/Research + Mocks
- `packages/types/src/worker-interfaces.test.mjs` — 9 tests

### Loop Layer
- `packages/types/src/loop-engineering-workflow.mjs` — Auto-loop engine
- `scripts/auto-loop-engineering.mjs` — Cron entry point
- `tests/loop-engineering/loop-workflow.test.mjs` — 8 tests

### Canary Tests
- `tests/p005-browser-canary/` — 11 tests (prompt injection, UI drift, MFA)
- `tests/p006-cloud-canary/` — 9 tests (dedupe, tier rejection, caps)
- `tests/p007-research-canary/` — 7 tests (citation, pickle, freshness)
- `tests/p008-approval-mock/` — 10 tests (replay, expiry, mismatch)
- `tests/p009-integrated-canary/` — 5 tests (full pipeline)

### Integrations
- `integrations/cynative/cynative` — Binary v1.5.1 (89MB, darwin/arm64)
- `integrations/cynative-connector/index.mjs` — Connector wrapper
- `integrations/omniroute/` — OmniRoute v3.8.48 (CLI ready, npm deps + build done)
- `integrations/markdownify-mcp/dist/index.js` — Markdownify MCP (11 tools, markitdown[all])
- `services/dev-control-api/src/thaimart-k-workflow-engine.mjs` — K01-K15 engine
- `services/dev-control-api/src/cloudflare-deploy-approval.mjs` — Deploy approval

### Infrastructure
- `scripts/ghostclaw-tmux.sh` — 14-window tmux setup (base)
- `scripts/auto-loop-engineering.mjs` — Auto-loop cron entry (every 5m)
- `scripts/cron-disk-check.mjs` — Disk monitor + cleanup (every 10m)
- `scripts/cron-health-check.mjs` — Service health checker (every 15m)
- `scripts/cron-daily-report.mjs` — Daily JSON report generator (08:00)
- `services/dev-control-api/server.mjs` — Dev Control API :8711
- `services/skills-api/src/server-zero-dep.mjs` — Skills API :3800
