# GhostClaw Rust Migration Core Refactor Plan

## P085 Done

- Split deterministic logic into Rust modules.
- Preserve command and lane contracts.
- Add append-only receipt boundary.
- Add MemoryReceiptStore and FileReceiptStore.
- Add policy blocks and redaction.
- Add core behavior tests.
- Add opt-in Python oracle scaffold.

## P086 Next

- Add adapter traits for Codex dry-run, Telegram command envelopes, persistent pending queue, validator result model, and path lease checker.
- Keep all adapters dry-run until exact live gates are opened.
- Add JSON fixtures for command/receipt parity.

## P086 Implemented

- `adapters::telegram` converts Telegram-shaped input into `CommandEnvelope` only.
- `adapters::codex` creates a dry-run Codex command preview and never executes Codex.
- `adapters::queue` appends route intent to a JSONL file without executing payloads.
- `adapters::validator` models deterministic validation checks and aggregate status.
- `adapters::lease` checks candidate paths against explicit allow/block patterns.

## P087 Later

- Add real Python oracle wrapper around frozen Hermes command handler.
- Evaluate PyO3 only after parity and dependency gate approval.
- Keep Python runtime available until compatibility passes.

## P087 Implemented

- Added fixture parity tests for Telegram adapter input, route job JSONL, validator result JSON, and lease decision JSON.
- Added pending queue read reports that count malformed and empty lines instead of silently hiding queue corruption.
- Added an A2A2A path lease fixture with live actions explicitly disabled.
- Added path lease regression tests for `.env*`, `cloudflare/**`, `workers/**`, and scoped Rust crate paths.

## P088 Later

- Add a frozen Hermes Python command handler fixture when the real handler contract is stable.
- Add adapter-level JSON response fixtures for future dry-run Codex and Telegram reply previews.
- Keep live Telegram, live Codex, provider routing, Cloudflare mutation, push, and deploy blocked until exact gates reopen them.

## P088 Implemented

- Added Codex dry-run preview fixture parity.
- Added Telegram reply-preview fixture parity with `live_send=false`.
- Added Telegram reply-preview redaction coverage for secret-like text.
- Added failed validator-result fixture parity for negative validation paths.

## P089 Later

- Add a local adapter response bundle that groups route intent, lease decision, dry-run preview, validator result, and receipt metadata into one review packet.
- Keep bundle generation local-only and fixture-backed.

## P089 Implemented

- Added `adapters::bundle` for local adapter response bundles.
- Added receipt metadata extraction for bundle-safe audit context.
- Added pass and fail bundle fixtures.
- Added regression coverage that live preview flags force bundle status to `blocked_or_failed`.

## P090 Later

- Add a bundle writer that persists local review bundles to a JSONL file under an explicit runtime receipt path.
- Add corruption-aware bundle reading similar to `FilePendingQueue::read_report()`.
- Keep the writer local-only; no live send, worker execution, push, deploy, or Cloudflare mutation.

## P090 Implemented

- Added `FileBundleStore` for append-only local bundle JSONL persistence.
- Added `BundleReadReport` with malformed-line and empty-line counts.
- Added `PersistedBundleSummary` to read stable top-level bundle metadata without executing payloads.
- Added persisted bundle fixtures and read-report parity tests.
- Fixed parallel-test temp file collision with an atomic temp id.

## P091 Later

- Add an orchestrator-facing bundle selection helper that picks the next safe bundle by status and live-execution flag.
- Add fixture parity for ready, blocked, malformed, and live-flagged bundle selection.
- Keep selection read-only and local-only.

## P091 Implemented

- Added `select_next_ready_bundle()` to choose the first `ready_for_review` bundle with `live_execution=false`.
- Added `BundleSelection` for a stable orchestrator-facing decision JSON shape.
- Added fixture parity covering blocked bundles, live-flagged ready bundles, malformed lines, empty lines, and the first safe ready bundle.
- Kept selection read-only: no worker execution, live Telegram send, provider call, push, deploy, or Cloudflare/R2 mutation.

## P092 Later

- Add a read-only orchestrator status view that combines bundle selection, pending queue read reports, and lease status.
- Keep status generation local-only and require a separate gate before any worker execution adapter is introduced.

