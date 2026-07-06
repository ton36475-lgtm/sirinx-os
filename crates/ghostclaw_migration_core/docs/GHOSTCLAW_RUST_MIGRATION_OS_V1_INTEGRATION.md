# GhostClaw Rust Migration OS V1 Integration

## Integrated Shape

```text
Human / Telegram / CLI
  -> CommandEnvelope
  -> Rust Core Engine
  -> PolicyGuard
  -> Command Parser
  -> Lane Router
  -> Receipt Store
  -> Validator Gate
  -> Codex / Hermes / OpenCode / Cloudflare adapters later
```

## Current State

The crate is local-safe and deterministic. It can be validated with Cargo but does not run any live worker.

```bash
cd crates/ghostclaw_migration_core
cargo fmt --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test
cargo run -- '/status'
cargo run -- '/route backend_core scan repository safely'
cargo run -- '/route backend_core git push origin main'
```

## Adapter Boundary

Adapters must translate external input into `CommandEnvelope`, call the Rust `Engine`, and then return JSON-safe output. Adapters must not bypass `PolicyGuard`.

## P086 Dry-Run Adapters

| Adapter | Purpose | Live action |
|---|---|---|
| `telegram` | Convert Telegram metadata into `CommandEnvelope` | blocked |
| `codex` | Produce Codex dry-run command preview | blocked |
| `queue` | Persist route intent JSONL | no payload execution |
| `validator` | Represent deterministic validation results | local only |
| `lease` | Enforce allow/block path scopes | local only |

## P087 Persistent Adapter Parity

P087 adds fixture-backed tests around adapter output so future orchestrator work can detect drift before live gates are considered.

| Fixture | Contract |
|---|---|
| `tests/fixtures/p087/telegram_command.json` | Telegram adapter input is non-secret and `live_send=false` |
| `tests/fixtures/p087/route_job.jsonl` | Route jobs remain local-safe JSONL intent only |
| `tests/fixtures/p087/validator_result.json` | Validator aggregation records local checks and `executed_live=false` |
| `tests/fixtures/p087/lease_decision.json` | Lease decisions serialize exact path, allow status, and reason |
| `tests/fixtures/p087/queue_with_corrupt_lines.jsonl` | Queue readers report corrupt and empty lines without executing jobs |
| `tests/fixtures/p087/a2a2a_path_lease_policy.json` | Live actions stay disabled and blocked paths stay explicit |

The queue adapter now exposes `read_report()` for corruption-aware reads. `read_all()` remains available for callers that only need valid route jobs.

## P088 Response Fixture Expansion

P088 extends parity from adapter inputs to adapter responses. These fixtures make it harder for future orchestration work to accidentally convert a preview into a live action.

| Fixture | Contract |
|---|---|
| `tests/fixtures/p088/codex_dry_run_preview.json` | Codex preview remains `dry_run_preview_only` and `executed_live=false` |
| `tests/fixtures/p088/telegram_reply_preview.json` | Telegram reply preview remains `live_send=false` |
| `tests/fixtures/p088/validator_failed_result.json` | Failed validation result shape is stable and explicit |

The Telegram reply preview redacts secret-like text before JSON serialization. It does not send, poll, or store Telegram credentials.

## P089 Local Response Bundle Packet

P089 combines adapter outputs into one reviewable JSON packet. This gives Hermes, Codex, and OpenCode a single local artifact for handoff and review without enabling live execution.

| Bundle field | Source |
|---|---|
| `route_job` | Queued route intent |
| `lease_decision` | Path lease checker |
| `codex_preview` | Codex dry-run adapter |
| `telegram_reply_preview` | Telegram reply preview adapter |
| `validator_result` | Deterministic validator model |
| `receipt` | Non-sensitive receipt metadata |

Bundle status is `ready_for_review` only when the lease is allowed, validator status is `pass`, and both Codex/Telegram live flags are false. Any live flag, failed validator, or blocked lease downgrades the bundle to `blocked_or_failed`.

## P090 Bundle Writer And Read Report

P090 persists local review bundles to append-only JSONL and reads them back as summaries. It deliberately parses only stable top-level fields:

- `packet_id`
- `status`
- `live_execution`

