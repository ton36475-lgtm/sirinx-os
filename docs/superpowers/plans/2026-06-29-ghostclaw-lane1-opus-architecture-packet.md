# GhostClaw LANE_1 Opus Architecture Packet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a docs-only Opus architecture packet for GhostClaw LANE_1 after Hermes routes and approves the architecture task.

**Architecture:** The packet is generated from verified local repo evidence, not stale chat memory. It preserves the Hermes -> Opus -> Hermes -> Codex chain, keeps LANE_2 blocked until approval, and treats the v3.3 backend merge as a separate artifact-gated lane.

**Tech Stack:** Markdown architecture docs, local A2A queue JSON, GHOSTCLAW brain docs, direct shell verification with `python3`, `node`, `rg`, and `git diff --check`.

---

## File Structure

Create only after Hermes/Opus review or an explicit Codex-as-recorder gate:

```text
docs/knowledge/SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md
```

Update after the packet is approved:

```text
_OBSIDIAN_GHOSTCLAW_BRAIN/16_STATUS_BOARD.md
_OBSIDIAN_GHOSTCLAW_BRAIN/15_DECISION_LOG.md
PROJECT_STATE.md
NEXT_ACTIONS.md
AUTONOMOUS_RUN_LOG.md
docs/knowledge/SIRINX_CODEX_HERMES_UNIFIED_CONTINUATION_2026-06-29.md
```

Do not modify backend, database, migration, deploy, provider, wallet, or runtime
queue files in this plan.

### Task 1: Confirm Route Gate

**Files:**
- Read: `_A2A_QUEUE/inbox/packet_011_ghostclaw_lane1_opus_architecture.json`
- Read: `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_LOCAL_REVIEW_2026-06-29.md`

- [ ] **Step 1: Validate the local route packet JSON**

Run:

```bash
python3 -m json.tool _A2A_QUEUE/inbox/packet_011_ghostclaw_lane1_opus_architecture.json > /dev/null
```

Expected: exit code `0`.

- [ ] **Step 2: Confirm the packet remains dry-run**

Run:

```bash
rg -n '"dry_run": true|"live_send": false|"provider_call": false|"external_message_send": false|"deploy": false|"push": false' _A2A_QUEUE/inbox/packet_011_ghostclaw_lane1_opus_architecture.json
```

Expected: all six gate flags are present.

- [ ] **Step 3: Stop if final Opus packet already exists unexpectedly**

Run:

```bash
test ! -f docs/knowledge/SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md
```

Expected: exit code `0` before packet creation. If the file exists, inspect it
before overwriting or appending.

### Task 2: Read Required Context

**Files:**
- Read: `AGENTS.md`
- Read: `GHOSTCLAW/AGENTS.md`
- Read: `_OBSIDIAN_GHOSTCLAW_BRAIN/01_PROJECT_CONTRACT.md`
- Read: `_OBSIDIAN_GHOSTCLAW_BRAIN/14_SOURCE_OF_TRUTH.md`
- Read: `_OBSIDIAN_GHOSTCLAW_BRAIN/16_STATUS_BOARD.md`
- Read: `_OBSIDIAN_GHOSTCLAW_BRAIN/17_ACCEPTANCE_CRITERIA.md`
- Read: `_OBSIDIAN_GHOSTCLAW_BRAIN/18_BUILD_LANES.md`
- Read: `docs/OPUS_ARCHITECTURE_FIRST_WORKFLOW.md`
- Read: `GHOSTCLAW/MASTER.md`
- Read: `GHOSTCLAW/FLEET_ORCHESTRATOR.md`
- Read: `GHOSTCLAW/COMMAND_BROKER.md`
- Read: `GHOSTCLAW/protocols/A2A2A_PROTOCOL.md`
- Read: `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_ARCHITECTURE_INPUT_WORKSHEET_2026-06-29.md`

