# GhostClaw OS — Full Automation Master Plan v2
# Generated: 2026-07-16T17:00+07:00
# Mode: MAX_SAFE_AUTO · Brainstorm + Deep Research driven

## 🧠 BRAINSTORM SUMMARY (from all agents + research)

### Key Findings
1. **84/84 GhostClaw tests pass** — governance foundation solid
2. **PROJECT_STATE.md is stale** (dated 2026-07-02, references old staging branch)
3. **12 legacy tests still failing** — low priority but needs cleanup
4. **No Cloudflare worker deployed** — wrangler configs exist but not live
5. **OmniRoute + Markdownify + CLI-Anything ready** but not wired into agent pipeline
6. **ThaiMart K01-K15** — engine exists but adapter disabled (correct)
7. **Services running**: Skills API :3800, Dev Control API :8711 — both healthy
8. **4 cron jobs active** — auto-loop, disk-check, health-check, daily-report
9. **7 skills installed** across Codex, Claude, OpenCode, Repo, GHOSTCLAW
10. **Mac mini M2**: 8GB RAM, 41% disk used, 71% RAM free (optimized)

### Architecture Decision
```
User/Telegram → Hermes Commander → [Brainstorm + Plan]
                                    ↓
                    ┌───────────────┼───────────────┐
                    ↓               ↓               ↓
              Codex (Build)   Claude (Arch)   OpenCode (Review)
                    ↓               ↓               ↓
                    └───────┬───────┘               │
                            ↓                       ↓
                     Auto-Loop Engine         Receipt + Audit
                     (Tier A/B auto)
                            ↓
                     OmniRoute (AI Gateway)
                     Markdownify (Doc→MD)
                     CLI-Anything (Tool access)
```

## 📋 WORK PACKETS (dependency-ordered)

### PACKET P-100: Update PROJECT_STATE.md (Tier A — auto)
- Owner: Hermes
- Goal: Bring PROJECT_STATE.md current with verified state
- Files: PROJECT_STATE.md, NEXT_ACTIONS.md
- Acceptance: Date = 2026-07-16, branch = migration/v5-rebase, all verified facts

### PACKET P-101: Fix 12 Legacy Tests (Tier B — auto after review)
- Owner: Codex
- Goal: Fix remaining 12 failing tests to reach 100% pass
- Files: tests/ghostclaw.test.ts, apps/sirinx-site/scripts/*.test.mjs, services/dev-control-api/src/*.test.mjs
- Acceptance: `npx vitest run` shows 0 failures

### PACKET P-102: Wire OmniRoute as AI Gateway (Tier B)
- Owner: Codex
- Goal: Configure Hermes to route through OmniRoute for free-tier providers
- Files: ~/.hermes/profiles/solis/config.yaml, integrations/omniroute-connector/
- Acceptance: Hermes can use OmniRoute as fallback provider

### PACKET P-103: Wire Markdownify MCP (Tier B)
- Owner: Codex
- Goal: Add Markdownify MCP to Codex/Claude config for document processing
- Files: ~/.codex/config.json, ~/.claude/settings.json
- Acceptance: MCP server listed in agent config

### PACKET P-104: Cloudflare Worker Deploy Prep (Tier B)
- Owner: Claude (architecture review)
- Goal: Verify wrangler configs are deploy-ready, create deploy checklist
- Files: infra/cloudflare/main-router/, apps/sirinx-site/wrangler.jsonc
- Acceptance: `wrangler dry-run` passes for main-router worker

### PACKET P-105: Dev Control API — Missing Endpoints (Tier B)
- Owner: Codex
- Goal: Add missing API endpoints for K01-K15 workflow
- Files: services/dev-control-api/server.mjs, routes/
- Acceptance: All K01-K15 workflow states accessible via API

### PACKET P-106: Skills API — Serve Installed Skills (Tier B)
- Owner: Codex
- Goal: Skills API :3800 serves the 7 GhostClaw skills as JSON
- Files: services/skills-api/src/server-zero-dep.mjs
- Acceptance: GET /api/skills returns all 7 skills

### PACKET P-107: Auto-Loop → OmniRoute Integration (Tier A)
- Owner: Hermes
- Goal: Auto-loop cron uses OmniRoute for AI tasks when possible
- Files: scripts/auto-loop-engineering.mjs
- Acceptance: Auto-loop can route AI requests through OmniRoute

### PACKET P-108: Security Audit (Tier A — read-only)
- Owner: OpenCode (independent review)
- Goal: Scan repo for secrets, PII, hardcoded credentials
- Files: Full repo scan
- Acceptance: Zero secrets found in tracked files

### PACKET P-109: Documentation Sync (Tier A)
- Owner: Hermes
- Goal: Update all docs to reflect current verified state
- Files: AGENTS.md, SKILLS_REGISTRY.md, RELEASE_GATE.md
- Acceptance: All docs match verified system state

## 🔒 QUARANTINED (Tier X — blocked)
- Git push to main/master
- Cloudflare production deploy
- ThaiMart API activation
- Any external send/mutation
- Secret/credential access

## 📊 SUCCESS METRICS
- Tests: 100% pass (currently 84/84 GhostClaw + 12 legacy failing)
- Services: Both APIs healthy
- Disk: <50% used
- RAM: >50% free
- Skills: 7 installed across 5 systems
- Cron: 4 jobs running