Malformed lines are counted in `invalid_lines`, empty lines in `skipped_empty_lines`, and valid bundle summaries are returned in insertion order. Reading a bundle store never executes queued work, sends messages, calls providers, or mutates cloud resources.

## P091 Bundle Selection Helper

P091 adds a read-only helper for orchestrator selection. It chooses the first valid bundle where:

- `status` is `ready_for_review`
- `live_execution` is `false`

Blocked, failed, malformed, empty, or live-flagged bundles are not selected. The decision output preserves `invalid_lines` and `skipped_empty_lines` from the read report so Hermes/OpenCode can see corruption signals without executing payloads.

| Selection field | Contract |
|---|---|
| `status` | `selected` or `none_ready` |
| `selected` | selected bundle summary or `null` |
| `rejected_count` | valid bundles skipped before selection, or all valid bundles when none are ready |
| `reason` | stable decision reason for downstream guards |

Selection remains local-only and does not run Codex, send Telegram messages, call providers, mutate Cloudflare/R2, commit, push, or deploy.

## P092 Orchestrator Status View

P092 exposes a read-only status view for Hermes/Codex/OpenCode coordination. It combines:

- P091 bundle selection
- pending queue read-report counts
- deterministic lease decision summaries

The status view is a local artifact generator only. It does not execute queued route jobs, start workers, send Telegram messages, call model providers, mutate Cloudflare/R2, commit, push, or deploy.

| Status field | Contract |
|---|---|
| `status_id` | stable id for reports and fixtures |
| `status` | aggregate state such as `ready_for_review_bundle_available` |
| `bundle_selection` | P091 selection decision |
| `queue_status` | valid job count plus invalid/empty line counts |
| `lease_status` | allowed/blocked path-decision counts |
| `next_action` | next local-safe operator action |

The first safe next action is `route_selected_bundle_to_opencode_review` when a non-live `ready_for_review` bundle exists. If no safe bundle exists, malformed local lines and blocked leases are surfaced before waiting.

## P093 Status Snapshot Writer

P093 persists local orchestrator status views to append-only JSONL. It reads back only stable top-level metadata:

- `status_id`
- `status`
- `dry_run`
- `live_execution`
- `next_action`

The writer is intended for local audit and OpenCode/Codex handoff evidence. It does not execute the `next_action`. Malformed lines are counted in `invalid_lines`, empty lines in `skipped_empty_lines`, and valid snapshot summaries are returned in insertion order.

| Snapshot contract | Value |
|---|---|
| Persistence mode | append-only JSONL |
| Live execution | blocked |
| Secret handling | no secret reads; status text must already be redacted |
| Next action | advisory only |

## P094 Status Freshness Guard

P094 adds a read-only guard that compares the latest valid persisted status snapshot with the current `OrchestratorStatusView`. This prevents stale status evidence from being treated as the current gate.

| Freshness state | Meaning |
|---|---|
| `fresh` | latest snapshot summary exactly matches the current status summary |
| `stale` | latest snapshot exists but differs from the current status summary |
| `missing` | no valid snapshot exists, with malformed-line counts preserved |

The guard is advisory and local-only. It does not execute `next_action`, route selected bundles to OpenCode, start workers, send Telegram messages, call providers, mutate Cloudflare/R2, commit, push, or deploy.

## P095 Selected Bundle Review Packet Export

P095 exports a local review packet for OpenCode review-only lanes. It combines:

- selected bundle metadata from P091
- current orchestrator status from P092
- freshness decision from P094
- deterministic validation evidence

The packet can only become `ready_for_opencode_review` when all of these are true:

- a selected bundle exists
- freshness status is `fresh`
- validator status is `pass`
- all live execution flags are `false`

Any stale snapshot, missing bundle, failed validation, or live flag blocks the packet. The export is still a local artifact only; it does not invoke OpenCode, execute workers, send Telegram messages, call providers, mutate Cloudflare/R2, commit, push, or deploy.

## P096 Review Packet Store

P096 persists selected-bundle review packets to append-only JSONL for local evidence. Reads return only stable top-level metadata:

- `packet_id`
- `status`
- `dry_run`
- `live_execution`
- `next_action`

Malformed non-empty lines are counted in `invalid_lines`, empty lines in `skipped_empty_lines`, and valid packet summaries are returned in insertion order. Because review packet JSON contains nested `next_action` fields, the reader intentionally extracts the final top-level packet `next_action` field.

