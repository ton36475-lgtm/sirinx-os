---
name: ghostclaw-master-orchestrator
description: Master orchestration skill that coordinates all GhostClaw OS subsystems — governance, workflow, agents, infrastructure, and external integrations into one cohesive autonomous system.
version: 1.0.0
---

# GhostClaw Master Orchestrator

## Role

This is the **umbrella skill** that ties together all GhostClaw OS capabilities. Any agent loading this skill knows the full system map, can navigate all subsystems, and can delegate work to parallel agents.

## VERIFIED Mac Mini M2 State (2026-07-16T04:15+07:00)

| Item | Verified Value |
|------|---------------|
| OS | macOS 26.5.2 (arm64) |
| Repo Root | /Users/sirinx/sirinx-os |
| Branch | migration/v5-rebase |
| HEAD | 93db999 |
| GhostClaw Tests | **84/84 PASS** |
| Rust Compile | Finished (0 errors) |
| Skills API :3800 | ✅ ok |
| Dev Control :8711 | ✅ ok |
| Auto-Loop | 3 tasks/cycle, chainValid=true |
| Cron Jobs | **4 active** (loop 5m, disk 10m, health 15m, daily 08:00) |
| tmux Windows | recreated on startup |
| Disk Usage | 44% (15GB free) after cleanup |
| Ollama | disabled (was consuming RAM; user rarely uses) |

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

## Skill Dependency Chain

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

## Parallel Agent Delegation Pattern

When multiple independent tasks exist:

```
delegate_task(goal="Fix Rust errors", context="...", role="leaf")
delegate_task(goal="Fix JS tests", context="...", role="leaf")
# Continue your own work — don't wait
```

Max 3 concurrent subagents. Results auto-deliver.

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
