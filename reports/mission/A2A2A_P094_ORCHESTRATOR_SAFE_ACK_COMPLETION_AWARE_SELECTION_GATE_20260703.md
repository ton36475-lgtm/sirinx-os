# A2A2A P094 Orchestrator Safe Ack Completion-Aware Selection Gate

Status: `READY_FOR_EXACT_IMPLEMENTATION_APPROVAL`

## Finding

P091 fixed in-flight packet detection, but the selector still counts only safety-blocked ack statuses as completion. Existing safe local ack receipts use:

- Hermes: `routed_local_only`
- KOB: `kob_allow_local_ack_only`

Because those statuses are ignored, packet 043 can be selected again even though matching Hermes/KOB local-safe receipts already exist.

## Proposed Patch

Patch preview:

`.ghostclaw_runtime/a2a2a/evidence/A2A2A-P094-ORCHESTRATOR-SAFE-ACK-COMPLETION-AWARE-SELECTION-PATCH-PREVIEW-20260703.diff`

The patch:

- Adds `routed_local_only` and `kob_allow_local_ack_only` as completion statuses.
- Counts them only when the receipt `packet_path` matches the latest Hermes/KOB worker envelope.
- Keeps stale receipt behavior safe: stale receipts become `worker_envelopes_inflight_ack_pending`, not completion.
- Adds two regression tests for safe ack and stale ack behavior.

## Validation

- `git apply --check --whitespace=error-all` passed for the patch preview.
- Baseline source compile passed.
- Baseline focused orchestrator test passed: 6 tests.
- Temp simulation applied the patch in `/tmp/a2a2a-p094-sim.qclaOf`.
- Temp patched focused orchestrator test passed: 8 tests.
- Real source files still do not contain P094 markers.

## Simulation Result

Patched selector against the current repo shows:

- `packet_042`: `worker_envelopes_inflight_ack_pending` because current latest worker envelopes exist, but receipts point to older 20260702 envelopes.
- `packet_043`: completed by matching `routed_local_only` + `kob_allow_local_ack_only` receipts.
- `packet_044`: completed by matching `routed_local_only` + `kob_allow_local_ack_only` receipts.
- `packet_045`: completed by matching `routed_local_only` + `kob_allow_local_ack_only` receipts.
- `summary.next_packet`: `null`
- `ready_active_packets`: `0`

This is the expected safe result: no new packet should be prepared until packet 042 current ack is reconciled.

## Required Gate

To apply the patch to source, use exactly:

`APPROVE_IMPLEMENTATION A2A2A_P094_ORCHESTRATOR_SAFE_ACK_COMPLETION_AWARE_SELECTION`

## Not Performed

No source mutation, role worker run, queue payload execution, live Telegram send, provider/model call, external routing, install, commit, push, deploy, secret read/print, or Cloudflare/R2 mutation was performed.