The store is evidence-only. It does not invoke OpenCode, consume review packets, execute workers, send Telegram messages, call providers, mutate Cloudflare/R2, commit, push, or deploy.

## P097 Review Outbox Status

P097 evaluates the review packet store as a read-only outbox status. It summarizes:

- valid review packet count
- packets ready for review-only handoff
- blocked/non-ready packets
- malformed non-empty lines
- skipped empty lines
- latest valid review packet summary

The status becomes `ready_review_packet_available` only when at least one packet has `status=ready_for_opencode_review`, `dry_run=true`, and `live_execution=false`.

Malformed packet-store lines take priority over ready packets and return `review_outbox_needs_repair` so corrupt local evidence cannot be consumed silently. Any live-execution flag returns `blocked_live_execution_flag`.

The outbox status is advisory only. It does not consume packets, invoke OpenCode, execute workers, send Telegram messages, call providers, mutate Cloudflare/R2, commit, push, or deploy.

## P098 Review Packet Consume Preview

P098 creates a dry-run consume preview from the review packet outbox. It selects the first valid packet where:

- `status` is `ready_for_opencode_review`
- `dry_run` is `true`
- `live_execution` is `false`

The preview nests the P097 outbox status so downstream operators can see whether the selected packet came from a clean store. Corrupt stores, empty stores, and live-flagged packets block the preview before any handoff.

This is not a real consume operation. It does not remove lines from the review packet JSONL store, invoke OpenCode, execute workers, send Telegram messages, call providers, mutate Cloudflare/R2, commit, push, or deploy.

## P099 Review Worker Handoff Envelope

P099 turns a ready P098 consume preview into a local review-worker handoff envelope. The envelope records:

- envelope id
- review-only target lane
- selected review packet summary
- nested consume preview
- local-safe next action
- machine-readable reason

The ready state is `ready_for_manual_opencode_review`. The next action remains `manual_opencode_review_only_no_invocation`, which means an operator can hand the artifact to OpenCode manually but the Rust core does not start or call OpenCode.

`FileReviewWorkerHandoffStore` writes the envelope to one local JSON file. It does not remove review packets, invoke OpenCode, execute workers, send Telegram messages, call providers, mutate Cloudflare/R2, commit, push, or deploy.

## P100 Review Worker Handoff Status

P100 reads the local handoff envelope back as stable top-level metadata and verifies whether it is ready for manual review-only use.

The status becomes `ready_for_manual_opencode_review` only when all of these are true:

- envelope exists and parses
- `status` is `ready_for_manual_opencode_review`
- `dry_run` is `true`
- `live_execution` is `false`
- `handoff_target` is `opencode_review_only`

Missing envelopes return `missing_handoff_envelope`, invalid envelopes return `blocked_invalid_handoff_envelope`, and live-flagged envelopes return `blocked_live_execution_flag`.

The status reader is local-only. It does not invoke OpenCode, execute workers, send Telegram messages, call providers, mutate Cloudflare/R2, commit, push, or deploy.

## P101 Review Handoff Bundle Manifest

P101 creates a local manifest that binds three previously separate review artifacts into one operator-facing bundle:

- selected review packet summary from P095/P096
- dry-run consume preview from P098
- verified manual review-only handoff status from P100

The manifest becomes `ready_for_manual_review_handoff_manifest` only when all of these are true:

- consume preview status is `ready_for_review_consume_preview`
- a selected review packet is present
- handoff status is `ready_for_manual_opencode_review`
- handoff status is `review_only=true`
- all live-execution flags are `false`

Missing or non-ready handoff status blocks as `blocked_handoff_status_not_ready`. A live flag anywhere in the preview/status chain blocks as `blocked_live_execution_flag`.

`FileReviewHandoffBundleManifestStore` writes one local JSON manifest for operator review. It does not invoke OpenCode, execute workers, send Telegram messages, call providers, mutate Cloudflare/R2, commit, push, or deploy.

## P102/P234 Review Handoff Manifest Status and Operator Card

P102/P234 reads the P101 manifest back and turns it into an explicit operator card. This prevents the orchestrator from treating "manifest exists" as "reviewer has been invoked" or "review has completed."

