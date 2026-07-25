# Technology Migration Inventory

> Generated: 2026-07-24
> Scope: `/Users/sirinx/sirinx-os` (sirinx-os monorepo)
> Purpose: Map what's Rust, Go, Node/TS, and Python — system role, dependencies, migration state.

---

## 1. 🦀 RUST — Already Migrated / Active Target

**66 `.rs` source files** across 3 workspaces. Validated: 167 tests pass, clippy clean, fmt clean.

### 1.1 Root Workspace (`/Cargo.toml`) — GhostClaw Control Plane

| Crate | Role | Dependencies |
|-------|------|--------------|
| `crates/ghostclaw-core` | Core orchestrator — task routing, state machine | tokio, axum, serde |
| `crates/ghostclaw_migration_core` | P100/P101 migration engine — command parser, policy guard, lane router, receipt store, redaction | tokio, serde, clap |
| `crates/ghostclaw-providers` | LLM provider abstraction layer | tokio, reqwest, serde |
| `crates/ghostclaw-hermes` | Hermes agent runtime integration | tokio, serde |
| `crates/ghostclaw-telegram` | Telegram gateway (Rust port of the Node gateway) | tokio, serde, reqwest |
| `crates/ghostclaw-mcp` | MCP server implementation | tokio, axum |
| `crates/gc-runtime-core` | Neural core — embedding, vector store, search, harness training (zero-heavy-deps, mmap) | tokio |

### 1.2 Hermes v5 Worker Workspace (`services/orchestrator/`)

| Crate | Role | Status |
|-------|------|--------|
| `crates/hermes-core` | Core runtime for Hermes worker | Active |
| `crates/hermes-dispatch` | Task dispatch engine | Active |
| `crates/hermes-feed` | Feed processing | Active |
| `crates/hermes-governance` | Approval gating / governance | Active |
| `crates/hermes-lock` | Distributed locking | Active |
| `crates/hermes-router` | Task routing | Active |
| `crates/hermes-worker` | Hermes worker process | Active |

Package `@sirinx/hermes-v5-worker` — deploys as Cloudflare Worker / local binary.

### 1.3 GhostClaw OS Workspace (`ghostclaw-os/`)

| Crate | Role |
|-------|------|
| `crates/core` | Duplicate/sibling of ghostclaw-core |
| `crates/providers` | LLM providers |
| `crates/worker` | `ghostclaw-worker` binary |
| `crates/hermes` | Hermes integration (duplicate/parallel) |
| `crates/mcp-server` | MCP server (duplicate/parallel) |
| `crates/telegram` | Telegram (duplicate/parallel) |
| `crates/adapters/thaimart` | ThaiMart K01-K15 adapter (disabled_pending_contract) |

### 1.4 Research

| Crate | Role |
|-------|------|
| `research/latentmas/crates/katgpt-orchestrator` | Research orchestrator |
| `research/latentmas/crates/latent-protocol` | Research protocol layer |

### 1.5 Migration Validation Status (from scan receipts)

| Gate | P100 (Jul 7) | P101 (Jul 14) |
|------|-------------|---------------|
| `cargo test` | 161/161 PASS | 167/167 PASS |
| `cargo clippy` | PASS (deny warnings) | PASS |
| `cargo fmt` | PASS | PASS |
| `cargo build` | PASS | PASS |
| Next gate | `P100A_SCOPED_RUST_CORE_COMMIT_GATE` | `P101_OPENCODE_REVIEW_RUST_ADAPTER_EXTRACTION` |

**Key finding**: Rust is the **primary migration target**. The `ghostclaw_migration_core` crate is the designated first migration path. Codex CLI is itself a Rust binary (v0.144.5).

---

## 2. 🐹 GO — Minimal Presence (Needs Assessment)

**1 `.go` source file** in the entire repo.

