# SIRINX Agent Loop Runtime v1

## Goal

Create a real closed-loop agent runtime for Hermes and Telegram commands:

`discovery -> planning -> execution -> verification -> iteration -> evidence`

This is not an open-ended autonomous shell. The runtime uses a bounded Codex task runner and writes audit logs.

## Loop Model

### Single Agent Loop

1. Discovery: inspect runtime foundation and classify the goal.
2. Planning: choose a short allowlisted task plan.
3. Execution: run local tasks through `runCodexTask`.
4. Verification: summarize pass/fail state.
5. Iteration: request targeted retry only when a task fails.
6. Evidence: append a local JSONL runtime log.

### Fleet Loop

`goal -> breakdown -> assign -> local loop -> merge -> evaluate -> targeted retry -> ship`

The first implementation keeps the fleet loop local and closed. Later panels can use Hermes Model Council/Fusion, but only through explicit provider gates.

## Current Task Mapping

| Goal class | Tasks |
|---|---|
| Fusion readiness | `test:runtime-foundation`, `test:fusion`, `audit:secrets` |
| Workspace verification | `status`, `verify`, `audit:secrets` |
| Dirty/diff review | `status`, `diff` |
| Default status loop | `status`, `diff` |

## Telegram Commands

- `/commands`
- `/status`
- `/fusion smoke`
- `/codex status`
- `/codex run status`
- `/agent loop status`
- `/agent loop fusion`
- `/daily report`

## Non-goals

- no arbitrary command execution from chat
- no deploy from chat
- no push from chat
- no publish from chat
- no secret printing

## Evidence

Runtime logs are written under:

- `.hermes/runtime/codex-task-runs.jsonl`
- `.hermes/runtime/agent-loop-runs.jsonl`
- `.hermes/runtime/runtime-foundation-status.json`
