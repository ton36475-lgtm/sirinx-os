# A2A2A P187 Packet 078 Candidate Call Status

Status: `waiting_for_opencode_candidate`

## Current State

OpenCode candidate review has been called through the P186 local-safe handoff, but the candidate result file is not present yet.

- Candidate call packet exists: `true`
- Candidate prompt exists: `true`
- Candidate result exists: `false`
- Real P175 review result exists: `false`
- `packet_078` exists: `false`
- P173 guard command exists: `false`
- P185 preflight status: `waiting_for_candidate_review_result`
- P185 issue: `candidate_review_result_missing`

## P167 Handling

`APPROVE_A2A2A_P167_ACTIVE_FOCUS_QUEUE_REFRESH_WRITE_ONLY` is treated as escrowed, not consumed.

Reason: OpenCode has not written the candidate review result yet. The queue write stays blocked until candidate preflight passes and a separate exact gate handles any real result-path transition.

## Paths

- Candidate call packet: `.ghostclaw_runtime/a2a2a/reviews/A2A2A-P186-PACKET078-OPENCODE-CANDIDATE-CALL-20260704.json`
- Candidate prompt: `.ghostclaw_runtime/a2a2a/reviews/A2A2A-P186-OPENCODE-CANDIDATE-PROMPT-READY.txt`
- Candidate result path: `.ghostclaw_runtime/a2a2a/reviews/A2A2A-P185-PACKET078-OPENCODE-REVIEW-CANDIDATE-20260704.json`
- Real result path: `.ghostclaw_runtime/a2a2a/reviews/A2A2A-P175-PACKET078-TRANSITION-OPENCODE-REVIEW-RESULT-20260704.json`
- Target queue path: `_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json`

## Blocked Actions Preserved

No candidate result write by Codex, real review-result write, `packet_078` queue write, P167 guard execution, P173 guard creation/execution, worker envelope write, worker execution, live Telegram send, provider/model call, repo/customer-data external routing, secret read/print, install, commit, push, deploy, or Cloudflare/R2 mutation was performed.

## Next Safe Action

OpenCode writes the candidate review result to the candidate path. Then rerun P185 candidate preflight before any real result-path write or `packet_078` queue write.
