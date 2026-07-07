# A2A2A P188 Packet 078 Compact Candidate Status

Status: `recorded_compact_candidate_status`

## Purpose

P188 wires the P187 candidate-call state into compact orchestrator output. This prevents the sidebar/OpenCode lane from drifting back to the real P175 review-result path while the candidate review result is still missing.

## Compact Routing Result

- Compact key: `opencode_candidate_call_status`
- OpenCode lane next action: `write_packet078_candidate_review_result_read_only`
- Candidate result path: `.ghostclaw_runtime/a2a2a/reviews/A2A2A-P185-PACKET078-OPENCODE-REVIEW-CANDIDATE-20260704.json`
- Real result path remains blocked: `.ghostclaw_runtime/a2a2a/reviews/A2A2A-P175-PACKET078-TRANSITION-OPENCODE-REVIEW-RESULT-20260704.json`
- Target queue path remains blocked: `_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json`

## Artifacts

- Compact candidate status: `.ghostclaw_runtime/a2a2a/status/A2A2A-P188-PACKET078-COMPACT-CANDIDATE-STATUS-20260704.json`
- Receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P188-PACKET078-COMPACT-CANDIDATE-STATUS-20260704.json`
- Source candidate-call status: `.ghostclaw_runtime/a2a2a/status/A2A2A-P187-PACKET078-CANDIDATE-CALL-STATUS-20260704.json`

## Safety State

No candidate result write, real review-result write, `packet_078` queue write, P167 guard execution, P173 guard creation/execution, worker envelope write, worker execution, live Telegram send, provider/model call, repo/customer-data external routing, secret read/print, install, commit, push, deploy, or Cloudflare/R2 mutation was performed.

## Next Safe Action

OpenCode writes the candidate review result to the candidate path. Then rerun P185 candidate preflight before any real result-path write or `packet_078` queue write.
