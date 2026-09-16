# A2A2A P154 Loop Harness Manifest Validator

## Status

PASS.

## Purpose

P154 turns the Loop-Engineered Harness Addendum into a deterministic local validation surface. It validates the harness manifest before any OpenCode review or worker loop is allowed.

## Added

- `scripts/ghostclaw_loop_harness_validate.py`
- `WORKSPACE_SCAFFOLD/tests/test_ghostclaw_loop_harness_validate.py`

## Validator Coverage

The validator checks:

- required manifest fields from `docs/harness/loop_harness_manifest.schema.json`
- allowed manifest mode
- `max_iterations` hard cap of 5
- active focus includes `sirinx.co` and `AGM AutoFlow`
- paused scopes are not active
- allowed paths stay limited to harness docs, reports, receipts, evidence, and reviews
- secret-like paths are blocked
- high-risk stop gates are present
- JSON parse, secret scan, and diff check commands are required
- reviewer is separate from worker
- reviewer mutation is blocked
- receipt-per-iteration policy is explicit

## Artifacts

- Evidence: `.ghostclaw_runtime/a2a2a/evidence/A2A2A-P154-LOOP-HARNESS-MANIFEST-VALIDATOR-20260704.json`
- Receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P154-LOOP-HARNESS-MANIFEST-VALIDATOR-20260704.json`
- OpenCode review packet: `.ghostclaw_runtime/a2a2a/reviews/A2A2A-P154-LOOP-HARNESS-OPENCODE-REVIEW-PACKET-20260704.json`

## OpenCode Review Mode

The generated review packet is read-only:

- mutation allowed: no
- source edits: blocked
- queue write: blocked
- worker loop: blocked
- provider call: blocked
- live send: blocked
- commit/push/deploy: blocked

## Guardrails Preserved

No queue packet write, queue payload execution, worker envelope write, ACK execution, live Telegram send, provider/model call, repo/customer-data external routing, secret read/print, install, commit, push, deploy, or Cloudflare/R2 mutation was performed.

## Next Safe Action

OpenCode may review the P154 packet read-only. Codex must still wait for:

`APPROVE_A2A2A_P143_ACTIVE_FOCUS_QUEUE_REPLENISH_WRITE_ONLY`

before writing `packet_077`.
