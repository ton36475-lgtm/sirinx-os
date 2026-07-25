# SIRINX OS GC Fleet — E2E Orchestration DAG
**Blueprint:** Claude Opus 4.8 Architecture (Thai spec)
**Branch:** migration/v5-rebase
**Date:** 2026-07-24
**Fleet Status:** 6 Active / 5 Standby / 170 dirty files / 0 commits backlog

---

## 0. ORCHESTRATION MODEL

### 0.1 Agent Role Map

| Agent | Role | Authority | Lane | Gate |
|-------|------|-----------|------|------|
| **Hermes** | Commander | Dispatch, commit, escalate | GHOSTCLAW/** | Human approval for push/deploy |
| **Claude** | Architect | Design interfaces, schemas, contracts | crates/**/docs/** | Design review by Hermes |
| **OpenCode** | Checker/QA | Security scan, test audit, style check | tests/** | Source mutation blocked |
| **zcode** | Arch Review | Review architecture plans, gap analysis | docs/architecture/** | Read-only |
| **planner** | Planner | Break goals into task packs | _A2A_QUEUE/plans/** | No source mutation |
| **webmcp** | Web MCP | Web data fetch, API integration | config/webmcp/** | External fetch only |

### 0.2 Workflow Pattern (Spec-First)

```
PHASE GOAL → SPEC (Claude/zcode) → TASK DAG (planner) → IMPLEMENT (Hermes/Codex) → VERIFY (OpenCode) → COMMIT (Hermes)
                                                              ↓ if blocked
                                                        ESCALATE → Claude re-design → retry or pause
```

### 0.3 Phase Machine (State Transitions)

```
[PENDING] → [IN_SPEC] → [SPEC_APPROVED] → [IN_IMPLEMENTATION] → [IN_VERIFY] → [COMPLETED]
   ↑              │                          ↓                      ↓              │
   └── [CANCELLED] └── [SPEC_REJECTED]──→ [BLOCKED] ←────→ [FAILED] ←────────────┘
                                                │
                                           [ESCALATED] → [RE_DESIGN] → [IN_SPEC]
```

### 0.4 Failure Handling Matrix

| Failure Type | Auto-Retry | Escalate To | Pause Component? |
|---|---|---|---|
| Test failure | 1 retry (re-run) | OpenCode review | No — isolate test |
| Compile error | 0 (fix required) | Architect (Claude) | Yes — affected crate |
| Spec rejection | 0 | Planner → Claude | Yes — task blocked |
| Agent timeout | 2 retries (5s → 15s → 30s) | Hermes | Yes — agent paused |
| Dependency unavailable | 3 retries (30s exponential) | webmcp (check endpoint) | No — retry later |
| Gate check fail | 0 | Hermes + Human | Yes — phase paused |
| Parallel conflict | 0 | Hermes (merge resolve) | No — isolated lane |

---

## ════════════════════════════════════════════════════════════════
## PHASE 0: FOUNDATION — REPO HYGIENE & QUEUE SYNC (P0 URGENT)
## ════════════════════════════════════════════════════════════════

**Goal:** Clean 170 dirty files, sync bash queue → Go gc-orch, establish commit discipline.

### Sprint 0A: Queue Sync & State Capture (1-2h)

| ID | Task | Agent | Deps | Spec | Success Criteria | Effort | Rollback |
|-----|------|-------|------|------|-----------------|--------|---------|
| **T0A-01** | Audit bash queue → Go gc-orch queue mapping | zcode | — | Read `gc-priority-queue.sh` + gc-orch `main.go`, document mapping gaps | Queue mapping doc in `_A2A_QUEUE/sync-plan.md` | 30min | `git checkout -- _A2A_QUEUE/*` |
| **T0A-02** | Spec: Queue sync migration contract | Claude | T0A-01 | Write adapter contract for `QueueBridge` trait in Rust + Go | `crates/ghostclaw_migration_core/docs/QUEUE_BRIDGE_SPEC.md` | 30min | — |
| **T0A-03** | Migrate P0 queue items to gc-orch | Hermes | T0A-02 | POST `/queue` for each P0 bash queue item | gc-orch shows all P0 items, zero in bash queue | 15min | Replay from gc-orch backup |
| **T0A-04** | Script agent discovery: pgrep → gc-orch agent list | OpenCode | T0A-01 | `agent_alignment.rs` → verify all 6 active agents found | gc-orch `/agents` returns 6 running, 5 standby | 20min | Revert agent_alignment.rs |
| **T0A-05** | Verify gc-orch running on :8721, bridge tick active | webmcp | T0A-03 | `curl :8721/status` returns valid JSON | Response: `agent_count>=6`, `version: gc-orch v0.1.0` | 5min | — |

### Sprint 0B: 170 Dirty Files — Staged Commit (2-4h)

| ID | Task | Agent | Deps | Spec | Success Criteria | Effort | Rollback |
|-----|------|-------|------|------|-----------------|--------|---------|
| **T0B-01** | Classify 170 dirty files into 4 categories | planner | — | Read `git diff --stat`, categorize: (A) completed new modules, (B) docs, (C) config changes, (D) deleted files | Category list in `_A2A_QUEUE/plans/commit-categories.md` | 20min | — |
| **T0B-02** | Visual review of Category A (new Rust crates + ghostclaw agent files) | OpenCode | T0B-01 | Scan for: secrets, debug prints, TODOs, test orphans | Review report with 0 critical findings | 30min | `git checkout -- <files>` |
| **T0B-03** | Visual review of Category B (docs, skills, plans) | OpenCode | T0B-01 | Check for stale references, broken links, Thai/English consistency | Review report | 20min | — |
| **T0B-04** | Build & test Category A changes | OpenCode | T0B-02 | `cargo test` passes, `cargo clippy -- -D warnings` | All 141+ tests pass, 0 clippy warnings | 30min | Fix warnings before commit |
| **T0B-05** | Batch commit: Category A + B (safe docs + completed code) | Hermes | T0B-03, T0B-04 | `git add -A && git commit -m "P0: completed modules + docs"` | Commit hash, no dirty files in A/B | 5min | `git reset HEAD~1` |
| **T0B-06** | Review Category C (config changes — env, model router, Cargo.lock) | zcode | T0B-01 | Check for: port conflicts, API key placeholders, env.example consistency | Config review passes | 20min | — |
| **T0B-07** | Review Category D (deleted audit docs — 8 files) | Hermes | T0B-01 | Confirm deletions are intentional, no required references lost | Deletion list with justification | 5min | `git checkout HEAD -- <files>` |
| **T0B-08** | Batch commit: Category C + D | Hermes | T0B-06, T0B-07 | `git commit -m "P0: config updates + audit cleanup"` | Zero dirty files remaining | 5min | `git reset HEAD~1` |

### Checkpoint CP-0: CLEAN REPO
- [ ] `git status --short` = 0 lines
- [ ] gc-orch :8721 responds with agent_count=6+
- [ ] Queue synced — bash queue empty, Go queue populated
- [ ] If ANY compile error → BLOCK Sprint 0B, escalate to Claude

---

## ════════════════════════════════════════════════════════════════
## PHASE 1: PRODUCT DOCUMENTATION (P1 — SPEC-FIRST)
## ════════════════════════════════════════════════════════════════

**Goal:** Create PRODUCT.md for 4 core agents (kiro, codex, copilot, opencode) + architecture-level docs for all migration targets.

### Sprint 1A: PRODUCT.md for Core Agents (2-3h)

| ID | Task | Agent | Deps | Spec | Success Criteria | Effort | Rollback |
|-----|------|-------|------|------|-----------------|--------|---------|
| **T1A-01** | Spec: PRODUCT.md template + content requirements | Claude | CP-0 | Define: section structure (purpose, architecture, APIs, data flow, migration path, resource budget, testing) for all 4 agents | `docs/templates/PRODUCT_TEMPLATE.md` | 20min | `git rm` template |
| **T1A-02** | RESEARCH: Usage patterns & integration points for kiro | webmcp | T1A-01 | Search codebase for `kiro` references, existing docs, config | Research note in `_A2A_QUEUE/research/kiro-patterns.md` | 20min | — |
| **T1A-03** | RESEARCH: Usage patterns & integration points for codex | webmcp | T1A-01 | Search codebase for codex references, A2A patterns, test docs | Research note | 15min | — |
| **T1A-04** | RESEARCH: copilot + opencode integration points | webmcp | T1A-01 | Parallel research for both agents | Research notes for both | 20min | — |
| **T1A-05** | Write PRODUCT.md for kiro | planner | T1A-02 | Draft doc following template — no code changes | `docs/products/PRODUCT_kiro.md` | 30min | `git rm` |
| **T1A-06** | Write PRODUCT.md for codex | planner | T1A-03 | Draft doc following template | `docs/products/PRODUCT_codex.md` | 30min | `git rm` |
| **T1A-07** | Write PRODUCT.md for copilot | planner | T1A-04 | Draft doc following template | `docs/products/PRODUCT_copilot.md` | 30min | `git rm` |
| **T1A-08** | Write PRODUCT.md for opencode | planner | T1A-04 | Draft doc following template | `docs/products/PRODUCT_opencode.md` | 30min | `git rm` |
| **T1A-09** | Review ALL 4 PRODUCT.md for accuracy & consistency | zcode | T1A-05..T1A-08 | Cross-check with actual codebase state, flag discrepancies | Review report with 0 action items | 20min | — |
| **T1A-10** | Fix PRODUCT.md review findings | planner | T1A-09 | Apply zcode fixes | All 4 docs final | 15min | — |
| **T1A-11** | Final commit: 4 PRODUCT.md + template | Hermes | T1A-10 | `git commit -m "P1: agent PRODUCT.md complete"` | Commit hash | 5min | `git reset HEAD~1` |

### Checkpoint CP-1: PRODUCT DOCS
- [ ] 4 PRODUCT.md files in `docs/products/`
- [ ] zcode review passed with 0 critical findings
- [ ] All 4 documents follow the template
- [ ] If any doc references non-existent APIs → BLOCK, Claude re-specs

---

## ════════════════════════════════════════════════════════════════
## PHASE 2: ARCHITECTURE PLANNING — ZCODE REVIEW + PHASE 3 PREP (P3)
## ════════════════════════════════════════════════════════════════

**Goal:** zcode reviews current architecture, identifies gaps, creates Phase 3A/B/C execution plans.

### Sprint 2A: Architecture Review (2-3h)

| ID | Task | Agent | Deps | Spec | Success Criteria | Effort | Rollback |
|-----|------|-------|------|------|-----------------|--------|---------|
| **T2A-01** | Spec: Architecture review scope document | Claude | CP-1 | Define which components to review: Rust core, Go bridge, script layer, agent fleet, migration status | `docs/architecture/SCOPE_REVIEW.md` | 20min | — |
| **T2A-02** | Full architecture review: Rust crates (gc-runtime-core, ghostclaw-*) | zcode | T2A-01 | Read all Cargo.toml + src/*.rs + tests, assess: completeness, safety, migration readiness per crate | Review report in `docs/reviews/ARCH_REVIEW_RUST.md` | 60min | — |
| **T2A-03** | Architecture review: Go bridge (gc-orch) | zcode | T2A-01 | Read main.go, assess: HTTP API completeness, queue bridge, agent discovery | Review report `docs/reviews/ARCH_REVIEW_GO.md` | 30min | — |
| **T2A-04** | Architecture review: Script layer (bash shell scripts) | zcode | T2A-01 | Read all `scripts/gc-*`, assess: migration to Go/Rust priority | Review report `docs/reviews/ARCH_REVIEW_SCRIPTS.md` | 30min | — |
| **T2A-05** | Architecture review: Agent fleet (6 active, 5 standby) | zcode | T2A-01 | Assess: lane assignments, A2A2A protocol, gap detection | Review report `docs/reviews/ARCH_REVIEW_AGENTS.md` | 30min | — |
| **T2A-06** | Gap analysis synthesis: architecture gaps, risks, priorities | Claude | T2A-02..T2A-05 | Merge 4 review reports into single gap analysis with ranked priorities | `docs/architecture/GAP_ANALYSIS.md` | 30min | — |
| **T2A-07** | Spec: Phase 3A execution plan (PRIMARY migration) | Claude | T2A-06 | Detailed plan: which Python/Node modules migrate to Rust first, adapter specs | `docs/plans/PHASE_3A_MIGRATION.md` | 45min | — |
| **T2A-08** | Spec: Phase 3B execution plan (SECONDARY migration) | Claude | T2A-06 | Secondary migration targets (TypeScript → Rust/Go), routing refactor | `docs/plans/PHASE_3B_MIGRATION.md` | 45min | — |
| **T2A-09** | Spec: Phase 3C execution plan (SELF-EVOLUTION) | Claude | T2A-06 | Harness → gap analysis → improvement loop, 1-hour auto-evolution cycle | `docs/plans/PHASE_3C_EVOLUTION.md` | 45min | — |
| **T2A-10** | Review Phase 3A/B/C plans for feasibility | zcode | T2A-07..T2A-09 | Cross-check plans against actual codebase, flag unrealistic timelines | Review report | 30min | — |
| **T2A-11** | Archive: move old audit docs to archive/ | Hermes | T2A-10 | `mkdir -p docs/archive && mv docs/audit/*.md docs/archive/` | Clean `docs/audit/` (empty or index only) | 10min | `mv docs/archive/* docs/audit/` |
| **T2A-12** | Commit: all architecture reviews + plans | Hermes | T2A-10, T2A-11 | `git commit -m "P2: architecture review + Phase 3 plans complete"` | Commit hash | 5min | `git reset HEAD~1` |

### Checkpoint CP-2: ARCHITECTURE REVIEW COMPLETE
- [ ] 4 component reviews (Rust, Go, Scripts, Agents) with pass/fail per component
- [ ] Gap analysis with ranked priorities (P0-P3 per finding)
- [ ] Phase 3A/B/C execution plans approved by zcode
- [ ] All old audit docs moved to archive
- [ ] If ANY plan has >3 unrealistic items → Claude re-specs, zcode re-reviews

---

## ════════════════════════════════════════════════════════════════
## PHASE 3: CODEBASE MIGRATION — NODE/PYTHON → RUST/GO (P4)
## ════════════════════════════════════════════════════════════════

**Goal:** Execute migration per Claude's Phase 3A/B/C specs. PRIMARY: Python→Rust. SECONDARY: TypeScript→Rust/Go. EVOLUTION: Self-evolution loop.

### Sprint 3A: Python → Rust Migration (PRIMARY — 3-5h)

| ID | Task | Agent | Deps | Spec | Success Criteria | Effort | Rollback |
|-----|------|-------|------|------|-----------------|--------|---------|
| **T3A-01** | Inventory: identify all 2,107 Python files for migration priority | webmcp + planner | CP-2 | `find . -name "*.py" | grep -v __pycache__ | grep -v .venv | grep -v node_modules > python-inventory.txt` | Classified inventory (A=migrate, B=wrap, C=keep) | 30min | — |
| **T3A-02** | Spec: Python→Rust adapter contracts for top 10 modules | Claude | T3A-01 | Define: trait signatures, error types, JSON-LD protocol for each module | `crates/gc-runtime-core/docs/PYTHON_ADAPTERS.md` | 60min | — |
| **T3A-03** | Implement: migrate first 3 Python scripts to Rust | Hermes (supervising Codex) | T3A-02 | Follow Claude's contracts, implement `unimplemented!()` → real code | 3 new Rust modules, `cargo test` passes | 120min | `git revert` commit |
| **T3A-04** | Implement: migrate next 3 Python scripts to Rust | Hermes (supervising Codex) | T3A-02, T3A-03 | Same pattern, iterate | 3 more Rust modules, 0 new compile errors | 90min | `git revert` |
| **T3A-05** | Test: Python-oracle parity tests for migrated modules | OpenCode | T3A-03, T3A-04 | Run Python original + Rust replacement on same inputs, compare outputs | Parity test report: 100% match | 30min | — |
| **T3A-06** | Spec: adapter traits for remaining migration (queue, lease, validator) | Claude | T3A-02 | Expand `ghostclaw_migration_core` adapter traits | Updated adapter module + docs | 30min | — |
| **T3A-07** | Review + fix migration code | OpenCode | T3A-03..T3A-05 | Clippy warnings, safety checks, test coverage | 0 warnings, coverage >70% | 30min | — |
| **T3A-08** | Commit: Phase 3A migration | Hermes | T3A-07 | `git commit -m "P3A: Python→Rust migration complete"` | Commit hash | 5min | `git reset HEAD~1` |

### Sprint 3B: TypeScript → Rust/Go (SECONDARY — 2-4h)

| ID | Task | Agent | Deps | Spec | Success Criteria | Effort | Rollback |
|-----|------|-------|------|------|-----------------|--------|---------|
| **T3B-01** | Inventory: identify TypeScript 5,474 .ts + 475 .tsx migration candidates | webmcp + planner | CP-2 | Classify: services, routes, UI components, config, tests | Migration priority list | 20min | — |
| **T3B-02** | Spec: TypeScript→Rust service contracts | Claude | T3B-01 | Define: service traits, async patterns (tokio), HTTP handlers | `docs/architecture/TS_RUST_CONTRACTS.md` | 45min | — |
| **T3B-03** | Spec: TypeScript→Go route migration plan | Claude | T3B-01 | Which Express routes migrate to Go, API compatibility layer | `docs/architecture/TS_GO_MIGRATION.md` | 30min | — |
| **T3B-04** | Implement: migrate dev-control-api routes to Go handlers | Hermes | T3B-03 | Extend gc-orch with new HTTP handlers, maintain same contract | New Go handlers, gc-orch builds, routes respond | 60min | `git revert` |
| **T3B-05** | Implement: migrate core service types to Rust | Hermes | T3B-02 | Follow Claude's contracts for service traits | New Rust modules, `cargo test` passes | 60min | `git revert` |
| **T3B-06** | Test: API compatibility (old TS routes vs new Go/Rust) | OpenCode | T3B-04, T3B-05 | Same request → same response comparison | 100% API compatibility pass | 20min | — |
| **T3B-07** | Commit: Phase 3B migration | Hermes | T3B-06 | `git commit -m "P3B: TypeScript→Rust/Go migration complete"` | Commit hash | 5min | `git reset HEAD~1` |

### Sprint 3C: Self-Evolution + Harness GA (AUTONOMOUS — 3-5h)

| ID | Task | Agent | Deps | Spec | Success Criteria | Effort | Rollback |
|-----|------|-------|------|------|-----------------|--------|---------|
| **T3C-01** | Spec: Self-Evolution loop architecture (1-hour auto cycle) | Claude | CP-2 | Define: Harness eval → gap analysis → improvement suggestion → PR creation → review → merge cycle | `docs/evolution/SELF_EVOLUTION_ARCH.md` | 60min | — |
| **T3C-02** | Spec: Harness GA (production-grade eval pipeline) | Claude | T3C-01 | Progress from 141 tests to full GA: benchmark suite, regression detection, progress tracking | `docs/evolution/HARNESS_GA_SPEC.md` | 45min | — |
| **T3C-03** | Implement: Harness GA — benchmark suite (codgen, RAG, tool-use, safety) | Hermes (supervising Codex) | T3C-02 | Create structured benchmarks for each agent capability category | `crates/gc-runtime-core/benches/` with 4+ benchmark modules | 90min | `git revert` |
| **T3C-04** | Implement: Self-evolution loop — automatic gap→improvement pipeline | Hermes | T3C-01 | Harness → gap analysis → improvement plan → code change → test → PR | `scripts/gc-evolution-loop.sh` runs end-to-end dry-run | 90min | `git revert` |
| **T3C-05** | Implement: Progress tracking dashboard (evolution metrics) | Hermes | T3C-01, T3C-03 | Track agent scores over time, visualize regression | Dashboard data in `crates/gc-runtime-core/docs/evolution-metrics.json` | 45min | — |
| **T3C-06** | Review: Harness GA completeness | OpenCode | T3C-03..T3C-05 | Test coverage, edge cases, regression detection | GA review pass | 30min | — |
| **T3C-07** | Commit: Phase 3C evolution | Hermes | T3C-06 | `git commit -m "P3C: self-evolution + Harness GA complete"` | Commit hash | 5min | `git reset HEAD~1` |

### Sprint 3D: Telegram OCR Enhancement

| ID | Task | Agent | Deps | Spec | Success Criteria | Effort | Rollback |
|-----|------|-------|------|------|-----------------|--------|---------|
| **T3D-01** | Spec: Telegram OCR enhancement plan | Claude | CP-2 | Photo document → OCR → structured data → analysis pipeline. Integrate existing OCR/vision capabilities | `docs/telegram/OCR_ENHANCEMENT.md` | 30min | — |
| **T3D-02** | Implement: OCR pipeline (photo → text extraction) | Hermes | T3D-01 | Python/Rust OCR reader, image preprocessing, text extraction | OCR outputs structured text from test images | 60min | `git revert` |
| **T3D-03** | Implement: Analyzed data → system ingestion (RAG store) | Hermes | T3D-02 | OCR output → gc-runtime-core vector store via JSON-LD | Data appears in RAG search results | 45min | — |
| **T3D-04** | Review: OCR pipeline + integration | OpenCode | T3D-02, T3D-03 | Security scan (no exfil), error handling, parallel processing | Review pass | 20min | — |
| **T3D-05** | Commit: Telegram OCR | Hermes | T3D-04 | `git commit -m "P3D: Telegram OCR enhancement"` | Commit hash | 5min | `git reset HEAD~1` |

### Checkpoint CP-3: MIGRATION COMPLETE
- [ ] Phase 3A: Top 6 Python→Rust modules migrated, parity tests 100%
- [ ] Phase 3B: TypeScript routes migrated to Go + Rust, API compatibility verified
- [ ] Phase 3C: Self-evolution loop runs end-to-end, Harness GA benchmarks created
- [ ] Phase 3D: Telegram OCR pipeline delivers structured data to RAG
- [ ] Total RAM still <15MB per budget constraint
- [ ] If RAM exceeds 15MB on ANY component → BLOCK, Claude re-architects

---

## ════════════════════════════════════════════════════════════════
## PHASE 4: SYSTEM INTEGRATION — UNIFIED CONTROL PLANE (P0-P4 COMPLETE)
## ════════════════════════════════════════════════════════════════

**Goal:** All systems integrated into ONE control plane, A2A2A message bus live, fleet consistently managed via gc-orch.

### Sprint 4A: Control Plane Unification (2-4h)

| ID | Task | Agent | Deps | Spec | Success Criteria | Effort | Rollback |
|-----|------|-------|------|------|-----------------|--------|---------|
| **T4A-01** | Spec: Unified control plane API (all routes, all bridges) | Claude | CP-3 | Extend gc-orch with: fleet mgmt, agent lifecycle, queue orchestration, evolution trigger | `docs/api/UNIFIED_CONTROL_PLANE.md` | 45min | — |
| **T4A-02** | Implement: Extended gc-orch API routes | Hermes | T4A-01 | Add `/fleet`, `/agents/:id/control`, `/evolution/trigger`, `/queue/drain` | All new endpoints respond with valid JSON | 60min | `git revert` |
| **T4A-03** | Implement: A2A2A message bus integration (SQLite-backed) | Hermes | T4A-01 | Message persistence, delivery guarantees, receipt chain | Messages survive restart, delivery confirmed | 60min | `git revert` |
| **T4A-04** | Implement: Fleet dashboard status endpoint | Hermes | T4A-01 | Generate real-time fleet overview: ships, agents, queue, evolution state | Dashboard JSON consumed by dev-dashboard | 30min | — |
| **T4A-05** | Test: Integration test suite (all bridges → all endpoints) | OpenCode | T4A-02..T4A-04 | End-to-end: queue→dispatch→agent→result→receipt | 10+ integration tests pass | 30min | — |
| **T4A-06** | Review: Full system security audit | OpenCode | T4A-05 | Secret scan, access control, rate limiting, input validation | 0 findings | 30min | — |
| **T4A-07** | Final commit: Phase 4 integration | Hermes | T4A-06 | `git commit -m "P4: unified control plane complete"` | Commit hash | 5min | `git reset HEAD~1` |

### Checkpoint CP-4: SYSTEM COMPLETE
- [ ] Unified control plane API functional (10+ endpoints)
- [ ] A2A2A message bus with SQLite persistence, receipt chain
- [ ] Fleet dashboard status endpoint returns real-time state
- [ ] 10+ integration tests passing
- [ ] Security audit 0 findings
- [ ] All 170 dirty files committed across 6+ commits
- [ ] Total system RAM <15MB
- [ ] All 6 active agents routable via gc-orch
- [ ] Self-evolution loop running (dry-run mode, human approval gate active)

---

## ════════════════════════════════════════════════════════════════
## PARALLEL EXECUTION MAP
## ════════════════════════════════════════════════════════════════

Shows which tasks can run in parallel (same column = same agent, synchronous by phase):

### GANTT VIEW (Agent × Task)

```
Timeline →   0h      1h      2h      3h      4h      5h      6h      7h      8h      10h     12h     14h
             │       │       │       │       │       │       │       │       │       │       │       │
PHASE 0      ┌───────┬───────┐
Hermes       │T0A-03  │T0A-05 │T0B-05 T0B-08
Claude       │T0A-02  │
OpenCode     │T0A-04  │T0B-02 T0B-03 T0B-04
zcode        │T0A-01  │T0B-06
planner      │        │T0B-01
webmcp       │
             │        │
PHASE 1      │        ┌───────┬───────┬───────┬───────┬───────┐
Hermes       │        │       │       │       │       │T1A-11
Claude       │        │T1A-01 │       │       │       │
OpenCode     │        │       │       │       │       │
zcode        │        │       │       │       │       │T1A-09
planner      │        │       │T1A-05 │T1A-06 │T1A-07 T1A-08│T1A-10
webmcp       │        │       │T1A-02 T1A-03 T1A-04  │
             │        │       │       │       │       │
PHASE 2      │        ┌───────┬───────┬───────┬───────┬───────┬───────┐
Hermes       │        │       │       │       │       │       │T2A-11 T2A-12
Claude       │        │T2A-01 │       │T2A-06 │T2A-07 T2A-08 T2A-09│
OpenCode     │        │       │       │       │       │       │
zcode        │        │       │T2A-02 T2A-03 T2A-04 T2A-05│T2A-10
planner      │        │       │       │       │       │       │
webmcp       │        │       │       │       │       │       │
             │        │       │       │       │       │       │
PHASE 3A     │        ┌───────┬───────┬───────┬───────┬───────┬───────┬───────┐
Hermes       │        │       │T3A-03 │       │T3A-04 │       │       │T3A-08
Claude       │        │       │T3A-02 │       │       │T3A-06 │       │
OpenCode     │        │       │       │T3A-05 │       │       │T3A-07 │
zcode        │        │       │       │       │       │       │       │
planner      │        │       │       │       │       │       │       │
webmcp       │        │T3A-01 │       │       │       │       │       │
             │        │       │       │       │       │       │       │
PHASE 3B     │        ┌───────┬───────┬───────┬───────┬───────┬───────┬───────┐
Hermes       │        │       │       │T3B-04 │T3B-05 │       │       │T3B-07
Claude       │        │       │T3B-02 T3B-03 │       │       │       │
OpenCode     │        │       │       │       │       │T3B-06 │       │
zcode        │        │       │       │       │       │       │       │
planner      │        │T3B-01 │       │       │       │       │       │
webmcp       │        │T3B-01 │       │       │       │       │       │
             │        │       │       │       │       │       │       │
PHASE 3C     │        ┌───────┬───────┬───────┬───────┬───────┬───────┬───────┐
Hermes       │        │       │       │T3C-03 │T3C-04 │T3C-05 │       │T3C-07
Claude       │        │T3C-01 T3C-02 │       │       │       │       │
OpenCode     │        │       │       │       │       │       │T3C-06 │
             │        │       │       │       │       │       │       │
PHASE 3D     │        ┌───────┬───────┬───────┬───────┬───────┐
Hermes       │        │       │T3D-02 T3D-03 │       │T3D-05
Claude       │        │T3D-01 │       │       │       │
OpenCode     │        │       │       │       │T3D-04 │
             │        │       │       │       │       │
PHASE 4      │        ┌───────┬───────┬───────┬───────┬───────┬───────┬───────┐
Hermes       │        │       │T4A-02 T4A-03 T4A-04 │       │       │T4A-07
Claude       │        │T4A-01 │       │       │       │       │       │
OpenCode     │        │       │       │       │       │T4A-05 T4A-06 │
```

### Agent Utilization Summary

| Agent | Phase 0 | Phase 1 | Phase 2 | Phase 3A | Phase 3B | Phase 3C | Phase 3D | Phase 4 | Total |
|-------|---------|---------|---------|----------|----------|----------|----------|---------|-------|
| **Hermes** | 4 tasks | 1 task | 2 tasks | 3 tasks | 3 tasks | 3 tasks | 3 tasks | 4 tasks | **23** |
| **Claude** | 1 task | 1 task | 4 tasks | 2 tasks | 2 tasks | 2 tasks | 1 task | 1 task | **14** |
| **OpenCode** | 4 tasks | 0 tasks | 0 tasks | 2 tasks | 1 task | 1 task | 1 task | 2 tasks | **11** |
| **zcode** | 2 tasks | 1 task | 5 tasks | 0 tasks | 0 tasks | 0 tasks | 0 tasks | 0 tasks | **8** |
| **planner** | 1 task | 5 tasks | 0 tasks | 0 tasks | 1 task | 0 tasks | 0 tasks | 0 tasks | **7** |
| **webmcp** | 0 tasks | 3 tasks | 0 tasks | 1 task | 1 task | 0 tasks | 0 tasks | 0 tasks | **5** |
| **Total** | **12** | **11** | **11** | **8** | **8** | **6** | **5** | **7** | **68** |

---

## ════════════════════════════════════════════════════════════════
## RISK REGISTER
## ════════════════════════════════════════════════════════════════

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Rust compile errors during migration | HIGH | HIGH | Claude specs first + incremental commits + `cargo check` on every change |
| Agent timeout (Claude: 30min per session) | MEDIUM | MEDIUM | Break specs into ≤30min chunks, dry-run first |
| Go gc-orch crash during queue sync | LOW | HIGH | In-memory queue backup, json-persisted state, restart recovery |
| 170 files contain secrets | LOW | CRITICAL | OpenCode reviews ALL Category A files before commit |
| Migration breaks existing functionality | MEDIUM | HIGH | Python-oracle parity tests per module, git reverts, feature flags |
| Self-evolution loop infinite cycle | LOW | MEDIUM | Max 3 improvement iterations per cycle, hard stop after 1 hour |
| 15MB RAM budget exceeded | MEDIUM | HIGH | Per-component budget tracking, `gc-system-report.sh` before each commit |
| Standby agents (Codex) needed mid-migration | MEDIUM | LOW | Activate via gc-orch `/agents/:id/control` — add task in Phase 4 |

---

## ════════════════════════════════════════════════════════════════
## ROLLBACK SUMMARY
## ════════════════════════════════════════════════════════════════

| Level | Trigger | Rollback Action | Recovery Time |
|-------|---------|----------------|---------------|
| **Per-Task** | Any task failure | `git checkout -- <files>` (uncommitted changes) | <2min |
| **Per-Sprint** | Blocked checkpoint | `git reset --hard <pre-sprint-commit>` | <5min |
| **Per-Phase** | 3+ blocked sprints | `git revert <phase-commits>` | <15min |
| **Full System** | RAM >15MB or crasher bug | `git stash && git checkout migration/v5-rebase` | <30min |
| **Queue Recovery** | gc-orch crash | Restart: `cd go/gc-orch && go run .` (in-memory + persisted state) | <1min |
| **Evolution Loop** | Runaway improvement cycle | `kill $(pgrep -f gc-evolution-loop) && git stash` | <2min |

---

## ════════════════════════════════════════════════════════════════
## EXECUTION COMMAND REFERENCE
## ════════════════════════════════════════════════════════════════

```bash
# Start gc-orch bridge
cd /Users/sirinx/sirinx-os && cd go/gc-orch && go run .

# Run tests
cargo test  # Rust (141+ tests)
npx vitest run  # TypeScript tests

# Check agent status
curl -s :8721/status | python3 -m json.tool
curl -s :8721/agents | python3 -m json.tool

# Queue operations
curl -s :8721/queue  # list all
curl -X POST :8721/queue -d '{"title":"...","priority":"P0","owner":"codex"}'

# Check dirty files
git status --short

# Commit pattern
git add -A && git commit -m "P<N>: <message>"
git push origin migration/v5-rebase  # requires human approval

# Classify commit files
git diff --stat HEAD
git diff --name-only HEAD

# Pre-commit checks
cargo fmt --check && cargo clippy --all-targets --all-features -- -D warnings && cargo test
```

---

*End of E2E Orchestration DAG — 68 tasks across 4 phases, 9 sprints, 6 agents.*
*Next step: Load into planner for queue dispatch.*
