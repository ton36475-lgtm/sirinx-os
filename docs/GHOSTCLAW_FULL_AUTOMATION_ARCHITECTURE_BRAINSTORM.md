# GhostClaw OS Full Automation — Architecture Brainstorm

**Date:** 2026-07-16
**Author:** Hermes Architecture Subagent (GLM-5.2)
**Status:** PROPOSAL — no commit, no push
**Scope:** GhostClaw OS full automation path to SRL-3 (dry-run integrated)

---

## Executive Summary

GhostClaw OS has a **mature governance foundation** (Tier A/B/C/D/X classification, A2A2A protocol, fleet-ship-crew hierarchy, 25/25 governance tests passing, A2A Hermes-Codex Bridge v2 with 21/21 vitest tests). However, the system is stuck at **SRL-2 (local working baseline)** because of three structural gaps:

1. **No live runtime bus** — the A2A queue is file-based only; Hermes gateway at `127.0.0.1:9000` is unreachable.
2. **No agent execution engine** — worker definitions, tier-resolver, and governance contracts exist, but nothing actually dispatches Codex/Claude/OpenCode processes.
3. **No integration test proving end-to-end dry-run** — individual components have unit tests, but no test proves: Operator → Hermes → Claude (design) → Codex (build) → OpenCode (review) → KOB (validate) → Receipt.

This document proposes the optimal architecture to close these gaps and reach SRL-3.

---

## 1. Build Priority Order

### P0 — Live Runtime Bus (Unblocks Everything)

**What:** Replace the file-only `_A2A_QUEUE/` with a real message queue that also mirrors to files for audit.

```
Operator → Hermes Controller (process) → Redis/SQLite Queue → Worker Dispatcher → Agent CLIs
                                    ↓
                            File mirror (_A2A_QUEUE/) for audit
```

**Components:**
- `GHOSTCLAW/runtime/message-bus.mjs` — SQLite-backed message queue with file-mirror
- `GHOSTCLAW/runtime/dispatcher.mjs` — picks up messages, routes to correct agent CLI
- `GHOSTCLAW/runtime/health-check.mjs` — heartbeat pinger for all registered workers

**Why first:** Every other component depends on messages flowing. Without a live bus, every "integration" is simulated only.

**Estimated effort:** 2-3 days

### P1 — Agent CLI Connector Layer

**What:** Adapters that actually invoke Codex, Claude Code, and OpenCode CLIs with structured input and parse their output.

```
┌─────────────────────────────────────────┐
│         Dispatcher                      │
│  (reads from bus, routes to adapter)    │
└──────────┬──────────┬──────────┬────────┘
           │          │          │
    ┌──────▼──┐ ┌────▼────┐ ┌──▼──────┐
    │ Codex   │ │ Claude  │ │ OpenCode│
    │ Adapter │ │ Adapter │ │ Adapter │
    └──────┬──┘ └────┬────┘ └──┬──────┘
           │         │         │
    codex exec   claude --print  opencode run
```

**Components:**
- `GHOSTCLAW/runtime/adapters/codex-adapter.mjs` — invokes `codex` CLI in non-interactive mode
- `GHOSTCLAW/runtime/adapters/claude-adapter.mjs` — invokes `claude --print` with structured prompt
- `GHOSTCLAW/runtime/adapters/opencode-adapter.mjs` — invokes `opencode` for review tasks
- Each adapter: input validation → CLI invocation → output parsing → receipt generation

**Why second:** Once the bus is live, we need real agents at the other end. This is the "last mile."

**Estimated effort:** 3-4 days (1 day per adapter + integration)

### P2 — OmniRoute AI Gateway Integration

**What:** Wire OmniRoute as the unified AI gateway so all agents route through it for model access (250+ providers, free tiers, cost savings).

```
Agent CLIs → OmniRoute (127.0.0.1:8787) → 250+ providers
                    ↓
            RTK+Caveman compression (15-95% token savings)
                    ↓
            Cost guard integration (MAX_SPEND_PER_TASK_USD=5)
```