## P092 Implemented

- Added `adapters::orchestrator_status` for a local read-only Hermes/Codex/OpenCode coordination view.
- Added `QueueStatusSummary`, `LeaseStatusSummary`, and `OrchestratorStatusView`.
- Combined P091 bundle selection, P087 pending queue read reports, and deterministic lease decisions into one JSON status artifact.
- Added fixture parity proving ready-bundle selection, malformed-line surfacing, and blocked-lease surfacing.
- Kept status generation dry-run only with `live_execution=false`.

## P093 Later

- Add an optional read-only file-backed status writer for orchestrator snapshots.
- Keep snapshots under an explicit runtime/report path and require a separate exact gate before any worker execution handoff.

## P093 Implemented

- Added `FileOrchestratorStatusStore` for append-only local status snapshot JSONL persistence.
- Added `PersistedOrchestratorStatusSummary` and `StatusSnapshotReadReport` to read stable status metadata without executing payloads.
- Added fixture-backed tests for append/read, malformed-line reporting, and missing-store reads.
- Kept status snapshots dry-run evidence only; no worker execution or live action is enabled.

## P094 Later

- Add a read-only status freshness guard that compares the latest snapshot summary against the current bundle/queue/lease read reports.
- Keep freshness validation local-only and require an exact gate before any selected bundle can be sent to a live worker adapter.

## P094 Implemented

- Added `evaluate_status_freshness()` to compare the latest valid status snapshot against the current read-only orchestrator status.
- Added `StatusFreshnessDecision` with stable `fresh`, `stale`, and `missing` states.
- Added malformed-line aware missing-state handling so corrupt snapshot stores cannot silently pass as fresh.
- Added fixture-backed freshness tests for fresh, stale, missing, and invalid-snapshot cases.
- Kept freshness validation advisory only; it does not execute `next_action`, send work to OpenCode, start workers, call providers, push, deploy, or mutate Cloudflare/R2.

## P095 Later

- Add a local review packet export that combines selected bundle metadata, current status, freshness decision, and validation evidence for OpenCode review.
- Keep the export read-only and require a separate exact gate before any worker adapter receives a selected bundle.

## P095 Implemented

- Added `adapters::review_packet` for read-only selected-bundle review export.
- Added `SelectedBundleReviewPacket` combining selected bundle metadata, current orchestrator status, freshness decision, and deterministic validation evidence.
- Added blocking decisions for live execution flags, failed validation, stale/missing freshness evidence, and missing selected bundles.
- Added fixture-backed tests for the ready export path plus stale-status and live-bundle block paths.
- Kept export advisory only; it does not send work to OpenCode, execute selected bundles, start workers, call providers, push, deploy, or mutate Cloudflare/R2.

## P096 Later

- Add an optional file-backed review packet store for append-only local evidence.
- Keep packet storage local-only and require a separate exact gate before any review worker consumes the packet.

## P096 Implemented

- Added `FileReviewPacketStore` for append-only selected-bundle review packet JSONL persistence.
- Added `PersistedReviewPacketSummary` and `ReviewPacketReadReport` for stable top-level metadata reads.
- Added malformed-line and empty-line accounting so corrupt review packet stores cannot silently pass as clean.
- Added fixture-backed tests for persisted summary parsing, append/read, missing store, and corrupt-line read reports.
- Fixed duplicated-field parsing for `next_action` by reading the top-level review-packet field instead of the nested `status_view.next_action`.
- Kept packet storage local-only; it does not invoke OpenCode, execute workers, call providers, send Telegram messages, push, deploy, or mutate Cloudflare/R2.

## P097 Later

- Add a read-only orchestrator review-outbox status that combines review packet store summaries with freshness and validation status.
- Keep the outbox status advisory only until an exact review-worker consume gate is opened.

## P097 Implemented

- Added `ReviewOutboxStatus` for read-only review packet outbox summaries.
- Added `evaluate_review_outbox_status()` to surface ready packets, malformed packet-store lines, live-execution flags, and empty outbox states.
- Added fixture-backed tests for ready, corrupt, live-flagged, and empty outbox decisions.
- Kept outbox status advisory only; it does not consume packets, invoke OpenCode, execute workers, call providers, send Telegram messages, push, deploy, or mutate Cloudflare/R2.

