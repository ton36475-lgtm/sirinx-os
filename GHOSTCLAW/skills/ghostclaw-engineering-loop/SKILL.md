---
name: ghostclaw-engineering-loop
description: Full-cycle autonomous engineering workflow for GhostClaw OS — scan, classify, execute (Tier A/B), verify, report, loop. Delegates to parallel agents.
version: 1.0.0
---

# GhostClaw Engineering Loop

Autonomous engineering workflow that runs the full P000A→P010 pipeline + continuous loop without human approval for Tier A/B tasks.

## When to Use

- Running the GhostClaw OS governance pipeline
- Auto-executing safe read-only tasks
- Coordinating parallel agents on Mac mini M2
- Generating evidence-backed receipts for all actions

## Architecture

```
Hermes (commander)
  ├── delegate_task → Fix Rust/Tests (parallel agents)
  ├── LoopEngineeringWorkflow → Auto-execute Tier A/B
  ├── cronjob → Auto-loop every 5m
  └── Skills → Reusable for any agent
```

## Step-by-Step Procedure

### Step 1: Full System Audit

```bash
cd /Users/sirinx/sirinx-os

# Git status
git status --porcelain | wc -l

# Syntax check all key modules
for f in \
  packages/types/src/ghostclaw-governance.mjs \
  packages/types/src/loop-engineering-workflow.mjs \
  packages/types/src/worker-interfaces.mjs \
  services/dev-control-api/server.mjs; do
  node --check "$f" && echo "✅ $f" || echo "❌ $f"
done

# Rust compile
cargo check 2>&1 | tail -3

# All tests
npx vitest run 2>&1 | tail -5
```

### Step 2: Classify Failures + Delegate Fixes

Use `delegate_task` for parallel work:
- Agent 1: Fix Rust compile errors
- Agent 2: Fix failing JS tests
- Agent 3: Build/verify infrastructure

### Step 3: Run Loop Engineering

```javascript
import { LoopEngineeringWorkflow } from './packages/types/src/loop-engineering-workflow.mjs';

const loop = new LoopEngineeringWorkflow({ maxCyclesPerRun: 100 });

// Register tasks
loop.registerTask({ action: 'read', dataClass: 'INTERNAL' });  // → Tier B, auto
loop.registerTask({ action: 'send', dataClass: 'INTERNAL', isExternal: true });  // → Tier D, blocked

// Run
const result = await loop.runContinuous();
// → { totalExecuted, totalBlocked, totalReceipts, chainValid }
```

### Step 4: Verify + Report

```bash
node scripts/auto-loop-engineering.mjs
```

### Step 5: Set Up Cron

```
cronjob action=create schedule=every 5m
```

## Tier Classification

| Tier | Auto? | Examples |
|------|-------|----------|
| A | ✅ | Public research, calculations, status reads |
| B | ✅ | Enrolled read-only dashboard, exact-file report |
| C | ❌ Maker-checker | Confidential read, cloud delegation |
| D | ❌ Human approval | External send, mutation, deploy |
| X | ❌ Forever blocked | Cookie export, bypass, credential theft |

## Files

| File | Purpose |
|------|---------|
| `packages/types/src/ghostclaw-governance.mjs` | Tier classifier, Capability, Lease, Approval, Receipt, Panic |
| `packages/types/src/loop-engineering-workflow.mjs` | Auto-loop engine (Tier A/B execute, D/X block) |
| `packages/types/src/worker-interfaces.mjs` | Browser/Cloud/Research worker interfaces + mocks |
| `packages/types/src/ghostclaw-threat-model.mjs` | 21 threats mapped to prevention+test |
| `scripts/auto-loop-engineering.mjs` | Cron entry point |
| `services/dev-control-api/src/thaimart-k-workflow-engine.mjs` | ThaiMart K01-K15 workflow |

## Pre-flight System Health Check (ALWAYS RUN FIRST)

Before starting any engineering work, verify the Mac mini is healthy:

```bash
# 1. Disk space (CRITICAL — npm cache can silently fill disk to 99%)
AVAIL=$(df -h / | tail -1 | awk '{print $4}')
echo "Disk available: $AVAIL"
# If < 5GB, clean npm cache IMMEDIATELY:
#   npm cache clean --force
#   rm -rf ~/.npm/_npx ~/.npm/_cacache
# This freed 13GB in one session (8.6GB cacache + 4.7GB npx cache)

# 2. Rust compile
cargo check 2>&1 | grep -E 'error|Finished'

# 3. Key modules syntax
for f in packages/types/src/*.mjs services/dev-control-api/server.mjs; do
  node --check "$f" 2>/dev/null && echo "✅ $f" || echo "❌ $f"
done

# 4. GhostClaw tests
npx vitest run packages/types/src/ tests/p0*/ tests/loop-engineering/ 2>&1 | tail -3
```

## Pitfalls

- **Disk full (ENOSPC)** — npm cache grows to 10-15GB silently. Always check `df -h /` first. Fix: `npm cache clean --force && rm -rf ~/.npm/_npx ~/.npm/_cacache`. This blocked ALL npm installs for an entire session until discovered.
- **Corrupted native binaries** — When disk fills during `npm install`, native `.node` files (like `@swc/core-darwin-arm64`) get truncated. Fix: `rm -rf node_modules && npm install` fresh
- **npm install timeout** — Large packages (Next.js apps, OmniRoute) take 300s+ on Mac mini. Use `background=true` with `notify_on_complete=true`, or clone repo + local `npm install` instead of `npm install -g`
- **Agent delegation timeout** — Subagents time out at 600s. For large test-fix batches (12+ files), split into smaller scoped tasks or accept partial completion and re-dispatch for the remainder
- **Object.freeze on returns** breaks test mutations — don't freeze top-level objects that tests need to mutate (consumed, consumedAt)
- **Crypto imports** must use `import { createHash, randomUUID } from 'node:crypto'` — bare `crypto.randomUUID()` fails in vitest
- **Import paths** in test files under `tests/` use `../../packages/` not `../../../`
- **Rust lib.rs stub** must export all symbols that ghostclaw-hermes imports — check `use` statements in dependent crates
- **server.mjs** must not contain tmux commands (those go in ghostclaw-tmux.sh)
- **Regex find-replace on Object.freeze** can break brackets — always run `node --check` after patching

## Verification

```bash
# All tests pass
npx vitest run packages/types/src/ packages/tests/ tests/p0*/ tests/loop-engineering/

# Rust compiles
cargo check

# Server starts
node services/dev-control-api/server.mjs &

# Auto-loop runs
node scripts/auto-loop-engineering.mjs
```