**Components:**
- Configure all agent CLIs to point `OPENAI_BASE_URL` → `http://127.0.0.1:8787/v1`
- OmniRoute `localProxyOnly: true`, `failClosed: true`, `humanApprovalForPaidTier: true`
- Cost tracking middleware in the dispatcher

**Why here:** Agents need models to work. OmniRoute gives free-tier access for dev/testing. Must be wired before the integration test.

**Estimated effort:** 1 day (already cloned and verified)

### P3 — Markdownify MCP Integration

**What:** Wire Markdownify MCP server into all agent CLIs for document processing (PDF, DOCX, XLSX, images, YouTube → Markdown).

**Components:**
- MCP config in `.codex/config.toml`, `.claude/settings.json`, `.opencode/config.json`
- `MD_ALLOWED_PATHS=/Users/sirinx/sirinx-os:/Users/sirinx/Documents`
- Enables: research ingestion, spec parsing, evidence processing

**Why here:** Agents need to process external documents for architecture and review tasks. This is a capability multiplier.

**Estimated effort:** 0.5 day (already built and verified)

### P4 — End-to-End Integration Test (SRL-3 Gate)

**What:** A single test script that proves the full A2A2A chain works end-to-end in dry-run mode.

```
TEST: "Create a utility function `formatTimestamp()` in packages/utils/"
  1. Operator sends mission to Hermes bus
  2. Hermes routes to Claude (architecture: design the function signature)
  3. Claude returns design → Hermes routes to Codex
  4. Codex writes the function → Hermes routes to OpenCode
  5. OpenCode reviews → Hermes routes to KOB
  6. KOB runs tests → Receipt generated
  7. Assert: file exists, tests pass, receipt chain valid, no external calls
```

**Components:**
- `GHOSTCLAW/tests/e2e-mission-flow.test.mjs` — the integration test
- `GHOSTCLAW/tests/fixtures/` — test fixtures (sample mission cards)
- `GHOSTCLAW/scripts/run-e2e-dry-run.sh` — orchestration script

**Why last:** This is the SRL-3 gate. It proves everything works together.

**Estimated effort:** 2 days

### P5+ — Future (Post SRL-3)

- CLI-Anything Harness + n8n dry-run bridge
- Browser Use worker for visual QA
- GitHub toptrend research worker
- Kimi reference vote worker
- EdgeOne readiness worker
- Vibe coding sidebar integration with live agents

---

## 2. Agent Team Division of Work

### Hermes (Commander) — Orchestration Layer

**Owns:**
- `GHOSTCLAW/runtime/` — message bus, dispatcher, health check
- `GHOSTCLAW/policies/` — all policy YAMLs
- `GHOSTCLAW/protocols/` — A2A2A schema and protocol
- Mission routing logic

**Does:**
- Design the message bus architecture
- Write the dispatcher with tier-resolution integration
- Implement health checks and heartbeat monitoring
- Wire cost guard and loop guard into the runtime
- Create the e2e test framework

