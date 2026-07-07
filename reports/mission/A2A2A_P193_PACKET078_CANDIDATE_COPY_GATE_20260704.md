# A2A2A P193 Packet 078 Candidate Copy Gate

Status: `waiting_for_opencode_candidate`

## Purpose

P193 prepares the next local-safe gate after OpenCode writes the packet_078 candidate review result. When the candidate exists and P185 preflight passes, this gate can create a checksum-guarded command to copy the candidate result into the real P175 review-result path. It does not execute the command.

## Current State

- Candidate result exists: `false`
- Candidate ready for real result path: `false`
- Real P175 result exists: `false`
- Guard command path: `null`
- Exact gate phrase: `APPROVE_A2A2A_P193_PACKET078_CANDIDATE_TO_REAL_REVIEW_RESULT_COPY_ONLY`
- Issue: `candidate_review_result_missing`

## Artifacts

- P193 status: `.ghostclaw_runtime/a2a2a/status/A2A2A-P193-PACKET078-CANDIDATE-COPY-GATE-20260704.json`
- P193 receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P193-PACKET078-CANDIDATE-COPY-GATE-20260704.json`
- Expected command path after candidate is ready: `.ghostclaw_runtime/a2a2a/commands/A2A2A-P193-PACKET078-CANDIDATE-TO-REAL-REVIEW-RESULT-COPY-20260704.sh`

## Blocked Actions Preserved

No candidate result write by Codex, real review-result write, `packet_078` queue write, P167 guard execution, P173 guard creation/execution, worker envelope write, worker execution, live Telegram send, provider/model call, repo/customer-data external routing, secret read/print, install, commit, push, deploy, or Cloudflare/R2 mutation was performed.

## Next Safe Action

Paste/run the P186 prompt in OpenCode. Then rerun P191/P190/P185/P193. If P193 reports `ready_for_exact_candidate_copy_gate`, run the generated checksum guard only after the exact gate phrase is intentionally provided.
