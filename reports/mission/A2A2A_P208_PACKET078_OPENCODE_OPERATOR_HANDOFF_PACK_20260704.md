# A2A2A P208 Packet 078 OpenCode Operator Handoff Pack

Status: `ready_for_manual_paste_and_bounded_watch`

## Purpose

P208 creates a checksum-guarded local helper script for the `packet_078` OpenCode handoff. It bridges the manual UI step without giving Codex permission to create the P185 candidate, P175 real result, `packet_078`, P193 guard, worker envelope, provider call, live message, commit, push, deploy, or Cloudflare/R2 mutation.

## Operator Commands

Copy the canonical P195 prompt to clipboard:

```bash
bash .ghostclaw_runtime/a2a2a/commands/A2A2A-P208-PACKET078-OPENCODE-OPERATOR-HANDOFF-20260704.sh --copy
```

After manually pasting the prompt into OpenCode, run the bounded watcher:

```bash
bash .ghostclaw_runtime/a2a2a/commands/A2A2A-P208-PACKET078-OPENCODE-OPERATOR-HANDOFF-20260704.sh --watch-after-paste
```

## Current Result

- Prompt exists: `true`
- Prompt SHA256: `26598f7a8112d5457f93494768696e1b5d6293817d3c43a7d3e7568a2e0552b5`
- P208 command script exists: `true`
- P185 candidate exists: `false`
- P175 real result exists: `false`
- `packet_078` exists: `false`
- P193 guard exists: `false`

## Artifacts

- P208 status: `.ghostclaw_runtime/a2a2a/status/A2A2A-P208-PACKET078-OPENCODE-OPERATOR-HANDOFF-PACK-20260704.json`
- P208 receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P208-PACKET078-OPENCODE-OPERATOR-HANDOFF-PACK-20260704.json`
- P208 command: `.ghostclaw_runtime/a2a2a/commands/A2A2A-P208-PACKET078-OPENCODE-OPERATOR-HANDOFF-20260704.sh`

## Verification

- P208 targeted tests passed:
  - prompt present -> writes checksum-guarded helper only
  - prompt missing -> blocks and does not write helper script
- `python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_ghostclaw_a2a_agent_orchestrator WORKSPACE_SCAFFOLD.tests.test_ghostclaw_loop_harness_validate WORKSPACE_SCAFFOLD.tests.test_ghostclaw_a2a_role_worker` passed: 148 tests.
- `python3 -m py_compile scripts/ghostclaw_a2a_agent_orchestrator.py` passed.
- `bash -n .ghostclaw_runtime/a2a2a/commands/A2A2A-P208-PACKET078-OPENCODE-OPERATOR-HANDOFF-20260704.sh` passed.
- `node scripts/secret-scan.mjs` passed with no findings.
- `git diff --check -- scripts/ghostclaw_a2a_agent_orchestrator.py WORKSPACE_SCAFFOLD/tests/test_ghostclaw_a2a_agent_orchestrator.py reports/mission/A2A2A_P208_PACKET078_OPENCODE_OPERATOR_HANDOFF_PACK_20260704.md` passed.
- JSON parse checks passed for P208 status and receipt.
- Absence checks passed for P185 candidate, P175 real result, `packet_078`, and P193 guard.

## Blocked Actions Preserved

No candidate review result write by Codex, real review-result write, queue write, P193 guard write, worker envelope write, worker execution, live Telegram send, provider/model call, repo/customer-data external routing, secret read/print, install, commit, push, deploy, or Cloudflare/R2 mutation was performed.

## Next Safe Action

Run the P208 `--copy` command, paste into OpenCode, then run P208 `--watch-after-paste`. If OpenCode writes a valid P185 candidate, the watcher will refresh P206/P207 and surface the exact P193 candidate-copy gate.