The manifest status becomes `ready_for_operator_review_card` only when all of these are true:

- the manifest exists and parses
- manifest status is `ready_for_manual_review_handoff_manifest`
- manifest is `dry_run=true`
- manifest is `review_only=true`
- manifest includes a selected packet id
- manifest has `live_execution=false`

Missing manifests return `missing_handoff_manifest`, invalid manifests return `blocked_invalid_handoff_manifest`, and live-flagged manifests return `blocked_live_execution_flag`.

The operator card becomes `ready_for_manual_opencode_review_instruction` only from a ready manifest status. Its `operator_action` is `review_manifest_manually_no_invocation`, which means the card is an instruction for the human/operator lane, not an execution adapter.

This layer does not invoke OpenCode, execute workers, send Telegram messages, call providers, mutate Cloudflare/R2, commit, push, or deploy.

## P103/P235 Manual Review Candidate Intake

P103/P235 models the result that a human/operator manually brings back from OpenCode. The Rust core can now read one local candidate artifact, verify it belongs to the expected operator card, and classify whether it is ready for a later result-transition gate.

The candidate artifact uses `candidate_kind=manual_opencode_review_candidate` and records:

- candidate id
- source operator card id
- candidate status
- `dry_run`
- `live_execution`
- `review_only`
- verdict
- blocking issue flag
- advisory next action

Candidate intake becomes `ready_for_review_candidate_acceptance` only when all of these are true:

- the operator card is `ready_for_manual_opencode_review_instruction`
- the candidate exists and parses
- candidate `source_card_id` matches the operator card id
- candidate status is `review_candidate_ready`
- candidate is `dry_run=true`
- candidate is `review_only=true`
- candidate is `live_execution=false`
- candidate verdict is `pass`
- candidate has `blocking_issue=false`

Warnings without blocking issues return `ready_for_human_review_decision`. Blocking issues, mismatched card ids, invalid candidates, missing candidates, live flags, or non-review-only candidates all block before any transition.

This layer is intake-only. It does not consume queue entries, invoke OpenCode, execute workers, send Telegram messages, call providers, mutate Cloudflare/R2, commit, push, or deploy.

## P104/P236 Review Result Transition Preview

P104/P236 previews whether a validated manual review candidate is ready to move toward a later result-transition gate. It deliberately separates "candidate intake passed" from "queue/state mutation is allowed."

The transition preview becomes `ready_for_review_result_transition_preview` only when the candidate intake status is `ready_for_review_candidate_acceptance` and all live-execution flags are false.

Warnings without blocking issues become `ready_for_human_review_decision_preview`, which keeps the result visible but does not allow an automatic transition. Missing, invalid, blocked, or otherwise non-ready candidate statuses return `blocked_candidate_status_not_ready`. Any live-execution flag returns `blocked_live_execution_flag`.

The preview records:

- candidate intake status
- transition allowed flag
- queue consumption allowed flag
- source mutation allowed flag
- next safe action

Queue consumption and source mutation remain explicitly false. This layer does not consume queue entries, invoke OpenCode, execute workers, send Telegram messages, call providers, mutate Cloudflare/R2, commit, push, or deploy.

## P105/P237 Human Result Transition Gate

P105/P237 turns a P104/P236 transition preview into an operator-facing human decision gate. This prevents the orchestrator from treating a pass review candidate as automatic permission to mutate queue state or source files.

The gate becomes `ready_for_human_result_transition_gate` only when all of these are true:

- transition preview status is `ready_for_review_result_transition_preview`
- transition preview has `transition_allowed=true`
- transition preview has `live_execution=false`
- queue consumption is still `false`
- source mutation is still `false`

Warn candidates become `ready_for_human_warn_decision_gate`, so an operator can decide whether the warning is acceptable. Live-flagged previews block as `blocked_live_execution_flag`. Non-ready previews block as `blocked_transition_preview_not_ready`.

The gate records an explicit `operator_action`, but the action is only an instruction for a later exact gate. It does not approve itself and does not perform any transition.

This layer does not consume queue entries, invoke OpenCode, execute workers, send Telegram messages, call providers, mutate Cloudflare/R2, commit, push, or deploy.

## P106/P238 Review Result Transition Gate Status