## P098 Later

- Add a dry-run consume preview that selects a ready review packet for OpenCode handoff without invoking OpenCode.
- Keep the preview local-only and require a separate exact gate before any live reviewer or worker consumes a packet.

## P098 Implemented

- Added `ReviewPacketConsumePreview` for dry-run review packet consume decisions.
- Added `preview_review_packet_consume()` to select the first ready non-live review packet without mutating the review packet store.
- Added fixture-backed tests for ready, corrupt, live-flagged, and empty outbox consume-preview decisions.
- Kept consume preview advisory only; it does not remove packets, invoke OpenCode, execute workers, call providers, send Telegram messages, push, deploy, or mutate Cloudflare/R2.

## P099 Later

- Add a review-worker handoff envelope writer that stores the selected preview as a local JSON artifact for manual OpenCode review.
- Keep the envelope local-only and require a separate exact gate before any reviewer process is invoked.

## P099 Implemented

- Added `ReviewWorkerHandoffEnvelope` for manual review-worker handoff artifacts.
- Added `create_review_worker_handoff_envelope()` to convert a P098 consume preview into a local OpenCode review-only envelope.
- Added `FileReviewWorkerHandoffStore` to write one local JSON envelope without invoking a reviewer process.
- Added fixture-backed tests for ready, corrupt, live-flagged, and local-file write paths.
- Kept the envelope writer local-only; it does not invoke OpenCode, remove packets, execute workers, call providers, send Telegram messages, push, deploy, or mutate Cloudflare/R2.

## P100 Later

- Add a read-only handoff envelope status reader that verifies the local envelope is present and review-only before any manual reviewer consumes it.
- Keep the reader local-only and require a separate exact gate before invoking any reviewer process.

## P100 Implemented

- Added `PersistedReviewWorkerHandoffSummary` for stable top-level envelope metadata reads.
- Added `ReviewWorkerHandoffReadReport` and `FileReviewWorkerHandoffStore::read_report()` to distinguish present, missing, and invalid local handoff envelopes.
- Added `ReviewWorkerHandoffStatus` and `evaluate_review_worker_handoff_status()` to verify `opencode_review_only`, `dry_run=true`, and `live_execution=false`.
- Added fixture-backed tests for ready, missing, invalid, live-flagged, and read-report paths.
- Kept status reading local-only; it does not invoke OpenCode, execute workers, call providers, send Telegram messages, push, deploy, or mutate Cloudflare/R2.

## P101 Later

- Add a local handoff bundle manifest that references the review packet, consume preview, and verified handoff envelope status together for operator review.
- Keep the manifest local-only and require an exact gate before any reviewer process is invoked.

## P101 Implemented

- Added `ReviewHandoffBundleManifest` for local operator review of the selected review packet, consume preview, and verified handoff status as one artifact.
- Added `create_review_handoff_bundle_manifest()` to require a ready consume preview plus `ready_for_manual_opencode_review` handoff status before a manifest can become ready.
- Added `FileReviewHandoffBundleManifestStore` to write one local manifest JSON file without invoking OpenCode.
- Added fixture-backed tests for ready manifest, live-preview block, missing-handoff-status block, and local-file write paths.
- Kept the manifest local-only; it does not invoke OpenCode, execute workers, call providers, send Telegram messages, push, deploy, commit, or mutate Cloudflare/R2.

## P102/P234 Later

- Add a read-only handoff manifest status reader that verifies the P101 manifest exists and remains review-only.
- Add an operator-facing card that gives the next manual OpenCode review instruction without invoking OpenCode.
- Keep the card local-only and require a separate exact gate before any real reviewer process, provider call, or live handoff is attempted.

## P102/P234 Implemented

