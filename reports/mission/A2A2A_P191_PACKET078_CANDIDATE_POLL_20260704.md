# A2A2A P191 Packet 078 Candidate Poll

Status: `waiting_for_opencode_candidate`

## Purpose

P191 adds a bounded local poll gate for the packet_078 OpenCode candidate-review handoff. It repeatedly calls the P190 watcher for a capped number of attempts and stops early when the candidate becomes ready or a blocker appears.

## Current State

- Poll attempts observed: `1`
- Candidate result exists: `false`
- Candidate ready for real result path: `false`
- Real P175 result exists: `false`
- `packet_078` exists: `false`
- P173 guard exists: `false`
- Final watch status: `waiting_for_opencode_candidate`

## Artifacts

- P191 status: `.ghostclaw_runtime/a2a2a/status/A2A2A-P191-PACKET078-CANDIDATE-POLL-20260704.json`
- P191 receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P191-PACKET078-CANDIDATE-POLL-20260704.json`
- P190 status: `.ghostclaw_runtime/a2a2a/status/A2A2A-P190-PACKET078-CANDIDATE-WATCH-20260704.json`
- OpenCode prompt: `.ghostclaw_runtime/a2a2a/reviews/A2A2A-P186-OPENCODE-CANDIDATE-PROMPT-READY.txt`

## Blocked Actions Preserved

No candidate result write by Codex, real review-result write, `packet_078` queue write, P167 guard execution, P173 guard creation/execution, worker envelope write, worker execution, live Telegram send, provider/model call, repo/customer-data external routing, secret read/print, install, commit, push, deploy, or Cloudflare/R2 mutation was performed.

## Next Safe Action

Paste/run the P186 prompt in OpenCode. Then rerun P191/P190/P185. If P191 reports `candidate_ready_for_exact_real_result_gate`, use a separate exact gate before copying the candidate to the real P175 result path.