P106/P238 reads the P105/P237 gate back as a compact summary and classifies whether it is ready for a separate human decision. It prevents the orchestrator from treating "gate file exists" as "the review result was accepted" or "queue transition may run."

The status becomes `ready_for_human_result_transition_decision` only when all of these are true:

- the gate exists and parses
- gate status is `ready_for_human_result_transition_gate`
- gate is `dry_run=true`
- gate has `human_decision_required=true`
- gate has `live_execution=false`
- gate has `queue_consumption_allowed=false`
- gate has `source_mutation_allowed=false`

Warn gates become `ready_for_human_warn_decision_status`. Missing gates return `missing_result_transition_gate`, invalid gates return `blocked_invalid_result_transition_gate`, live-flagged gates return `blocked_live_execution_flag`, and mutation-enabled gates return `blocked_transition_gate_mutation_enabled`.

The reader parses top-level gate fields only and uses the last `next_action` field to avoid accidentally binding to nested preview/candidate fields. It does not execute the gate's `operator_action`.

This layer does not execute the operator action, consume queue entries, invoke OpenCode, execute workers, send Telegram messages, call providers, mutate Cloudflare/R2, commit, push, or deploy.

## P107/P239 Human Transition Decision Intake

P107/P239 models the explicit human/operator decision that answers a ready result-transition gate. This keeps "operator approved a decision artifact" separate from "the system executed a transition."

The human decision artifact uses `decision_kind=human_transition_decision` and records:

- decision id
- source transition gate id
- decision type: `accept`, `reject`, or `hold`
- decision status
- `dry_run`
- `live_execution`
- queue consumption flag
- source mutation flag
- operator notes
- advisory next action

Decision intake becomes `ready_for_accepted_human_transition_decision` only when all of these are true:

- the gate status is `ready_for_human_result_transition_decision` or `ready_for_human_warn_decision_status`
- the decision exists and parses
- decision `source_gate_id` matches the expected transition gate id
- decision status is `human_transition_decision_ready`
- decision is `dry_run=true`
- decision has `live_execution=false`
- decision has `queue_consumption_allowed=false`
- decision has `source_mutation_allowed=false`
- decision type is `accept`

`reject` and `hold` produce explicit ready states for recording a rejection or keeping the gate waiting. Missing, invalid, mismatched, non-dry-run, live-flagged, mutation-enabled, or unknown decision artifacts block before any transition.

This layer is intake-only. It does not execute the decision, consume queue entries, invoke OpenCode, execute workers, send Telegram messages, call providers, mutate Cloudflare/R2, commit, push, or deploy.

## P108/P240 Transition Execution Preview No Mutation

P108/P240 previews the consequence of an accepted, rejected, or held human transition decision without applying it. This gives Hermes/Codex/OpenCode a deterministic next-action artifact while preserving the hard boundary between preview and execution.

The preview records:

- preview id
- decision intake status
- decision kind
- transition action that would happen later
- queue consumption flag
- source mutation flag
- persisted state mutation flag
- advisory next action

Accepted decisions become `ready_for_transition_execution_preview` with transition action `would_mark_review_result_accepted_and_unlock_next_packet`. Rejected decisions become `ready_for_transition_rejection_preview`; held decisions become `ready_for_transition_hold_preview`.

Live-flagged decision intake statuses block as `blocked_live_execution_flag`. Missing, invalid, mismatched, mutating, or otherwise non-ready decisions block as `blocked_human_decision_not_ready` or their upstream guard state before any apply gate is considered.

The preview keeps `queue_consumption_allowed=false`, `source_mutation_allowed=false`, and `state_mutation_allowed=false`. It does not execute the decision, consume queue entries, mutate persisted orchestrator state, invoke OpenCode, execute workers, send Telegram messages, call providers, mutate Cloudflare/R2, commit, push, or deploy.

## P109/P241 Transition Apply Gate Preview

P109/P241 converts a no-mutation transition execution preview into an operator-facing apply gate preview. This is the final preview layer before any future apply packet can be considered.

The apply gate preview records:

- gate id
- gate status
- operator action
- nested transition execution preview
- decision kind
- transition action
- human approval required flag
- exact approval required flag
- queue/source/state mutation flags
- advisory next action

