# GhostClaw OS — Full Automation Master Plan v3
# Claude-First Architecture → Codex Worker Implementation
# Generated: 2026-07-16T17:15+07:00
# Research: Deep gap analysis + brainstorm from all agents

## 🏗️ ARCHITECTURE PRINCIPLE

```
Claude Code (Architect) — FIRST: designs interfaces, contracts, types, schemas
    ↓ hands off blueprints
Codex (Worker) — IMPLEMENTS: fills in code following Claude's contracts
    ↓ hands off for review  
OpenCode (Reviewer) — REVIEWS: tests, security audit, quality gate
    ↓ hands off approval
Hermes (Commander) — ORCHESTRATES: dispatches, verifies, commits
```

**Key change from v2:** Claude goes FIRST to define all interfaces/types/schemas BEFORE Codex writes any implementation code. This prevents integration failures.

## 📋 RESTRUCTURED WORK PACKETS

### ═══ PHASE 1: CLAUDE ARCHITECTURE (must complete first) ═══

### ARCH-01: Rust Crate Contracts (Claude)
- Define trait signatures for ghostclaw-core, ghostclaw-hermes, ghostclaw-mcp
- Create `crates/*/src/lib.rs` with proper types, traits, error types
- NO implementation bodies — just `unimplemented!()` stubs with doc comments
- Files: crates/ghostclaw-core/src/*.rs, crates/ghostclaw-hermes/src/*.rs

### ARCH-02: npm Package Contracts (Claude)
- Define TypeScript interfaces for empty packages
- `packages/config/src/index.ts` — Config schema types
- `packages/logger/src/index.ts` — Logger interface + pino wrapper
- `packages/security/src/index.ts` — PII masker, secret scanner types
- `packages/ui/src/index.ts` — Component prop types
- Files: packages/*/src/index.ts

### ARCH-03: Dead Route Wiring Plan (Claude)
- Document exact wiring needed for routes/agents.ts, routes/a2a-sync.ts, routes/thaimart-workflow.mjs
- Create import plan for server.mjs
- Files: services/dev-control-api/routes/

### ARCH-04: Message Bus Schema (Claude)
- Design SQLite schema for A2A message bus
- Define packet format, queue table, receipt chain table
- Files: packages/types/src/message-bus-schema.mjs

### ═══ PHASE 2: CODEX IMPLEMENTATION (parallel after ARCH done) ═══

### BUILD-01: Implement Rust Crates (Codex)
- Follow ARCH-01 contracts
- ghostclaw-core: implement advance(), launch_gate, agent_driver
- ghostclaw-hermes: implement axum routes with real logic
- ghostclaw-telegram: implement teloxide bot
- ghostclaw-mcp: implement MCP server protocol
- Acceptance: `cargo test` passes

### BUILD-02: Implement npm Packages (Codex)
- Follow ARCH-02 contracts
- config: env parser + validation
- logger: structured JSON logger
- security: PII masker implementation
- ui: base component exports
- Acceptance: all packages export working functions

### BUILD-03: Wire Dead Routes (Codex)
- Follow ARCH-03 plan
- Import routes/agents.ts into server.mjs
- Import routes/a2a-sync.ts into server.mjs
- Import routes/thaimart-workflow.mjs into server.mjs
- Acceptance: all endpoints return real data

### BUILD-04: Fix 12 Legacy Tests (Codex)
- Run npx vitest run, fix each failure
- Acceptance: 0 failures

### BUILD-05: OmniRoute Integration (Codex)
- Wire Hermes config to use OmniRoute as fallback
- Configure free-tier-first routing
- Acceptance: Hermes can route through OmniRoute

### BUILD-06: Markdownify MCP Config (Codex)
- Add MCP config to ~/.codex/config.json
- Add MCP config to ~/.claude/settings.json
- Acceptance: agents can use markdownify tools

### ═══ PHASE 3: OPENCODE REVIEW (after BUILD done) ═══

### REVIEW-01: Security Audit (OpenCode)
- Scan for secrets, PII, hardcoded credentials
- Verify .env is ignored
- Acceptance: zero findings

### REVIEW-02: Test Coverage Audit (OpenCode)
- Identify 27 untested modules
- Create test stubs for critical ones
- Acceptance: test coverage > 80%

### REVIEW-03: Integration Review (OpenCode)
- Verify all routes wired correctly
- Check receipt chain integrity
- Acceptance: full pipeline e2e test passes

### ═══ PHASE 4: HERMES ORCHESTRATION ═══

### ORCH-01: Update PROJECT_STATE (Hermes) ✅ DONE
### ORCH-02: Wire OmniRoute into Auto-Loop (Hermes)
### ORCH-03: Final Commit + Push (Hermes)

## 🚀 DISPATCH SEQUENCE

```
Step 1: Claude designs ARCH-01 through ARCH-04 (30 min)
    ↓
Step 2: Codex implements BUILD-01 through BUILD-06 (parallel, 1-2 hours)
    ↓
Step 3: OpenCode reviews REVIEW-01 through REVIEW-03 (30 min)
    ↓
Step 4: Hermes verifies, commits, pushes (5 min)
```

## 🔒 QUARANTINED (Tier X)
- Git push to main/master
- Cloudflare production deploy
- ThaiMart API activation
- Any external send/mutation
