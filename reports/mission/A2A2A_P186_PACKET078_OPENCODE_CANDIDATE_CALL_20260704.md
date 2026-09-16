# A2A2A P186 Packet 078 OpenCode Candidate Call

Status: `ready_for_opencode_candidate_review`

## Purpose

P186 creates a local-safe call packet for OpenCode to produce a candidate review result for `packet_078`. This keeps reviewer output separate from Codex/Hermes control artifacts and prevents the real P175 review-result path from being written before candidate preflight passes.

## Paths

- Call packet: `.ghostclaw_runtime/a2a2a/reviews/A2A2A-P186-PACKET078-OPENCODE-CANDIDATE-CALL-20260704.json`
- Candidate result path for OpenCode: `.ghostclaw_runtime/a2a2a/reviews/A2A2A-P185-PACKET078-OPENCODE-REVIEW-CANDIDATE-20260704.json`
- Real result path still blocked: `.ghostclaw_runtime/a2a2a/reviews/A2A2A-P175-PACKET078-TRANSITION-OPENCODE-REVIEW-RESULT-20260704.json`
- Target queue path still blocked: `_A2A_QUEUE/outbox/packet_078_sirinx_agm_next_local_task_card.json`
- Current P185 preflight: `.ghostclaw_runtime/a2a2a/status/A2A2A-P185-PACKET078-OPENCODE-REVIEW-CANDIDATE-PREFLIGHT-20260704.json`

## OpenCode Instruction

OpenCode may write only the candidate result path. It must not write the real result path, write `packet_078`, execute P167/P173, write worker envelopes, call providers from the Codex lane, send live messages, read secrets, install, commit, push, deploy, or mutate Cloudflare/R2.

For a pass, the candidate result must include:

- `review_worker = OpenCode_Reviewer`
- `status = REVIEW_PASS_READY_FOR_EXACT_P167`
- `mutation_allowed = false`
- `blocking_issues = []`
- `target_queue_path_exists = false`
- all external action flags set to `false`

If evidence does not support a pass, OpenCode should write a candidate with `REVIEW_WARN_BLOCKING_ISSUES` or `REVIEW_FAIL_BLOCKING_ISSUES` and list the blocking issues.

## Current Safety State

- Candidate result written by Codex: `false`
- Real result path exists: `false`
- `packet_078` exists: `false`
- P173 guard command exists: `false`
- Live/provider/secret/install/commit/push/deploy/cloud actions performed: `false`

## Next Safe Action

OpenCode writes the candidate review result to the candidate path. Then rerun P185 candidate preflight. If P185 passes, use a separate exact gate before copying candidate content to the real P175 review-result path.
