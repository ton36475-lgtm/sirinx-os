---
name: autonomous-loop-engineering
description: Fully autonomous loop engineering system — Tier A/B execute without human approval, continuous scan→classify→execute→verify→report→cycle, cron-driven, panic-safe.
version: 2.0.0
---

# Autonomous Loop Engineering System

## Core Principle

Tier A/B = **auto-execute immediately** (no human approval needed)
Tier C = maker-checker queue
Tier D/X = **blocked forever** (human-only or prohibited)

## When to Use

- Continuous engineering cycles on GhostClaw OS
- Automated test running + fix dispatch
- Infrastructure health monitoring
- Any recurring safe (Tier A/B) task batch

## Architecture

```
┌─────────────────────────────────────────┐
│           Hermes Commander              │
├─────────────────────────────────────────┤
│  LoopEngineeringWorkflow                │
│  ├── SCAN: find pending tasks           │
│  ├── CLASSIFY: assign Tier A/B/C/D/X    │
│  ├── EXECUTE_AB: auto-run A/B tasks     │
│  ├── QUEUE_C: send to maker-checker     │
│  ├── BLOCK_DX: reject D/X               │
│  ├── VERIFY: post-execution check       │
│  ├── REPORT: append receipt to chain    │
│  └── CYCLE: loop back to SCAN           │
├─────────────────────────────────────────┤
│  PanicController (kill switch)          │
│  CronJob (every 5m trigger)             │
│  delegate_task (parallel agents)        │
└─────────────────────────────────────────┘
```

## Quick Start

```bash
# Manual run
cd /Users/sirinx/sirinx-os && node scripts/auto-loop-engineering.mjs

# Check cron status
# (managed via Hermes cronjob tool)
```

## Registering Tasks

```javascript
import { LoopEngineeringWorkflow } from './packages/types/src/loop-engineering-workflow.mjs';

const loop = new LoopEngineeringWorkflow({ maxCyclesPerRun: 100 });

// Tier A: auto-execute
loop.registerTask({ action: 'research', dataClass: 'PUBLIC' });

// Tier B: auto-execute (enrolled read)
loop.registerTask({ action: 'read', dataClass: 'INTERNAL' });

// Tier D: BLOCKED (requires human)
loop.registerTask({ action: 'publish', dataClass: 'INTERNAL', isExternal: true });

// Tier X: BLOCKED FOREVER
loop.registerTask({ action: 'cookie_export', dataClass: 'PUBLIC' });

// Run
const result = await loop.runContinuous();
// → { totalExecuted: 2, totalBlocked: 2, totalReceipts: 2 }
```

## Tier Auto-Execute Rules

| Input | Tier | Action |
|-------|------|--------|
| action='research', PUBLIC | A | ✅ Auto |
| action='read', INTERNAL | B | ✅ Auto |
| action='read', CONFIDENTIAL | C | ❌ Maker-checker |
| action='send', INTERNAL, external | D | ❌ Human only |
| action='cookie_export' | X | ❌ Blocked |
| dataClass='UNKNOWN' | X | ❌ Fail-closed |

## Cron Setup

Four cron jobs are registered via the Hermes `cronjob` tool:

| Job | Schedule | Script | Purpose |
|-----|----------|--------|---------|
| `auto-loop-engineering` | every 5m | `scripts/auto-loop-engineering.mjs` | Execute Tier A/B tasks + receipt chain |
| `cron-disk-check` | every 10m | `scripts/cron-disk-check.mjs` | Disk monitor + auto cleanup when >85% |
| `cron-health-check` | every 15m | `scripts/cron-health-check.mjs` | Check APIs (:3800, :8711), Rust compile, test count |
| `cron-daily-report` | 08:00 daily | `scripts/cron-daily-report.mjs` | JSON report to `data/cron-reports/` |

## Verification

```bash
# All 84 GhostClaw tests
npx vitest run packages/types/src/ tests/p0*/ tests/loop-engineering/

# Chain integrity
node -e "
import { LoopEngineeringWorkflow } from './packages/types/src/loop-engineering-workflow.mjs';
const loop = new LoopEngineeringWorkflow();
loop.registerTask({ action: 'calc', dataClass: 'PUBLIC' });
await loop.runContinuous();
console.log('Chain valid:', loop.verifyChain().valid);
"
```

## Panic Protocol

```javascript
// Emergency stop
loop.panicController.panic('security_incident');

// After panic:
// - All dispatch stops
// - Unused capabilities revoked
// - Schedules disabled
// - Workers isolated
```

## Files

| File | Purpose |
|------|---------|
| `packages/types/src/loop-engineering-workflow.mjs` | Core engine |
| `scripts/auto-loop-engineering.mjs` | Cron entry point (every 5m) |
| `scripts/cron-disk-check.mjs` | Disk monitor + auto cleanup (every 10m) |
| `scripts/cron-health-check.mjs` | Service health: APIs, Rust, tests (every 15m) |
| `scripts/cron-daily-report.mjs` | Daily JSON report generator (08:00) |
| `packages/types/src/ghostclaw-governance.mjs` | Tier classifier |

## Test Coverage

```
✓ auto-executes Tier A without human approval
✓ auto-executes Tier B without human approval
✓ blocks Tier D (requires human)
✓ blocks Tier X completely
✓ processes mixed queue correctly
✓ creates valid receipt chain
✓ panic controller stops the loop
✓ handles 10+ tasks in batch
```

## Pitfalls

- `classifyAction` returns Tier.X for ANY unknown dataClass — always specify dataClass
- Receipt chain uses `previousHash` linking — tampering breaks verification
- `maxCyclesPerRun` prevents infinite loops — default 50, set higher for large batches
- Panic is irreversible for the current engine instance — create new instance to resume