- Added `PersistedReviewHandoffBundleManifestSummary` for stable top-level manifest metadata reads.
- Added `ReviewHandoffBundleManifestReadReport` and `FileReviewHandoffBundleManifestStore::read_report()` to distinguish present, missing, and invalid local manifests.
- Added `ReviewHandoffBundleManifestStatus` and `evaluate_review_handoff_bundle_manifest_status()` to verify `ready_for_manual_review_handoff_manifest`, `dry_run=true`, `review_only=true`, selected packet presence, and `live_execution=false`.
- Added `ReviewHandoffOperatorCard` and `create_review_handoff_operator_card()` to produce a manual review-only operator instruction.
- Added fixture-backed tests for ready read-report, ready status, missing manifest, invalid manifest, live manifest block, ready operator card, and blocked non-ready operator card.
- Kept the status/card layer local-only; it does not invoke OpenCode, execute workers, call providers, send Telegram messages, push, deploy, commit, or mutate Cloudflare/R2.

## P103/P235 Later

- Add a local-only manual review candidate intake validator for the result a human/operator brings back from OpenCode.
- Bind each candidate to the expected operator card id to prevent stale or mismatched review results.
- Keep the candidate intake advisory-only until a separate exact result-transition gate is opened.

## P103/P235 Implemented

- Added `ManualReviewCandidate` for manual OpenCode review result artifacts.
- Added `ReviewCandidateReadReport` and `FileReviewCandidateStore` to read/write one local candidate artifact while distinguishing missing and invalid files.
- Added `ReviewCandidateIntakeStatus` and `evaluate_review_candidate_intake_status()` to require a ready operator card, matching `source_card_id`, `dry_run=true`, `review_only=true`, `live_execution=false`, `status=review_candidate_ready`, and no blocking issue.
- Added pass, missing, invalid, live, source-card mismatch, and blocking-issue tests.
- Added P103 fixtures for candidate JSON, candidate read-report, and pass intake status.
- Kept candidate intake local-only; it does not consume queue entries, invoke OpenCode, execute workers, call providers, send Telegram messages, push, deploy, commit, or mutate Cloudflare/R2.

## P104/P236 Later

- Add a local-only transition preview after manual review candidate intake.
- Allow a pass candidate to prepare a later human result-transition gate without consuming queues or mutating source.
- Keep warn candidates visible for human decision and block live/non-ready candidate statuses.

## P104/P236 Implemented

- Added `ReviewResultTransitionPreview` for dry-run review result transition decisions.
- Added `preview_review_result_transition()` to classify pass, warn, live-flagged, and non-ready candidate intake statuses.
- Added fixture-backed tests for pass transition preview plus guard tests for warn, live flag, and non-ready candidate status.
- Kept transition preview advisory-only; it does not consume queue entries, invoke OpenCode, execute workers, call providers, send Telegram messages, push, deploy, commit, mutate source files, or mutate Cloudflare/R2.

## P105/P237 Later

- Add a human result-transition gate artifact after the P104/P236 transition preview.
- Keep the gate as an operator decision surface only; it must not approve itself or perform a queue/status transition.
- Preserve explicit false flags for queue consumption and source mutation.

## P105/P237 Implemented

- Added `ReviewResultTransitionGate` for operator-facing review result transition decisions.
- Added `create_review_result_transition_gate()` to turn a ready transition preview into `ready_for_human_result_transition_gate`.
- Added guard behavior for warn candidates, live-flagged previews, and non-ready previews.
- Added fixture-backed tests for ready gate plus guard tests for warn, live flag, and non-ready preview paths.
- Kept the gate artifact local-only; it does not consume queue entries, invoke OpenCode, execute workers, call providers, send Telegram messages, push, deploy, commit, mutate source files, or mutate Cloudflare/R2.

## P106/P238 Later

- Add a read-only result-transition gate status reader after the P105/P237 gate artifact.
- Distinguish missing, invalid, live-flagged, mutating, ready, and warn gate states without executing the operator action.
- Preserve top-level field parsing so nested preview fields cannot be mistaken for the gate status.

## P106/P238 Implemented

- Added `PersistedReviewResultTransitionGateSummary` for stable top-level gate metadata reads.
- Added `ReviewResultTransitionGateReadReport` and `FileReviewResultTransitionGateStore::read_report()` to distinguish present, missing, and invalid local gate artifacts.
- Added `ReviewResultTransitionGateStatus` and `evaluate_review_result_transition_gate_status()` to verify dry-run human-decision gates while blocking live flags and mutation-enabled gates.
- Added fixture-backed tests for ready read-report/status, missing gate, invalid gate, live gate, and mutation-enabled gate paths.
- Kept status reading local-only; it does not execute the operator action, consume queue entries, invoke OpenCode, execute workers, call providers, send Telegram messages, push, deploy, commit, mutate source files, or mutate Cloudflare/R2.

