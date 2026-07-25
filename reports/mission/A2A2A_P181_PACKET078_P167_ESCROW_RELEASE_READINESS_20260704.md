# A2A2A P181 Packet 078 P167 Escrow Release Readiness

Status: `waiting_for_opencode_review_result`

## Purpose

P181 combines the P180 deferred approval escrow with the P176 OpenCode review-result intake. It decides whether the escrowed P167 approval can be surfaced for operator execution after review, without executing the P167 guard.

## Current State

- Escrow status: `approval_accepted_pending_opencode_review`
- P176 intake status: `waiting_for_opencode_review_result`
- Exact P167 ready to surface: `false`
- Exact P167 consumed: `false`
- Command to execute now: `null`
- Hold reason: `opencode_review_result_missing`
- `packet_078` exists: `false`

## Artifacts

- Readiness: `.ghostclaw_runtime/a2a2a/status/A2A2A-P181-PACKET078-P167-ESCROW-RELEASE-READINESS-20260704.json`
- Receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P181-PACKET078-P167-ESCROW-RELEASE-READINESS-20260704.json`
- Source escrow: `.ghostclaw_runtime/a2a2a/status/A2A2A-P180-PACKET078-P167-DEFERRED-APPROVAL-ESCROW-20260704.json`

## Decision

P181 preserves the approval and keeps it unreleased. Once OpenCode writes a real passing read-only review result, P176 can pass and P181 can surface the escrowed P167 approval check command for a separate operator decision.

## Blocked Actions Preserved

No P167 guard execution, `packet_078` queue write, P173 guard execution, worker envelope write, worker execution, live Telegram send, provider/model call, secret read/print, install, commit, push, deploy, or Cloudflare/R2 mutation was performed.

## Next Safe Action

OpenCode should write the real review result file. Then rerun P176 and P181 to surface the escrowed P167 approval only if the review result passes.
