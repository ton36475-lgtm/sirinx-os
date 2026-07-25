# SIRINX Active Goal Read-Only Probe Runner - 2026-06-29

Status: `ACTIVE_GOAL_READ_ONLY_PROBE_RUNNER_LOCAL_ONLY`

This runner makes active-goal blocker probes reproducible without opening any
external action gate.

```text
claims_goal_complete=false
claims_all_chats_read=false
clears_blockers=false
local_read_only=true
```

## Scope

The runner:

- scans allowed roots by filename metadata only for `ghostclaw_repo_merge_kit_v3_3.zip`;
- scans allowed roots by filename metadata only for ChatGPT export candidates;
- performs a TCP connect probe against the Hermes gateway host and port;
- writes a local JSON report when `--output` is supplied.

No secret file contents are read.

## Current Report

Latest local report:

```text
WORKSPACE_SCAFFOLD/reports/active_goal_read_only_probe_latest_2026-06-29.json
```

Current result from the latest report:

```text
exact_v3_3_artifact_found=false
chat_export_candidate_found=false
hermes_gateway_available=false
hermes_gateway_error=ConnectionRefusedError
```

## Command

```bash
python3 WORKSPACE_SCAFFOLD/scripts/probe_active_goal_blockers.py \
  --output WORKSPACE_SCAFFOLD/reports/active_goal_read_only_probe_latest_2026-06-29.json
```

## Non-Actions

No deploy, push, cloud mutation, customer send, secret read, paid/provider call, runtime queue execution, merge script, install, migration, wallet action, or live send is performed.

This is not a blocker clearance packet. If a candidate appears, the relevant
gate-specific validator still has to pass before any blocker state changes.

## Verification

```bash
python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_active_goal_read_only_probe_runner -v
python3 -m json.tool data/pathspecs/sirinx_active_goal_read_only_probe_runner_2026-06-29.json > /dev/null
python3 -m json.tool WORKSPACE_SCAFFOLD/reports/active_goal_read_only_probe_latest_2026-06-29.json > /dev/null
```