| Module | Path | Role | Files | Status |
|--------|------|------|-------|--------|
| `github.com/ton36475-lgtm/sirinx-os/go/gc-orch` | `go/gc-orch/` | Orchestrator scaffold | 1 (`main.go`) | Skeleton — single main.go, no active logic |

### Notes
- The architecture diagram from prior sessions references a "Go Layer" (Swarm Workers, Node Communication, API Gateway) but **no substantive Go implementation exists** in this repo.
- `services/orchestrator-go/` exists but contains **Python files** (fleet automation scripts), not Go.
- **Decision needed**: If the Go layer concept is still desired, it must be rebuilt from scratch. Recommendation: consider Rust's tokio-based concurrency as a Go alternative.

---

## 3. 🟢 NODE.JS / TYPESCRIPT — Dominant Language, Migration Target

**~5,474 `.ts` + ~475 `.tsx` + ~849 `.mjs` + ~54 `.js`** source files.

### 3.1 Apps (10 web apps, pnpm workspace)

| App | Package | Role | Migration Priority |
|-----|---------|------|-------------------|
| `apps/sirinx-site` | `@sirinx/site` | Public website (www.sirinx.co) | **LOCKED** — do not migrate |
| `apps/solar-intelligence` | `@sirinx/solar-intelligence` | Solar data intelligence dashboard | Medium |
| `apps/dev-dashboard` | `@sirinx/dev-dashboard` | Developer command center UI | Low |
| `apps/centerbrain-shell` | `@sirinx/centerbrain-shell` | Central brain shell UI | Low |
| `apps/enterprise-ai-company` | `@sirinx/enterprise-ai-company` | Enterprise AI landing page | Low |
| `apps/agm-site` | `@agm/site` | AGM Creative website | Low |
| `apps/agm-autoglow-dashboard` | `@sirinx/agm-autoglow-dashboard` | AGM dashboard | Low |
| `apps/kusala-site` | `@kusala/site` | Kusala brand site | Low |
| `apps/merch-dashboard` | `@merch/dashboard` | Merch dashboard | Low |
| `apps/phitsanulok-news` | `@phitsanulok/news` | Phitsanulok news site | Low |
| `apps/pocket-hatchery` | (no package.json) | Agent factory / AI incubation | Low |
| `apps/cloudflare-agent-team` | (no package.json) | Cloudflare agent team prototype | Low |
| `apps/live-agent-studio` | (no package.json) | Live agent studio | Low |

### 3.2 Services (14 services)

| Service | Path | Role | Tech | Migration Priority |
|---------|------|------|------|-------------------|
| Orchestrator | `services/orchestrator/` | Hermes v5 worker (Node+Rust hybrid) | `.ts` + Rust crates | Partially done |
| Dev Control API | `services/dev-control-api/` | Project inventory, deployment control | `.mjs` | Medium |
| Skills API | `services/skills-api/` | Skills registry serving | `.ts` | Low |
| News API | `services/news-api/` | News content API | `.ts` | Low |
| Hermes API | `services/hermes-api/` | Hermes management API | `.ts` | Low |
| Telegram Gateway | `services/telegram-gateway/` | Telegram message gateway | `.ts` | **Rust port exists** (`crates/ghostclaw-telegram`) |
| API Gateway | `services/api-gateway/` | Public API gateway | `.ts` | Medium |
| Edge Gateway | `services/edge-gateway/` | Edge/latency gateway | `.ts` | Low |
| LatentMAS Gateway | `services/latentmas-gateway/` | Node wrapper around Rust LatentMAS | `.ts` | Already wraps Rust |
| Media Factory | `services/media-factory/` | Media processing service | `.ts` | Low |
| Postgres State | `services/postgres-state/` | PostgreSQL state persistence | `.ts` | Low |
| Command Center | `services/command-center/` | Command dispatch center | `.ts` | Rust Cargo.toml exists |
| Orchestrator Go | `services/orchestrator-go/` | Python fleet automation (misnamed) | `.py` | N/A |
| Telegram Gateway | `services/telegram-gateway/` | Telegram bot | `.ts` | Rust port in progress |

