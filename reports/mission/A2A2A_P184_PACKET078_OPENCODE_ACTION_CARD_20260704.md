# A2A2A P184 Packet 078 OpenCode Action Card

Status: `ready_for_opencode_review_handoff_capsule`

## Purpose

P184 exposes the packet_078 OpenCode review handoff as a compact action card. It gives OpenCode the real review result path, template path, checklist, handoff targets, and post-review intake command without treating any template or handoff as a completed review.

## Current State

- Packet_078 release watch status: `waiting_for_opencode_review_result`
- OpenCode action card status: `ready_for_opencode_review_handoff_capsule`
- Real result path to write by reviewer: `.ghostclaw_runtime/a2a2a/reviews/A2A2A-P175-PACKET078-TRANSITION-OPENCODE-REVIEW-RESULT-20260704.json`
- Review checklist count: `8`
- Release sequence allowed: `false`
- `packet_078` exists: `false`

## Artifacts

- Action card status: `.ghostclaw_runtime/a2a2a/status/A2A2A-P184-PACKET078-OPENCODE-ACTION-CARD-20260704.json`
- Receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P184-PACKET078-OPENCODE-ACTION-CARD-20260704.json`
- Source handoff capsule: `.ghostclaw_runtime/a2a2a/reviews/A2A2A-P178-PACKET078-OPENCODE-REVIEW-HANDOFF-CAPSULE-20260704.json`
- Source template: `.ghostclaw_runtime/a2a2a/reviews/A2A2A-P177-PACKET078-OPENCODE-REVIEW-RESULT-TEMPLATE-20260704.json`

## Decision

P184 gives OpenCode a single compact action surface for the packet_078 review. It does not write the real review result and does not unlock P167. P176 remains the intake gate after OpenCode writes the result.

## Blocked Actions Preserved

No review result write, P167 guard execution, `packet_078` queue write, P173 guard execution, worker envelope write, worker execution, live Telegram send, provider/model call, secret read/print, install, commit, push, deploy, or Cloudflare/R2 mutation was performed.

## Next Safe Action

OpenCode uses the action card to write the real read-only review result. Then rerun P176/P181/P182 before any P167 queue write.
