# A2A2A P201 Packet 078 OpenCode Post-Handoff Router

Status: `waiting_for_opencode_candidate`

## Purpose

P201 is a local-safe router for the moment after the P195/P200 handoff. It combines P200 handoff readiness, P185 candidate preflight, P193 copy-gate readiness, and P194 sequence status into one next-action surface.

## Current State

- P200 handoff readiness: `ready_for_manual_opencode_paste`
- P185 candidate preflight: `waiting_for_candidate_review_result`
- P193 candidate copy gate: `waiting_for_opencode_candidate`
- P194 sequence status: `waiting_for_opencode_candidate`
- Candidate result exists: `false`
- Real P175 result exists: `false`
- `packet_078` exists: `false`
- P173 guard exists: `false`
- P193 guard exists: `false`

## Router Decision

Next action: `paste_p195_prompt_into_opencode`

The candidate path is still absent:

`.ghostclaw_runtime/a2a2a/reviews/A2A2A-P185-PACKET078-OPENCODE-REVIEW-CANDIDATE-20260704.json`

## After Candidate Appears

Run P201 again. If the candidate passes P185 preflight, P201 will route to:

`ready_for_exact_p193_candidate_copy_gate`

At that point, a separate exact P193 approval is still required before writing the real P175 review result path.

## Blocked Actions Preserved

No candidate result write by Codex, real review-result write, `packet_078` queue write, P173/P193 guard write, worker envelope write, worker execution, live Telegram send, provider/model call, repo/customer-data external routing, secret read/print, install, commit, push, deploy, or Cloudflare/R2 mutation was performed.

## Evidence

- Status: `.ghostclaw_runtime/a2a2a/status/A2A2A-P201-PACKET078-OPENCODE-POST-HANDOFF-ROUTER-20260704.json`
- Receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P201-PACKET078-OPENCODE-POST-HANDOFF-ROUTER-20260704.json`