## P107/P239 Later

- Add a local human transition decision intake artifact after the P106/P238 gate status.
- Accept `accept`, `reject`, and `hold` decisions while keeping queue consumption and source mutation disabled.
- Bind each decision to the expected transition gate id to prevent stale or mismatched operator approvals.

## P107/P239 Implemented

- Added `HumanTransitionDecision` for explicit local operator decisions.
- Added `HumanTransitionDecisionReadReport` and `FileHumanTransitionDecisionStore` to write/read one local decision artifact without executing it.
- Added `HumanTransitionDecisionIntakeStatus` and `evaluate_human_transition_decision_intake_status()` to block live flags, non-ready gates, invalid/missing decisions, gate mismatches, non-dry-run decisions, mutation-enabled decisions, and unknown decision types.
- Added fixture-backed tests for accept decision JSON, read report, intake status, missing/invalid/mismatched/mutating decisions, and reject/hold branches.
- Kept decision intake local-only; it does not execute the decision, consume queue entries, invoke OpenCode, execute workers, call providers, send Telegram messages, push, deploy, commit, mutate source files, or mutate Cloudflare/R2.

## P108/P240 Later

- Add a no-mutation transition execution preview after the P107/P239 human decision intake.
- Show what accept/reject/hold would do in a later explicit apply gate without consuming queues or mutating source/state.
- Preserve false mutation flags so preview artifacts cannot be mistaken for execution permission.

## P108/P240 Implemented

- Added `TransitionExecutionPreview` for no-mutation review-result transition previews.
- Added `preview_transition_execution_no_mutation()` to classify accepted, rejected, held, live-flagged, and non-ready decision intake statuses.
- Added fixture-backed tests for accepted transition preview and guard tests for reject, hold, live, and non-ready decision status paths.
- Kept transition execution preview local-only; it does not execute the decision, consume queue entries, mutate orchestrator state, invoke OpenCode, execute workers, call providers, send Telegram messages, push, deploy, commit, mutate source files, or mutate Cloudflare/R2.

## P109/P241 Later

- Add an operator-facing transition apply gate preview after the P108/P240 no-mutation execution preview.
- Require exact approval wording before any future queue/status transition apply step.
- Keep the apply gate preview advisory only and preserve false mutation flags.

## P109/P241 Implemented

- Added `TransitionApplyGatePreview` for operator-facing apply gate previews.
- Added `create_transition_apply_gate_preview()` to classify accepted, rejected, held, live-flagged, mutating, and non-ready transition previews.
- Added fixture-backed tests for accepted apply gate preview plus guard tests for reject, hold, live, mutating, and non-ready preview paths.
- Kept apply gate preview local-only; it does not execute the decision, consume queue entries, mutate orchestrator state, invoke OpenCode, execute workers, call providers, send Telegram messages, push, deploy, commit, mutate source files, or mutate Cloudflare/R2.

## P110/P242 Later

- Add a local-only exact approval artifact after the P109/P241 apply gate preview.
- Bind each approval to the expected apply gate id and exact gate-specific approval text.
- Keep approval intake advisory-only; a later packet must still plan any transition apply execution without mutation first.

## P110/P242 Implemented

- Added `TransitionApplyApproval` for exact local operator approvals.
- Added `TransitionApplyApprovalReadReport` and `FileTransitionApplyApprovalStore` to write/read one approval artifact while distinguishing missing and invalid files.
- Added `TransitionApplyApprovalIntakeStatus` and `evaluate_transition_apply_approval_intake_status()` to block live flags, non-ready gates, invalid/missing approvals, gate mismatches, non-dry-run approvals, mutation-enabled approvals, type mismatches, and non-exact approval text.
- Added fixture-backed tests for apply approval JSON, read report, intake status, missing/invalid/mismatched/non-exact/mutating approvals, and reject/hold branches.
- Kept approval intake local-only; it does not execute the decision, consume queue entries, mutate orchestrator state, invoke OpenCode, execute workers, call providers, send Telegram messages, push, deploy, commit, mutate source files, or mutate Cloudflare/R2.

