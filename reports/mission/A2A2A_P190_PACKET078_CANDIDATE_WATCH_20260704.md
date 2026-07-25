# A2A2A P190 Packet 078 Candidate Watch

Status: `waiting_for_opencode_candidate`

## Purpose

P190 adds a local-safe candidate watcher for the packet_078 OpenCode review handoff. It checks whether the candidate result exists, whether it passes P185 preflight, and whether unsafe paths like the real P175 result, `packet_078`, or P173 guard appeared too early.

## Current State

- Candidate result exists: `false`
- Candidate ready for real result path: `false`
- Real P175 result exists: `false`
- `packet_078` exists: `false`
- P173 guard exists: `false`
- P187/P189 handoff state: manual OpenCode paste still required

## Artifacts

- P190 status: `.ghostclaw_runtime/a2a2a/status/A2A2A-P190-PACKET078-CANDIDATE-WATCH-20260704.json`
- P190 receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P190-PACKET078-CANDIDATE-WATCH-20260704.json`
- OpenCode prompt: `.ghostclaw_runtime/a2a2a/reviews/A2A2A-P186-OPENCODE-CANDIDATE-PROMPT-READY.txt`

## Blocked Actions Preserved

No candidate result write by Codex, real review-result write, `packet_078` queue write, P167 guard execution, P173 guard creation/execution, worker envelope write, worker execution, live Telegram send, provider/model call, repo/customer-data external routing, secret read/print, install, commit, push, deploy, or Cloudflare/R2 mutation was performed.

## Next Safe Action

Manually paste/run the P186 prompt in OpenCode. After the candidate file appears, rerun P190/P185. If P190 reports `candidate_ready_for_exact_real_result_gate`, use a separate exact gate before copying the candidate to the real P175 result path.