### 3.3 Packages (15 shared packages)

| Package | Role |
|---------|------|
| `packages/policy-core` | Policy engine (has Rust counterpart in migration) |
| `packages/clawforge-adapter` | Adapter for ClawForge tooling |
| `packages/content-factory` | Content generation pipeline |
| `packages/autoglow-core` | Auto-glow core library |
| `packages/security` | Security utilities |
| `packages/database` | ORM / DB access layer (Drizzle) |
| `packages/config` | Shared configuration |
| `packages/types` | Shared TypeScript types |
| `packages/ui` | Shared UI components |
| `packages/logger` | Logging library |
| `packages/asset-registry` | Asset registry (prohibited-phrases scanning) |
| `packages/skills-kit` | Skills kit library |
| `packages/async-core` | Async utilities |
| `packages/workflows` | Workflow UIs (obra, etc.) |
| `packages/langchain-config` | LangChain configuration |

---

## 4. 🐍 PYTHON — Scripting & Research Layer

**~2,107 `.py` source files.**

| Area | Role | Migration Priority |
|------|------|-------------------|
| `GHOSTCLAW/P101/tools/p101/` | P101 policy tools, repo inventory, quality gates | **High** — first Rust migration target |
| `services/orchestrator-go/` | Fleet automation (sovereign fleet scripts) | Low |
| `research/latentmas/python/` | Research experiments | None — research |
| `_skills_boost/` | Skills boost / cookbook content | None |
| `a2a-sync-omniroute/` | A2A sync queue utilities | Low |

---

## 5. INFRASTRUCTURE & TOOLING

| Component | Tech | Role |
|-----------|------|------|
| Cloudflare Workers | JS/TS (`.mjs`) | main-router, agent-team, image optimizer |
| Prisma/MySQL | SQL | Database (Drizzle ORM via Node.js) |
| Infra scripts | Shell (`.sh`) | Deployment, secrets, stack management |
| pnpm workspace | Node.js | Monorepo orchestration |

---

## 6. MIGRATION ROADMAP (High-Level)

```
PRIORITY 1 — Python → Rust
  GHOSTCLAW/P101/tools/ → crates/ghostclaw_migration_core (DONE: contracts validated)
      
PRIORITY 2 — TS/Node services with Rust counterparts → consolidate
  services/telegram-gateway (TS) ← crates/ghostclaw-telegram (Rust)
  services/orchestrator (TS)    ← services/orchestrator/crates/* (Rust)  [PARTIAL]

PRIORITY 3 — Go decision point
  Go concept exists in architecture docs but NO code exists.
  Option A: Rebuild in Go (concurrent worker layer)
  Option B: Use Rust tokio/actix instead (recommended — already invested)

PRIORITY 4 — TS apps (frontend layers)
  Most apps are React/Tailwind frontends — NOT migration candidates.
  Only migrate backend logic (APIs, gateways, DB access).
```

---

## 7. SUMMARY COUNTS

| Language | Files (clean scope) | Role | Migration Status |
|----------|---------------------|------|-----------------|
| **Rust** | 66 `.rs` | Core, Orchestration, Migration | ✅ Active target, validated |
| **Go** | 1 `.go` | (skeleton) | ❌ Not implemented |
| **TypeScript** | ~5,474 `.ts` | Apps, Services, Packages | 🔄 Partial migration |
| **TSX** | ~475 `.tsx` | Frontend React components | 🟢 Keep (no migration) |
| **JavaScript** | ~54 `.js` + ~849 `.mjs` | Scripts, Workers | 🟡 Some to Rust |
| **Python** | ~2,107 `.py` | P101 tools, fleet scripts, research | 🔄 First migration target |

---

*Generated from: workspace scan + P100/P101 validation receipts + project-inventory audit.*
