# PROJECT_STATE

Date: 2026-07-17
Last Update: POST-AUDIT-UNIFIED-SKILLS-20260717
Repo: `/Users/sirinx/sirinx-os`
Branch: `migration/v5-rebase`
HEAD: `1b2f3aa`
Runtime mode: local control plane, dry-run only
Canonical protocol: `AGENTS.md`

## Current Verified State (2026-07-17T07:45+07:00)

### System Health
- GhostClaw Tests: 84/84 PASS (pending re-verify)
- Rust Compile: 0 errors
- Skills API :3800: RUNNING
- Dev Control API :8711: RUNNING
- Hermes Gateway :8643-8644: RUNNING (PID 63321)
- Auto-Loop: cron every 5m (active)
- Cron Jobs: 9 active (auto-loop, disk-check, health-check, +6 more)
- Hermes: v0.18.2, 12 profiles, solis active

### Resources
- Mac mini M2: 8GB RAM, arm64, macOS 26.5.2
- Disk: 53% used (11GB free) — cleaned from 58%/8.8GB
- Load avg: 4.14
- Uptime: 4h+

### CLI Tools
- Codex: 0.144.5 (Rust) — `/Users/sirinx/.local/bin/codex`
- Hermes: v0.18.2
- Claude Code: 2.1.211
- OpenCode: 1.17.11
- Node: v26.0.0, pnpm: 9.0.0, Bun: 1.3.14

### Unified Skills Registry
- Total unique: 188 skills across 5 agents
- Hermes: 143 (+13 synced from Codex = 156)
- Codex: 59
- Claude: 15
- OpenCode: 7
- GhostClaw: 7 (core, shared across ALL agents)
- Shared 4+ agents: 7 (GhostClaw core)
- Registry: `config/unified-skills-registry.json`
- New skill: `telegram-approval-workflow` (automation)

### A2A Queue (Post-Fix)
- Inbox: 22 pending
- Outbox: 103 sent
- Done: 8 completed
- Blocked: 0 (24 archived — bridge FIXED)
- Approvals: 5 pending
- Bridge status: FIXED (codex exec, hermes chat -q, correct flags)

### Integrations
- OmniRoute v3.8.48 — CLI ready, dev server OFFLINE (needs start)
- Markdownify MCP — venv cleaned (needs reinstall for use)
- Cynative v1.5.1 — binary ready (112MB)
- ThaiMart K01-K15 — disabled_pending_contract

### Security
- No secrets in tracked files
- .env ignored by git
- PII masking in all logs
- Dry-run only mode
- No push, cloud mutation, or customer messaging without explicit human gate
- No human gate bypass for any Tier C action
- A2A bridge fixed (was using wrong CLI paths/flags)

### Pending Work
- P-101: Fix legacy tests
- P-102: Wire OmniRoute as AI gateway (server offline)
- P-103: Wire Markdownify MCP (venv cleaned, needs reinstall)
- P-104: Cloudflare deploy prep
- P-105: Dev Control API missing endpoints
- P-106: Skills API serve skills as JSON
- P-108: Security audit
- NEW: Reinstall markdownify-mcp venv
- NEW: Start OmniRoute dev server
- NEW: Fix Cline (spawnSync error)

### SRL Status
- Mac Live Agent Studio: SRL-2
- SIRINX OS overall: SRL-2
- GhostClaw OS Core: SRL-2
- Target: SRL-3 (dry-run integrated)

### Safety Status
- External writes remain blocked by default.
- No customer messaging bypassing the human gate
- Dry-run only mode active across all integrations.

### Stop Rules
- STOP on repeated failure (3+ consecutive task failures)
- STOP on cost budget exceeded ($5/goal default)
- STOP on safety scan failure (secret/PII detected)
- STOP on missing approval for Tier C action
- STOP on disk space <5GB
- STOP on RAM pressure >90%