Accepted transition previews become `ready_for_transition_apply_gate_preview` and require `request_exact_transition_apply_approval`. Rejected previews become `ready_for_transition_rejection_apply_gate_preview`; held previews become `ready_for_transition_hold_apply_gate_preview`.

Live-flagged previews block as `blocked_live_execution_flag`. Mutation-enabled previews block as `blocked_transition_preview_mutation_enabled`. Non-ready previews block as `blocked_transition_preview_not_ready`.

Even when ready, the apply gate preview keeps `queue_consumption_allowed=false`, `source_mutation_allowed=false`, and `state_mutation_allowed=false`. It does not execute the decision, consume queue entries, mutate persisted orchestrator state, invoke OpenCode, execute workers, send Telegram messages, call providers, mutate Cloudflare/R2, commit, push, or deploy.

## P110/P242 Transition Apply Approval Intake

P110/P242 reads an exact local approval artifact for a P109/P241 apply gate preview without applying the transition. This separates "operator supplied the exact approval phrase" from "the system may mutate queue/status/source state."

The approval artifact records:

- approval id
- source apply gate id
- approval type: `apply`, `reject`, or `hold`
- exact approval text
- approval status
- `dry_run`
- `live_execution`
- queue/source/state mutation flags
- operator notes
- advisory next action

Approval intake becomes `ready_for_transition_apply_approval_intake` only when all of these are true:

- the apply gate is ready and requires exact human approval
- the approval exists and parses
- approval `source_gate_id` matches the expected apply gate id
- approval status is `transition_apply_approval_ready`
- approval is `dry_run=true`
- approval has `live_execution=false`
- approval has `queue_consumption_allowed=false`
- approval has `source_mutation_allowed=false`
- approval has `state_mutation_allowed=false`
- approval type matches the expected gate branch
- approval text exactly matches the gate-specific string

Exact apply text uses `APPROVE_TRANSITION_APPLY:<gate_id>`. Exact rejection-record text uses `APPROVE_TRANSITION_REJECTION_RECORD:<gate_id>`. Exact hold-record text uses `APPROVE_TRANSITION_HOLD_RECORD:<gate_id>`.

Missing, invalid, mismatched, non-ready, non-dry-run, live-flagged, mutation-enabled, type-mismatched, or non-exact approvals block before any transition apply execution can be planned.

This layer is intake-only. It does not execute the decision, consume queue entries, mutate persisted orchestrator state, invoke OpenCode, execute workers, send Telegram messages, call providers, mutate Cloudflare/R2, commit, push, or deploy.

## P111/P243 Transition Apply Execution Plan No Mutation

P111/P243 converts a ready P110/P242 approval intake status into a plan-only artifact for a later transition apply execution gate. This keeps "exact approval was received" separate from "the system may apply queue/status mutation."

The execution plan records:

- plan id
- plan status
- nested approval intake status
- approval type
- planned transition
- plan-only flag
- next-gate-required flag
- queue/source/state mutation flags
- advisory next action

Accepted approvals become `ready_for_transition_apply_execution_plan` with planned transition `plan_mark_review_result_accepted_and_unlock_next_packet`. Rejection approvals become `ready_for_rejection_record_plan`; hold approvals become `ready_for_hold_record_plan`.

Live-flagged approval statuses block as `blocked_live_execution_flag`. Mutation-enabled approval statuses block as `blocked_apply_approval_mutation_enabled`. Missing, invalid, mismatched, non-exact, or otherwise non-ready approval statuses block as `blocked_apply_approval_not_ready`.

Even when ready, the plan keeps `queue_consumption_allowed=false`, `source_mutation_allowed=false`, and `state_mutation_allowed=false`, and sets `apply_requires_next_gate=true`. It does not execute the decision, consume queue entries, mutate persisted orchestrator state, invoke OpenCode, execute workers, send Telegram messages, call providers, mutate Cloudflare/R2, commit, push, or deploy.

## P112/P244 Transition Apply Execution Gate Preview

P112/P244 turns a P111/P243 no-mutation execution plan into an operator-facing execution gate preview. This is still not execution; it is the final explicit gate surface before a later exact execution approval intake can be considered.

The execution gate preview records:

- gate id
- gate status
- gate title
- operator action
- nested execution plan
- approval type
- planned transition
- human execution approval required flag
- exact execution approval required flag
- queue/source/state mutation flags
- advisory next action

