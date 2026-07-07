# A2A2A P183 Packet 078 Compact Release Watch

Status: `waiting_for_opencode_review_result`

## Purpose

P183 wires the packet_078 P167 release watch into the compact orchestrator status used by Hermes/Codex/OpenCode sidebar handoff. This prevents the generic OpenCode review lane from hiding the current packet_078 blocker when P167 is already escrowed.

## Current State

- Compact status includes `packet078_release_watch`
- OpenCode lane next action: `write_packet078_review_result_read_only`
- Release sequence allowed: `false`
- Exact P167 ready to surface: `false`
- Exact P167 consumed: `false`
- Command to execute now: `null`
- Hold reason: `opencode_review_result_missing`
- `packet_078` exists: `false`

## Artifacts

- Compact status: `.ghostclaw_runtime/a2a2a/status/A2A2A-P183-PACKET078-COMPACT-RELEASE-WATCH-20260704.json`
- Receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P183-PACKET078-COMPACT-RELEASE-WATCH-20260704.json`
- Source watch: `.ghostclaw_runtime/a2a2a/status/A2A2A-P182-PACKET078-P167-RELEASE-WATCH-20260704.json`

## Decision

When P167 escrow is active, packet_078 review takes priority in the compact OpenCode lane. Loop Harness review remains available when there is no active P167 escrow. This keeps the current blocker visible without executing any gate.

## Blocked Actions Preserved

No P167 guard execution, `packet_078` queue write, P173 guard execution, worker envelope write, worker execution, live Telegram send, provider/model call, secret read/print, install, commit, push, deploy, or Cloudflare/R2 mutation was performed.

## Next Safe Action

OpenCode must write the real read-only review result file. Then rerun P176/P181/P182 before any P167 queue write.