- [ ] **Step 1: Verify each required context file exists**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
paths = [
  "AGENTS.md",
  "GHOSTCLAW/AGENTS.md",
  "_OBSIDIAN_GHOSTCLAW_BRAIN/01_PROJECT_CONTRACT.md",
  "_OBSIDIAN_GHOSTCLAW_BRAIN/14_SOURCE_OF_TRUTH.md",
  "_OBSIDIAN_GHOSTCLAW_BRAIN/16_STATUS_BOARD.md",
  "_OBSIDIAN_GHOSTCLAW_BRAIN/17_ACCEPTANCE_CRITERIA.md",
  "_OBSIDIAN_GHOSTCLAW_BRAIN/18_BUILD_LANES.md",
  "docs/OPUS_ARCHITECTURE_FIRST_WORKFLOW.md",
  "GHOSTCLAW/MASTER.md",
  "GHOSTCLAW/FLEET_ORCHESTRATOR.md",
  "GHOSTCLAW/COMMAND_BROKER.md",
  "GHOSTCLAW/protocols/A2A2A_PROTOCOL.md",
  "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_ARCHITECTURE_INPUT_WORKSHEET_2026-06-29.md",
]
missing = [p for p in paths if not Path(p).exists()]
if missing:
    raise SystemExit("missing: " + ", ".join(missing))
print("context files present:", len(paths))
PY
```

Expected: `context files present: 13`.

### Task 3: Create Architecture Packet

**Files:**
- Create: `docs/knowledge/SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md`

- [ ] **Step 1: Write the packet with the required sections**

Create the file with these exact top-level sections:

```markdown
# Architecture Packet: GHOSTCLAW LANE_1

## Goal

## Current State

## Proposed Architecture

## Interface Contracts

## Data Model Changes

## Lane Assignments

## Risk Assessment

## Dependencies

## Rollback Plan

## Hermes Routing Recommendation
```

Expected: every section is filled from local evidence and clearly marks
unavailable artifacts as blockers.

- [ ] **Step 2: Include explicit non-actions**

The packet must state:

```text
No deploy.
No push.
No provider call.
No runtime queue execution.
No database migration.
No v3.3 backend merge until exact artifact exists.
No LANE_2 build until Hermes approval.
```

Expected: readers cannot confuse the architecture packet with execution
approval.

### Task 4: Review Acceptance Criteria

**Files:**
- Read: `_OBSIDIAN_GHOSTCLAW_BRAIN/17_ACCEPTANCE_CRITERIA.md`
- Modify after approval: `_OBSIDIAN_GHOSTCLAW_BRAIN/16_STATUS_BOARD.md`
- Modify after approval: `_OBSIDIAN_GHOSTCLAW_BRAIN/15_DECISION_LOG.md`

- [ ] **Step 1: Check packet sections against acceptance criteria**

Run:

```bash
rg -n '^## (Goal|Current State|Proposed Architecture|Interface Contracts|Data Model Changes|Lane Assignments|Risk Assessment|Dependencies|Rollback Plan|Hermes Routing Recommendation)$' docs/knowledge/SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md
```

Expected: all ten headings are present.

- [ ] **Step 2: Record Hermes decision only after review**

If Hermes approves, update `_OBSIDIAN_GHOSTCLAW_BRAIN/15_DECISION_LOG.md` with a
decision that includes the packet path, remaining blockers, and whether Codex is
allowed to create the LANE_2 build plan.

Expected: no decision claims approval before review.

### Task 5: Verify And Report

**Files:**
- Read: all changed files

- [ ] **Step 1: Run safe verification**

Run:

```bash
python3 -m json.tool _A2A_QUEUE/inbox/packet_011_ghostclaw_lane1_opus_architecture.json > /dev/null
node scripts/check-operating-files.mjs
git diff --check
```

Expected: all commands pass.

- [ ] **Step 2: Append Obsidian pulse**

Run:

```bash
python3 /Users/sirinx/SIRINXDev/sirinx-agent-native-os/scripts/a2a/a2a_obsidian_sync.py \
  --title "GhostClaw LANE_1 architecture packet" \
  --summary "Docs-only architecture packet prepared or reviewed; no deploy, push, provider call, migration, runtime queue execution, or secret read." \
  --source "/Users/sirinx/sirinx-os/docs/knowledge/SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md" \
  --next-action "Hermes decides whether Codex may start LANE_2 build planning."
```

Expected: digest append succeeds without secrets or raw logs.

- [ ] **Step 3: Prepare final report**

Report:

```text
status=<READY_FOR_HERMES_REVIEW|APPROVED_FOR_LANE_2|REVISION_REQUIRED>
task=GhostClaw LANE_1 Opus architecture packet
files=<packet and status paths>
tests=<commands and results>
blockers=<remaining blockers>
next_step=<single next safe action>
dry_run=true
live_send=false
provider_call=false
deploy=false
push=false
```

Expected: report is local-only and not live-sent.