Accepted apply plans become `ready_for_transition_apply_execution_gate_preview` and request `request_exact_transition_apply_execution_approval`. Rejection-record plans become `ready_for_rejection_record_execution_gate_preview`; hold-record plans become `ready_for_hold_record_execution_gate_preview`.

Live-flagged plans block as `blocked_live_execution_flag`. Mutation-enabled plans block as `blocked_transition_apply_plan_mutation_enabled`. Plans that are not plan-only, do not require a next gate, or have non-ready status block as `blocked_transition_apply_plan_not_ready`.

Even when ready, the execution gate preview keeps `queue_consumption_allowed=false`, `source_mutation_allowed=false`, and `state_mutation_allowed=false`, and sets `exact_execution_approval_required=true`. It does not execute the decision, consume queue entries, mutate persisted orchestrator state, invoke OpenCode, execute workers, send Telegram messages, call providers, mutate Cloudflare/R2, commit, push, or deploy.

## P113/P245 Transition Apply Execution Approval Intake

P113/P245 reads an exact local execution approval artifact for a P112/P244 execution gate preview. This is still not execution; it only proves that an operator supplied the exact gate-specific execution approval text for the current apply, reject, or hold path.

The execution approval artifact records:

- approval id
- source execution gate id
- approval type
- exact approval text
- approval status
- dry-run and live-execution flags
- queue/source/state mutation flags
- operator notes
- advisory next action

Exact approval strings are:

- `APPROVE_TRANSITION_APPLY_EXECUTION:<execution_gate_id>`
- `APPROVE_TRANSITION_REJECTION_RECORD_EXECUTION:<execution_gate_id>`
- `APPROVE_TRANSITION_HOLD_RECORD_EXECUTION:<execution_gate_id>`

Accepted execution approvals become `ready_for_transition_apply_execution_approval_intake` and request `prepare_transition_apply_execution_packet_no_mutation`. Rejection-record approvals become `ready_for_rejection_record_execution_approval_intake`; hold-record approvals become `ready_for_hold_record_execution_approval_intake`.

Live-flagged approvals block as `blocked_live_execution_flag`. Missing approvals wait as `missing_transition_apply_execution_approval`. Invalid approval JSON blocks as `blocked_invalid_transition_apply_execution_approval`. Gate mismatches, non-dry-run approvals, mutation-enabled approvals, type mismatches, and non-exact approval text all block before any later packet can consider mutation.

Even when ready, execution approval intake keeps `queue_consumption_allowed=false`, `source_mutation_allowed=false`, and `state_mutation_allowed=false`. It does not execute the decision, consume queue entries, mutate persisted orchestrator state, invoke OpenCode, execute workers, send Telegram messages, call providers, mutate Cloudflare/R2, commit, push, or deploy.

## P114/P246 Transition Apply Execution Packet No Mutation

P114/P246 converts a ready P113/P245 execution approval intake status into a packet-only execution artifact. This packet names the transition action that could be considered by a later mutation gate, but it still does not apply that transition.

The execution packet records:

- packet id
- packet status
- nested execution approval intake status
- approval type
- transition action
- packet-only flag
- mutation-requires-next-gate flag
- queue/source/state mutation flags
- advisory next action
- decision reason

Accepted execution approvals become `ready_for_transition_apply_execution_packet_no_mutation` with transition action `packet_mark_review_result_accepted_and_unlock_next_packet`. Rejection-record approvals become `ready_for_rejection_record_execution_packet_no_mutation`; hold-record approvals become `ready_for_hold_record_execution_packet_no_mutation`.

Live-flagged approval intake blocks as `blocked_live_execution_flag`. Mutation-enabled approval intake blocks as `blocked_execution_approval_mutation_enabled`. Non-ready approval intake blocks as `blocked_execution_approval_not_ready`.

Even when ready, the packet keeps `packet_only=true`, `mutation_requires_next_gate=true`, `queue_consumption_allowed=false`, `source_mutation_allowed=false`, and `state_mutation_allowed=false`. It does not execute the decision, consume queue entries, mutate persisted orchestrator state, invoke OpenCode, execute workers, send Telegram messages, call providers, mutate Cloudflare/R2, commit, push, or deploy.
