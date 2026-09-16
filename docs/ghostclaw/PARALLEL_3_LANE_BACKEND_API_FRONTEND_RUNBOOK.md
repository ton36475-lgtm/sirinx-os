# Parallel 3-Lane Backend/API/Frontend Runbook

Mission: `GC-PARALLEL-3LANE-BE-API-FE-20260630-001`

This runbook coordinates Hermes, Codex, OpenCode, and Validator work for a
strict backend -> API -> frontend packet flow. It is local-safe only: no push,
deploy, install, secret read, provider batch call, model download, or GPU-heavy
job is allowed.

## Lane Model

- Hermes Commander: owns status, queue, locks, receipts, evidence, and policy.
- Codex Builder: the only source-mutating builder, and only with a file lease.
- OpenCode Reviewer: read-only snapshot reviewer, one packet behind Codex.
- Validator Worker: validates completed Codex packets and writes evidence.

OpenCode must not edit source files, stage, commit, install, push, deploy, or
read secrets. It may only write `.ghostclaw_runtime/a2a2a/reviews/**` after a
Hermes unlock.

## Packet Order

1. `P01-backend-domain-schema`
2. `P02-backend-service-logic`
3. `P03-api-contract-freeze`
4. `P04-api-route-handler`
5. `P05-api-client-wiring`
6. `P06-frontend-state-hooks`
7. `P07-frontend-components`
8. `P08-frontend-pages-one-by-one`
9. `P09-local-uat-ready`

Only one layer may be edited in a packet. Page packets must lock one page file
at a time.

## Current State

The coordination scaffold is ready. Source mutation has not started.

- Current packet: `P01-backend-domain-schema`
- Current status: `queued_waiting_for_file_lease`
- Active file lease: none
- Active page lock: none
- OpenCode provider invocation by Codex: false
- Stagehand/local UAT: blocked until a page packet is ready

## Before Codex Edits Any Source File

1. Read the target file.
2. Inspect the current git diff for that exact file.
3. Acquire a Hermes file lease.
4. Confirm the layer lock.
5. Confirm page lock if a page file is involved.
6. Patch minimal scope only.
7. Preserve existing exports and architecture comments.
8. Avoid unrelated reformatting.

If a conflict is found, stop editing, write a conflict receipt, release the
unsafe lease, and requeue through Hermes.

## Validation After Each Packet

Run only local checks:

```bash
git status --short
git diff --stat
git diff --check
```

Also validate any created JSON files with `python3 -m json.tool`, validate YAML
if available, and run `python3 -m py_compile` only for Python scripts created
by that packet.

Use npm/pnpm/yarn lint/test/typecheck only if already configured and
dependencies are already installed. Do not install dependencies to satisfy a
packet.

## Commit Gate

Local commit is allowed only after:

- all Codex packets complete or are safely blocked
- Validator report exists
- OpenCode review is `PASS` or `WARN` with no blocking issue
- no lease conflicts exist
- no secret leak exists
- no push/deploy/install/provider/model-download/GPU-heavy job occurred

Current commit state: `not_committed`. Reason: source packets are queued and
OpenCode review has not produced `PASS` or non-blocking `WARN`.

## Required Status Files

- `.ghostclaw_runtime/a2a2a/status/current_mission.json`
- `.ghostclaw_runtime/a2a2a/status/lane_status.json`
- `.ghostclaw_runtime/a2a2a/status/layer_sequence_status.json`
- `.ghostclaw_runtime/a2a2a/status/page_sequence_manifest.json`
- `.ghostclaw_runtime/a2a2a/status/file_ownership_manifest.json`
- `.ghostclaw_runtime/a2a2a/receipts/live_parallel_coordination_receipt.json`
- `.ghostclaw_runtime/a2a2a/evidence/parallel_lane_observe.json`