**Does NOT:**
- Write application code (Codex's job)
- Design system architecture (Claude's job)
- Review code quality (OpenCode's job)

### Codex (Builder) — Execution Layer

**Owns:**
- `GHOSTCLAW/runtime/adapters/` — all CLI adapters
- `services/` — dev-control-api, dev-dashboard features
- `packages/` — shared utilities, types

**Does:**
- Build the Codex, Claude, and OpenCode CLI adapters
- Wire OmniRoute configuration into all CLIs
- Wire Markdownify MCP into all CLIs
- Implement the file-mirror audit trail
- Write unit tests for all adapters

**Does NOT:**
- Design the adapter interface (Claude designs, Codex implements)
- Approve merges (OpenCode/Hermes gate)

### Claude Code (Architect) — Design Layer

**Owns:**
- Architecture documents in `GHOSTCLAW/docs/architecture/`
- Interface definitions (TypeScript types for adapters, bus, dispatcher)
- `packages/types/src/` — type definitions

**Does:**
- Design the adapter interface contract (input/output types)
- Design the message bus schema
- Design the end-to-end test architecture
- Review existing governance contracts for gaps
- Create architecture decision records (ADRs)

**Does NOT:**
- Write implementation code
- Run tests

### OpenCode (Reviewer) — Quality Layer

**Owns:**
- `GHOSTCLAW/tests/` — integration and e2e tests
- Review checklists and quality gates

**Does:**
- Write the e2e integration test (`e2e-mission-flow.test.mjs`)
- Review every PR/patch before merge
- Verify tier classification correctness
- Audit receipt chain integrity
- Validate that no forbidden actions leak through

**Does NOT:**
- Write feature code
- Design architecture

### Parallel Work Streams

```
Week 1:
├── Claude: Design adapter interfaces + bus schema (2 days)
├── Hermes: Build message bus + dispatcher skeleton (3 days, parallel with Claude day 1-2)
├── Codex: [BLOCKED on Claude day 2] → Start OmniRoute wiring (day 1-2)
├── OpenCode: Write e2e test contract + fixtures (day 1-2)
│
Week 2:
├── Hermes: Health checks + cost guard integration (day 1-2)
├── Codex: Build all 3 CLI adapters (day 1-3, unblocked by Claude)
├── Claude: Review adapter implementations (day 3-4)
├── OpenCode: Integration test implementation (day 3-4)
│
Week 3:
├── All: Integration test debugging + SRL-3 gate validation (day 1-2)
├── OpenCode: Final review + evidence report (day 3)
```

---

## 3. Top 5 Technical Risks

### Risk 1: CLI Agent Output Parsing Fragility ⚠️ HIGH

**Problem:** Codex, Claude Code, and OpenCode CLIs produce free-form text output. Parsing structured results (success/failure, file paths, diffs) from unstructured output is fragile and breaks on model updates or prompt changes.

**Mitigation:**
- Use `--json` or structured output flags where available
- Define a strict output contract: each adapter expects JSON on stdout with `{status, files_changed, errors, receipt}`
- Wrap agent CLIs with a thin shim that enforces output format
- Fallback: parse exit codes + git diff for file changes

### Risk 2: Concurrency and File Locking ⚠️ HIGH

**Problem:** Multiple agents writing to the same repo simultaneously will cause conflicts. The lane-based file ownership exists in policy but has no runtime enforcement (no actual file locks).

**Mitigation:**
- Use git worktrees per agent (already partially done in vibe-coding-sidebar)
- Implement advisory file locks via the message bus
- The dispatcher must check lane ownership before allowing writes
- Integration test must prove concurrent missions don't corrupt files

### Risk 3: Cost Explosion via OmniRoute ⚠️ MEDIUM

**Problem:** OmniRoute routes to 250+ providers including paid tiers. A runaway agent loop could accumulate significant costs before the cost guard triggers.

**Mitigation:**
- OmniRoute `humanApprovalForPaidTier: true` — free tiers only by default
- Cost guard: `MAX_SPEND_PER_TASK_USD=5`, checked per-dispatch
- Per-mission cost budget in the Mission Card
- Hard kill switch: OmniRoute `stop` command if daily aggregate exceeds threshold
- Log every provider call with cost estimate

### Risk 4: OmniRoute Disk/Memory Pressure on Mac mini M2 ⚠️ MEDIUM

**Problem:** The 228GB disk already filled once during npm install. OmniRoute with SQLite + build artifacts + model caches can consume significant space. Mac mini M2 has limited RAM for concurrent agent processes.

**Mitigation:**
- Pre-emptive disk check in health monitor (`df -h /` before dispatch)
- Limit concurrent agent processes to 2-3 max
- Periodic `npm cache clean` in maintenance cron
- Monitor RSS memory per agent process, kill if > 4GB

### Risk 5: Governance Bypass via CLI Direct Access ⚠️ MEDIUM

**Problem:** If agents can execute arbitrary shell commands (Codex has shell access), they could bypass the tier system, file leases, and approval gates. The governance contracts are only as strong as the enforcement point.

**Mitigation:**
- The dispatcher is the ONLY entry point for agent execution
- Agent CLIs run with restricted PATH (no direct git push, no npm publish)
- Shell access in adapters is sandboxed: `MCP_ALLOW_SHELL=false` by default
- All file writes go through the adapter which enforces lane validation
- OpenCode audit: spot-check that no agent writes outside its lane

---

## 4. Fastest Path to SRL-3 (Dry-Run Integrated)

### SRL-3 Definition (from AGENTS.md §37)

> SRL-3: Dry-run integrated — all components work together in an integrated test, but no external calls, no deploy, no real customer interactions.

### The 7-Day Sprint

```
DAY 1-2: Foundation
├── Claude designs: adapter interface, bus schema, test contract (outputs: .d.ts files, schema.json)
├── Hermes builds: message-bus.mjs (SQLite + file mirror), dispatcher skeleton
├── Codex wires: OmniRoute serve on 127.0.0.1:8787, Markdownify MCP config
└── OpenCode writes: e2e test contract + sample fixtures

DAY 3-4: Adapters
├── Codex builds: codex-adapter.mjs, claude-adapter.mjs, opencode-adapter.mjs
├── Hermes integrates: dispatcher → adapters → tier-resolver → governance contracts
├── Claude reviews: adapter implementations match interface contract
└── OpenCode writes: e2e test implementation

DAY 5: Integration
├── All: First end-to-end dry run
├── Debug: Fix adapter parsing, bus timing, tier resolution edge cases
└── Hermes: Wire cost guard + loop guard into dispatcher

DAY 6: Hardening
├── Run e2e test 10x to check flakiness
├── Add negative tests (Tier D blocked, Tier X hard-blocked, self-approval rejected)
├── Verify receipt chain integrity across 10 missions
└── OpenCode: Final code review + security audit

DAY 7: SRL-3 Gate
├── Run full verification suite:
│   ├── pnpm ghostclaw:test (unit tests)
│   ├── pnpm ghostclaw:validate (governance)
│   ├── node GHOSTCLAW/tests/e2e-mission-flow.test.mjs (integration)
│   └── python3 scripts/validate_model_router_pack.py (model routing)
├── Generate SRL-3 evidence report
└── Update PROJECT_STATE.md with SRL-3 achievement
```

### SRL-3 Acceptance Criteria

```yaml
srl_3_gate:
  - live_message_bus: true        # Bus accepts and routes messages
  - agent_adapters_work: true      # All 3 CLIs invoked successfully
  - omniroute_wired: true          # All agents route through OmniRoute
  - markdownify_wired: true        # MCP server available to all agents
  - e2e_test_passes: true          # Full A2A2A chain completes
  - receipt_chain_valid: true      # All receipts hash-chain verified
  - tier_enforcement: true         # Tier D/X correctly blocked
  - cost_guard_active: true        # Cost tracking per mission
  - no_external_calls: true        # Zero real API/deploy/push calls
  - negative_tests_pass: true      # Self-approval, forbidden actions blocked
```

---

## 5. Architecture Diagram (Target State)

```
┌──────────────────────────────────────────────────────────────────┐
│                        OPERATOR (Human)                          │
│                   dev.sirinx.co Command Center                   │
└──────────────────────────┬───────────────────────────────────────┘
                           │ Mission Card
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                   HERMES COMMANDER                               │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ Message Bus  │  │  Dispatcher  │  │  Tier Resolver + Gov   │  │
│  │ (SQLite +    │→ │              │→ │  classifyAction()      │  │
│  │  File Mirror)│  │              │  │  createCapability()    │  │
│  └─────────────┘  └──────┬───────┘  │  validateLeasePath()   │  │
│                         │          │  createReceipt()       │  │
│                         │          └────────────────────────┘  │
│  ┌─────────────┐  ┌──────▼───────┐  ┌────────────────────────┐  │
│  │ Cost Guard   │  │  Health Check│  │  Loop Guard            │  │
│  │ $5/task max  │  │  Heartbeat   │  │  2 retries max         │  │
│  └─────────────┘  └──────────────┘  └────────────────────────┘  │
└──────────────────────────┬───────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐
    │    CODEX    │ │  CLAUDE   │ │  OPENCODE   │
    │  Adapter    │ │  Adapter  │ │  Adapter    │
    └──────┬──────┘ └─────┬─────┘ └──────┬──────┘
           │               │               │
    ┌──────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐
    │ codex exec  │ │claude     │ │ opencode    │
    │ (non-inter) │ │--print    │ │ run         │
    └──────┬──────┘ └─────┬─────┘ └──────┬──────┘
           │               │               │
           └───────────────┼───────────────┘
                           │
                    ┌──────▼──────┐
                    │  OmniRoute  │
                    │ :8787 local │
                    │ 250+ models │
                    │ Free tiers  │
                    └─────────────┘
                           │
                    ┌──────▼──────┐
                    │ Markdownify │
                    │ MCP Server  │
                    │ 11 tools    │
                    └─────────────┘

─── Audit Trail (All Tiers) ────────────────────────────────────────
  _A2A_QUEUE/inbox/     ← Mission requests
  _A2A_QUEUE/outbox/    ← Mission results + receipts
  .ghostclaw_runtime/   ← Manifests, audit, evidence
  GHOSTCLAW/vault/      ← Mission records, decisions, audit log
─── Hash Chain Receipts ────────────────────────────────────────────
  r[i].previousHash === r[i-1].chainHash  (verified per dispatch)
```

---

## 6. Key Decisions and Trade-offs

### Decision: SQLite over Redis for Message Bus

**Rationale:** Mac mini M2 has limited resources. SQLite is zero-config, file-backed (mirrors audit requirement), and sufficient for the expected throughput (missions/minute, not messages/second). Redis can be added later if throughput demands it.

**Trade-off:** No pub/sub semantics. The dispatcher must poll. Acceptable for SRL-3 (dry-run).

### Decision: Git Worktrees for Agent Isolation

**Rationale:** Each agent works in its own worktree. Prevents file conflicts. Already proven in vibe-coding-sidebar system. Provides natural rollback (delete worktree).

**Trade-off:** Disk space (each worktree is a full checkout). Mitigated by shallow clones and worktree cleanup.

### Decision: OmniRoute as Sole AI Gateway

**Rationale:** Centralizes model access, cost tracking, and provider failover. Free tiers enable SRL-3 testing without API spend. RTK+Caveman compression reduces token costs.

**Trade-off:** Single point of failure. Mitigated by OmniRoute's multi-provider routing and health monitoring in the dispatcher.

### Decision: File-Based Audit Mirror (Not DB-Only)

**Rationale:** The existing `_A2A_QUEUE/` file structure is deeply integrated into evidence tracking, PROJECT_STATE.md references, and operator workflows. Switching to DB-only would break 40+ existing receipt/audit references.

**Trade-off:** Dual-write complexity. The bus writes to SQLite first (source of truth), then mirrors to files (audit copy).

---

## Summary

| Question | Answer |
|---|---|
| What to build next? | P0: Message Bus → P1: CLI Adapters → P2: OmniRoute → P3: Markdownify → P4: E2E Test |
| Agent division? | Hermes: runtime/orchestration, Codex: adapters/services, Claude: interfaces/design, OpenCode: tests/review |
| Top 5 risks? | CLI parsing fragility, concurrency/file locks, cost explosion, disk/memory pressure, governance bypass |
| Fastest path to SRL-3? | 7-day sprint: 2 days foundation, 2 days adapters, 1 day integration, 1 day hardening, 1 day gate |
