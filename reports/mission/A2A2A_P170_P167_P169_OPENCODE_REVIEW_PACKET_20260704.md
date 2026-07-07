# A2A2A P170 P167-P169 OpenCode Review Packet

Status: `P170_READY_FOR_OPENCODE_READ_ONLY_REVIEW`

## Scope

- Review worker: `OpenCode_Reviewer`
- Mutation allowed: `false`
- Current exact gate: `APPROVE_A2A2A_P167_ACTIVE_FOCUS_QUEUE_REFRESH_WRITE_ONLY`
- Selected packet: `packet_078`
- Target queue path: `_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json`
- Active focus: `sirinx.co`, `AGM AutoFlow`

## Result

P170 prepares a read-only OpenCode review packet for P167, P168, and P169 artifacts. It does not run OpenCode, call a model/provider, consume P167, execute the guard command, or write packet_078.

## Review Targets

- `.ghostclaw_runtime/a2a2a/evidence/A2A2A-P167-ACTIVE-FOCUS-QUEUE-REFRESH-GATE-20260704.json`
- `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P167-ACTIVE-FOCUS-QUEUE-REFRESH-GATE-20260704.json`
- `.ghostclaw_runtime/a2a2a/evidence/A2A2A-P167-PACKET078-QUEUE-REFRESH-PREVIEW-20260704.json`
- `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P167-PACKET078-QUEUE-REFRESH-GUARD-20260704.json`
- `.ghostclaw_runtime/a2a2a/commands/A2A2A-P167-PACKET078-QUEUE-REFRESH-WRITE-GUARD-20260704.sh`
- `.ghostclaw_runtime/a2a2a/status/A2A2A-P168-P167-QUEUE-REFRESH-GATE-STATUS-20260704.json`
- `.ghostclaw_runtime/a2a2a/status/A2A2A-P169-P167-QUEUE-REFRESH-TEAM-HANDOFF-20260704.json`

## Review Checklist

- Verify current gate exact phrase is P167.
- Verify packet_078 has not been written.
- Verify preview checksum matches receipts.
- Verify guard command requires the exact gate and refuses overwrite.
- Verify P169 keeps Codex blocked until packet_078 exists.
- Verify no external actions were performed.

## Artifacts

- Review packet: `.ghostclaw_runtime/a2a2a/reviews/A2A2A-P170-P167-P169-OPENCODE-REVIEW-PACKET-20260704.json`
- Receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P170-P167-P169-OPENCODE-REVIEW-PACKET-20260704.json`

## Blocked Actions Preserved

No live Telegram send, provider/model call, repo/customer data external routing, secret read/print, install, commit, push, deploy, Cloudflare/R2 mutation, queue payload execution, worker envelope write, worker execution, guard execution, or packet_078 write was performed.

## Next Safe Action

OpenCode may review the listed artifacts read-only and return PASS/WARN/BLOCKED. P167 remains the only gate that may write packet_078 locally.