## P111/P243 Later

- Add a no-mutation transition apply execution plan after the P110/P242 approval intake status.
- Show what apply/reject/hold would do in a later explicit execution gate without consuming queue entries or mutating source/state.
- Keep the plan separate from execution so exact approval text cannot be mistaken for mutation permission.

## P111/P243 Implemented

- Added `TransitionApplyExecutionPlan` for no-mutation apply/reject/hold execution planning.
- Added `plan_transition_apply_execution_no_mutation()` to convert ready apply approval intake statuses into plan-only artifacts.
- Added guard behavior for live-flagged, mutating, and non-ready approval statuses.
- Added fixture-backed tests for apply plan JSON plus reject/hold, live, mutating, and non-ready approval status paths.
- Kept execution planning local-only; it does not execute the decision, consume queue entries, mutate orchestrator state, invoke OpenCode, execute workers, call providers, send Telegram messages, push, deploy, commit, mutate source files, or mutate Cloudflare/R2.

## P112/P244 Later

- Add an operator-facing execution gate preview after the P111/P243 no-mutation execution plan.
- Require exact gate-specific execution approval before any future transition apply step.
- Keep this as a preview layer only; it must not consume queue entries or mutate source/state.

## P112/P244 Implemented

- Added `TransitionApplyExecutionGatePreview` for final operator-facing execution gate previews.
- Added `create_transition_apply_execution_gate_preview()` to classify apply, reject, hold, live-flagged, mutating, and non-ready execution plans.
- Added fixture-backed tests for apply execution gate preview plus reject/hold, live, mutating, and non-ready plan paths.
- Kept execution gate preview local-only; it does not execute the decision, consume queue entries, mutate orchestrator state, invoke OpenCode, execute workers, call providers, send Telegram messages, push, deploy, commit, mutate source files, or mutate Cloudflare/R2.

## P113/P245 Later

- Add a local-only exact execution approval artifact after the P112/P244 execution gate preview.
- Bind each approval to the expected execution gate id and exact execution approval text.
- Keep approval intake advisory-only; a later packet must still prepare any real apply/reject/hold mutation separately.

## P113/P245 Implemented

- Added `TransitionApplyExecutionApproval` for exact local operator execution approvals.
- Added `TransitionApplyExecutionApprovalReadReport` and `FileTransitionApplyExecutionApprovalStore` to write/read one approval artifact while distinguishing missing and invalid files.
- Added `TransitionApplyExecutionApprovalIntakeStatus` and `evaluate_transition_apply_execution_approval_intake_status()` to block live flags, non-ready execution gates, invalid/missing approvals, gate mismatches, non-dry-run approvals, mutation-enabled approvals, type mismatches, and non-exact execution approval text.
- Added fixture-backed tests for apply execution approval JSON, read report, intake status, missing/invalid/mismatched/non-exact/mutating/live approvals, and reject/hold branches.
- Kept execution approval intake local-only; it does not execute the decision, consume queue entries, mutate orchestrator state, invoke OpenCode, execute workers, call providers, send Telegram messages, push, deploy, commit, mutate source files, or mutate Cloudflare/R2.

## P114/P246 Later

- Add a no-mutation transition apply execution packet after exact P113/P245 execution approval intake.
- Show the exact apply/reject/hold transition action that would be eligible for a later mutation gate.
- Keep the packet separate from mutation so exact execution approval cannot be mistaken for queue/state mutation permission.

## P114/P246 Implemented

- Added `TransitionApplyExecutionPacketNoMutation` for apply/reject/hold execution packet preparation.
- Added `prepare_transition_apply_execution_packet_no_mutation()` to convert ready execution approval intake statuses into packet-only artifacts.
- Added guard behavior for live-flagged, mutating, and non-ready execution approval statuses.
- Added fixture-backed tests for apply execution packet JSON plus reject/hold, live, mutating, and non-ready approval status paths.
- Kept execution packet preparation local-only; it does not execute the decision, consume queue entries, mutate orchestrator state, invoke OpenCode, execute workers, call providers, send Telegram messages, push, deploy, commit, mutate source files, or mutate Cloudflare/R2.
