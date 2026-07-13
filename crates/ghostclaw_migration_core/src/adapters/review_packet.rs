//! Read-only OpenCode review packet export.
//!
//! This adapter creates a local review surface from bundle selection, current
//! orchestrator status, freshness, and deterministic validation evidence.

use std::fs::{self, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};

use crate::adapters::bundle::PersistedBundleSummary;
use crate::adapters::orchestrator_status::{OrchestratorStatusView, StatusFreshnessDecision};
use crate::adapters::validator::ValidatorResult;
use crate::error::{MigrationError, Result};
use crate::schema::escape_json;

/// Review packet for the selected bundle handoff to OpenCode.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SelectedBundleReviewPacket {
    /// Packet id for this exported review artifact.
    pub packet_id: String,
    /// Aggregate packet status.
    pub status: String,
    /// Packet generation is always dry-run.
    pub dry_run: bool,
    /// Whether any source artifact claims live execution.
    pub live_execution: bool,
    /// Selected bundle summary, if a safe bundle is available.
    pub selected_bundle: Option<PersistedBundleSummary>,
    /// Current read-only orchestrator status.
    pub status_view: OrchestratorStatusView,
    /// Freshness guard decision.
    pub freshness: StatusFreshnessDecision,
    /// Deterministic validation evidence for the export.
    pub validator_result: ValidatorResult,
    /// Next local-safe action.
    pub next_action: String,
    /// Stable machine-readable decision reason.
    pub reason: String,
}

impl SelectedBundleReviewPacket {
    /// Builds a local-only OpenCode review export packet.
    pub fn new(
        packet_id: impl Into<String>,
        status_view: &OrchestratorStatusView,
        freshness: &StatusFreshnessDecision,
        validator_result: ValidatorResult,
    ) -> Self {
        let selected_bundle = status_view.bundle_selection.selected.clone();
        let live_execution = status_view.live_execution
            || selected_bundle
                .as_ref()
                .map(|bundle| bundle.live_execution)
                .unwrap_or(false)
            || freshness.current.live_execution
            || freshness
                .latest_snapshot
                .as_ref()
                .map(|snapshot| snapshot.live_execution)
                .unwrap_or(false)
            || validator_result.executed_live;
        let (status, reason, next_action) = review_packet_decision(
            selected_bundle.as_ref(),
            &freshness.status,
            &validator_result.status,
            live_execution,
        );

        Self {
            packet_id: packet_id.into(),
            status: status.to_string(),
            dry_run: true,
            live_execution,
            selected_bundle,
            status_view: status_view.clone(),
            freshness: freshness.clone(),
            validator_result,
            next_action: next_action.to_string(),
            reason: reason.to_string(),
        }
    }

    /// Serializes the review packet to compact JSON.
    pub fn to_json(&self) -> String {
        let selected_bundle = self
            .selected_bundle
            .as_ref()
            .map_or_else(|| "null".to_string(), PersistedBundleSummary::to_json);
        format!(
            "{{\"packet_id\":\"{}\",\"packet_kind\":\"selected_bundle_review_packet\",\"status\":\"{}\",\"dry_run\":{},\"live_execution\":{},\"selected_bundle\":{},\"status_view\":{},\"freshness\":{},\"validator_result\":{},\"next_action\":\"{}\",\"reason\":\"{}\"}}",
            escape_json(&self.packet_id),
            escape_json(&self.status),
            self.dry_run,
            self.live_execution,
            selected_bundle,
            self.status_view.to_json(),
            self.freshness.to_json(),
            self.validator_result.to_json(),
            escape_json(&self.next_action),
            escape_json(&self.reason)
        )
    }
}

fn review_packet_decision(
    selected_bundle: Option<&PersistedBundleSummary>,
    freshness_status: &str,
    validator_status: &str,
    live_execution: bool,
) -> (&'static str, &'static str, &'static str) {
    if live_execution {
        return (
            "blocked_live_execution_flag",
            "live_execution_flag_present",
            "stop_before_live_handoff",
        );
    }
    if validator_status != "pass" {
        return (
            "blocked_validation_failed",
            "validator_result_not_pass",
            "inspect_validation_failures",
        );
    }
    if freshness_status != "fresh" {
        return (
            "blocked_stale_status_evidence",
            "freshness_guard_not_fresh",
            "refresh_status_snapshot_before_review",
        );
    }
    if selected_bundle.is_none() {
        return (
            "blocked_no_selected_bundle",
            "no_selected_bundle",
            "wait_for_ready_bundle",
        );
    }
    (
        "ready_for_opencode_review",
        "selected_bundle_fresh_and_validated",
        "export_to_opencode_review_only",
    )
}

/// Compact summary of a review packet read from JSONL storage.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PersistedReviewPacketSummary {
    /// Packet id for this exported review artifact.
    pub packet_id: String,
    /// Aggregate packet status.
    pub status: String,
    /// Whether the stored packet was dry-run only.
    pub dry_run: bool,
    /// Whether the stored packet claims live execution happened.
    pub live_execution: bool,
    /// Advisory next action from the packet.
    pub next_action: String,
}

impl PersistedReviewPacketSummary {
    /// Parses stable top-level fields from a persisted review packet line.
    pub fn from_json_line(line: &str) -> Option<Self> {
        if !line.contains("\"packet_kind\":\"selected_bundle_review_packet\"") {
            return None;
        }
        Some(Self {
            packet_id: extract_string(line, "packet_id")?,
            status: extract_string(line, "status")?,
            dry_run: extract_bool(line, "dry_run")?,
            live_execution: extract_bool(line, "live_execution")?,
            next_action: extract_last_string(line, "next_action")?,
        })
    }

    /// Serializes the summary to compact JSON.
    pub fn to_json(&self) -> String {
        format!(
            "{{\"packet_id\":\"{}\",\"status\":\"{}\",\"dry_run\":{},\"live_execution\":{},\"next_action\":\"{}\"}}",
            escape_json(&self.packet_id),
            escape_json(&self.status),
            self.dry_run,
            self.live_execution,
            escape_json(&self.next_action)
        )
    }
}

/// Read-only aggregate status for a review packet outbox.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReviewOutboxStatus {
    /// Status id for this advisory artifact.
    pub status_id: String,
    /// Aggregate outbox status.
    pub status: String,
    /// Status generation is always dry-run.
    pub dry_run: bool,
    /// Whether any stored review packet claims live execution.
    pub live_execution: bool,
    /// Number of valid review packets found.
    pub packet_count: usize,
    /// Number of packets ready for review-only handoff.
    pub ready_count: usize,
    /// Number of valid packets that are not review-ready.
    pub blocked_count: usize,
    /// Number of malformed non-empty lines in the store.
    pub invalid_lines: usize,
    /// Number of empty or whitespace-only lines skipped.
    pub skipped_empty_lines: usize,
    /// Latest valid review packet summary, if present.
    pub latest_packet: Option<PersistedReviewPacketSummary>,
    /// Next local-safe action.
    pub next_action: String,
    /// Stable machine-readable decision reason.
    pub reason: String,
}

/// Dry-run consume preview for one review packet handoff.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReviewPacketConsumePreview {
    /// Preview id for this advisory artifact.
    pub preview_id: String,
    /// Aggregate consume preview status.
    pub status: String,
    /// Preview generation is always dry-run.
    pub dry_run: bool,
    /// Whether any stored review packet claims live execution.
    pub live_execution: bool,
    /// Selected review packet summary, if one can be safely previewed.
    pub selected_packet: Option<PersistedReviewPacketSummary>,
    /// Outbox status used to make this decision.
    pub outbox_status: ReviewOutboxStatus,
    /// Next local-safe action.
    pub next_action: String,
    /// Stable machine-readable decision reason.
    pub reason: String,
}

/// Local review-worker handoff envelope for manual OpenCode review.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReviewWorkerHandoffEnvelope {
    /// Envelope id for this local handoff artifact.
    pub envelope_id: String,
    /// Aggregate envelope status.
    pub status: String,
    /// Envelope generation is always dry-run.
    pub dry_run: bool,
    /// Whether any source artifact claims live execution.
    pub live_execution: bool,
    /// Intended review worker lane.
    pub handoff_target: String,
    /// Selected review packet summary, if one can be safely handed off.
    pub selected_packet: Option<PersistedReviewPacketSummary>,
    /// Consume preview used to make this decision.
    pub consume_preview: ReviewPacketConsumePreview,
    /// Next local-safe action.
    pub next_action: String,
    /// Stable machine-readable decision reason.
    pub reason: String,
}

/// Compact summary of a local review-worker handoff envelope.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PersistedReviewWorkerHandoffSummary {
    /// Envelope id for this local handoff artifact.
    pub envelope_id: String,
    /// Aggregate envelope status.
    pub status: String,
    /// Whether the envelope is dry-run only.
    pub dry_run: bool,
    /// Whether the envelope claims live execution happened.
    pub live_execution: bool,
    /// Intended review worker lane.
    pub handoff_target: String,
    /// Advisory next action from the envelope.
    pub next_action: String,
}

impl PersistedReviewWorkerHandoffSummary {
    /// Parses stable top-level fields from a local handoff envelope.
    pub fn from_json(json: &str) -> Option<Self> {
        Some(Self {
            envelope_id: extract_string(json, "envelope_id")?,
            status: extract_string(json, "status")?,
            dry_run: extract_bool(json, "dry_run")?,
            live_execution: extract_bool(json, "live_execution")?,
            handoff_target: extract_string(json, "handoff_target")?,
            next_action: extract_last_string(json, "next_action")?,
        })
    }

    /// Serializes the summary to compact JSON.
    pub fn to_json(&self) -> String {
        format!(
            "{{\"envelope_id\":\"{}\",\"status\":\"{}\",\"dry_run\":{},\"live_execution\":{},\"handoff_target\":\"{}\",\"next_action\":\"{}\"}}",
            escape_json(&self.envelope_id),
            escape_json(&self.status),
            self.dry_run,
            self.live_execution,
            escape_json(&self.handoff_target),
            escape_json(&self.next_action)
        )
    }
}

/// Read result for one local review-worker handoff envelope.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReviewWorkerHandoffReadReport {
    /// Parsed handoff envelope summary, if available.
    pub envelope: Option<PersistedReviewWorkerHandoffSummary>,
    /// Whether the envelope path was missing.
    pub missing: bool,
    /// Whether the envelope existed but could not be parsed.
    pub invalid: bool,
}

impl ReviewWorkerHandoffReadReport {
    /// Serializes the read report to compact JSON.
    pub fn to_json(&self) -> String {
        let envelope = self.envelope.as_ref().map_or_else(
            || "null".to_string(),
            PersistedReviewWorkerHandoffSummary::to_json,
        );
        format!(
            "{{\"envelope\":{},\"missing\":{},\"invalid\":{}}}",
            envelope, self.missing, self.invalid
        )
    }
}

/// Read-only status for a local review-worker handoff envelope.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReviewWorkerHandoffStatus {
    /// Status id for this advisory artifact.
    pub status_id: String,
    /// Aggregate handoff status.
    pub status: String,
    /// Status generation is always dry-run.
    pub dry_run: bool,
    /// Whether the parsed envelope claims live execution.
    pub live_execution: bool,
    /// Whether a parseable envelope was present.
    pub envelope_present: bool,
    /// Whether the envelope is safe for manual review-only handoff.
    pub review_only: bool,
    /// Handoff envelope summary, if present.
    pub envelope: Option<PersistedReviewWorkerHandoffSummary>,
    /// Next local-safe action.
    pub next_action: String,
    /// Stable machine-readable decision reason.
    pub reason: String,
}

/// Local manifest that binds review packet, consume preview, and handoff status.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReviewHandoffBundleManifest {
    /// Manifest id for this local handoff bundle artifact.
    pub manifest_id: String,
    /// Aggregate manifest status.
    pub status: String,
    /// Manifest generation is always dry-run.
    pub dry_run: bool,
    /// Whether any source artifact claims live execution.
    pub live_execution: bool,
    /// Whether the bundle is safe for manual review-only handoff.
    pub review_only: bool,
    /// Selected review packet summary, if present.
    pub selected_packet: Option<PersistedReviewPacketSummary>,
    /// Consume preview used to select the packet.
    pub consume_preview: ReviewPacketConsumePreview,
    /// Verified handoff status for the manual review lane.
    pub handoff_status: ReviewWorkerHandoffStatus,
    /// Next local-safe action.
    pub next_action: String,
    /// Stable machine-readable decision reason.
    pub reason: String,
}

/// Compact summary of a local review-handoff bundle manifest.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PersistedReviewHandoffBundleManifestSummary {
    /// Manifest id for this local handoff bundle artifact.
    pub manifest_id: String,
    /// Aggregate manifest status.
    pub status: String,
    /// Whether the manifest is dry-run only.
    pub dry_run: bool,
    /// Whether the manifest claims live execution happened.
    pub live_execution: bool,
    /// Whether the manifest is safe for review-only handoff.
    pub review_only: bool,
    /// Selected review packet id, if present in the manifest.
    pub selected_packet_id: Option<String>,
    /// Advisory next action from the manifest.
    pub next_action: String,
}

/// Read result for one local review-handoff bundle manifest.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReviewHandoffBundleManifestReadReport {
    /// Parsed handoff bundle manifest summary, if available.
    pub manifest: Option<PersistedReviewHandoffBundleManifestSummary>,
    /// Whether the manifest path was missing.
    pub missing: bool,
    /// Whether the manifest existed but could not be parsed.
    pub invalid: bool,
}

/// Read-only status for a local review-handoff bundle manifest.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReviewHandoffBundleManifestStatus {
    /// Status id for this advisory artifact.
    pub status_id: String,
    /// Aggregate manifest status.
    pub status: String,
    /// Status generation is always dry-run.
    pub dry_run: bool,
    /// Whether the parsed manifest claims live execution.
    pub live_execution: bool,
    /// Whether a parseable manifest was present.
    pub manifest_present: bool,
    /// Whether the manifest is safe for manual review-only handoff.
    pub review_only: bool,
    /// Handoff bundle manifest summary, if present.
    pub manifest: Option<PersistedReviewHandoffBundleManifestSummary>,
    /// Next local-safe action.
    pub next_action: String,
    /// Stable machine-readable decision reason.
    pub reason: String,
}

/// Operator-facing card for manual OpenCode review-only handoff.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReviewHandoffOperatorCard {
    /// Card id for this advisory artifact.
    pub card_id: String,
    /// Aggregate operator-card status.
    pub status: String,
    /// Card generation is always dry-run.
    pub dry_run: bool,
    /// Whether the status chain claims live execution.
    pub live_execution: bool,
    /// Short human-facing card title.
    pub title: String,
    /// Manual operator action. This is an instruction, not execution.
    pub operator_action: String,
    /// Manifest status used to generate this card.
    pub manifest_status: ReviewHandoffBundleManifestStatus,
    /// Next local-safe action.
    pub next_action: String,
    /// Stable machine-readable decision reason.
    pub reason: String,
}

/// Manual review candidate returned by a human-operated OpenCode review lane.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ManualReviewCandidate {
    /// Candidate id for this local review artifact.
    pub candidate_id: String,
    /// Operator card id this candidate answers.
    pub source_card_id: String,
    /// Candidate artifact status.
    pub status: String,
    /// Candidate intake is always dry-run until a separate gate consumes it.
    pub dry_run: bool,
    /// Whether the candidate claims live execution.
    pub live_execution: bool,
    /// Whether the reviewer stayed in review-only mode.
    pub review_only: bool,
    /// Review verdict such as `pass`, `warn`, or `fail`.
    pub verdict: String,
    /// Whether the reviewer found a blocking issue.
    pub blocking_issue: bool,
    /// Advisory next action from the candidate.
    pub next_action: String,
}

/// Read result for one manual review candidate artifact.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReviewCandidateReadReport {
    /// Parsed manual review candidate, if available.
    pub candidate: Option<ManualReviewCandidate>,
    /// Whether the candidate path was missing.
    pub missing: bool,
    /// Whether the candidate existed but could not be parsed.
    pub invalid: bool,
}

/// Read-only intake status for a manual review candidate.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReviewCandidateIntakeStatus {
    /// Status id for this advisory artifact.
    pub status_id: String,
    /// Aggregate candidate intake status.
    pub status: String,
    /// Status generation is always dry-run.
    pub dry_run: bool,
    /// Whether the card/candidate chain claims live execution.
    pub live_execution: bool,
    /// Whether a parseable candidate was present.
    pub candidate_present: bool,
    /// Whether the candidate stayed review-only.
    pub review_only: bool,
    /// Expected operator card id for stale/mismatch protection.
    pub expected_card_id: String,
    /// Candidate summary, if present.
    pub candidate: Option<ManualReviewCandidate>,
    /// Next local-safe action.
    pub next_action: String,
    /// Stable machine-readable decision reason.
    pub reason: String,
}

/// Local-only preview for transitioning an accepted review result.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReviewResultTransitionPreview {
    /// Preview id for this advisory artifact.
    pub preview_id: String,
    /// Aggregate transition preview status.
    pub status: String,
    /// Preview generation is always dry-run.
    pub dry_run: bool,
    /// Whether the candidate status chain claims live execution.
    pub live_execution: bool,
    /// Candidate intake status used to make this decision.
    pub candidate_status: ReviewCandidateIntakeStatus,
    /// Whether the candidate is ready for a later explicit result-transition gate.
    pub transition_allowed: bool,
    /// Whether this preview may consume queue entries.
    pub queue_consumption_allowed: bool,
    /// Whether this preview may mutate source files.
    pub source_mutation_allowed: bool,
    /// Next local-safe action.
    pub next_action: String,
    /// Stable machine-readable decision reason.
    pub reason: String,
}

/// Operator-facing gate for deciding whether to accept a review result.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReviewResultTransitionGate {
    /// Gate id for this advisory artifact.
    pub gate_id: String,
    /// Aggregate transition gate status.
    pub status: String,
    /// Gate generation is always dry-run.
    pub dry_run: bool,
    /// Whether the transition preview chain claims live execution.
    pub live_execution: bool,
    /// Short human-facing gate title.
    pub title: String,
    /// Manual operator action. This is an instruction, not execution.
    pub operator_action: String,
    /// Preview used to prepare this gate.
    pub transition_preview: ReviewResultTransitionPreview,
    /// Whether a human decision is required before any later transition.
    pub human_decision_required: bool,
    /// Whether this gate may consume queue entries.
    pub queue_consumption_allowed: bool,
    /// Whether this gate may mutate source files.
    pub source_mutation_allowed: bool,
    /// Next local-safe action.
    pub next_action: String,
    /// Stable machine-readable decision reason.
    pub reason: String,
}

/// Compact summary of a local review result transition gate.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PersistedReviewResultTransitionGateSummary {
    /// Gate id for this advisory artifact.
    pub gate_id: String,
    /// Aggregate transition gate status.
    pub status: String,
    /// Whether the gate is dry-run only.
    pub dry_run: bool,
    /// Whether the gate claims live execution happened.
    pub live_execution: bool,
    /// Whether a human decision is required before transition.
    pub human_decision_required: bool,
    /// Whether the gate allows queue consumption.
    pub queue_consumption_allowed: bool,
    /// Whether the gate allows source mutation.
    pub source_mutation_allowed: bool,
    /// Manual operator action recorded by the gate.
    pub operator_action: String,
    /// Advisory next action from the gate.
    pub next_action: String,
}

/// Read result for one local review result transition gate artifact.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReviewResultTransitionGateReadReport {
    /// Parsed transition gate summary, if available.
    pub gate: Option<PersistedReviewResultTransitionGateSummary>,
    /// Whether the gate path was missing.
    pub missing: bool,
    /// Whether the gate existed but could not be parsed.
    pub invalid: bool,
}

/// Read-only status for a local review result transition gate.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReviewResultTransitionGateStatus {
    /// Status id for this advisory artifact.
    pub status_id: String,
    /// Aggregate gate status.
    pub status: String,
    /// Status generation is always dry-run.
    pub dry_run: bool,
    /// Whether the parsed gate claims live execution.
    pub live_execution: bool,
    /// Whether a parseable gate was present.
    pub gate_present: bool,
    /// Whether a human decision is required before transition.
    pub human_decision_required: bool,
    /// Whether the parsed gate allows queue consumption.
    pub queue_consumption_allowed: bool,
    /// Whether the parsed gate allows source mutation.
    pub source_mutation_allowed: bool,
    /// Transition gate summary, if present.
    pub gate: Option<PersistedReviewResultTransitionGateSummary>,
    /// Next local-safe action.
    pub next_action: String,
    /// Stable machine-readable decision reason.
    pub reason: String,
}

/// Human/operator decision artifact for a review-result transition.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct HumanTransitionDecision {
    /// Decision id for this local operator artifact.
    pub decision_id: String,
    /// Transition gate id this decision answers.
    pub source_gate_id: String,
    /// Human decision kind: `accept`, `reject`, or `hold`.
    pub decision_kind: String,
    /// Decision artifact status.
    pub status: String,
    /// Decision intake is always dry-run until a later execution gate.
    pub dry_run: bool,
    /// Whether the decision claims live execution happened.
    pub live_execution: bool,
    /// Whether this decision allows queue consumption.
    pub queue_consumption_allowed: bool,
    /// Whether this decision allows source mutation.
    pub source_mutation_allowed: bool,
    /// Operator note for local audit.
    pub operator_notes: String,
    /// Advisory next action from the decision.
    pub next_action: String,
}

/// Read result for one human transition decision artifact.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct HumanTransitionDecisionReadReport {
    /// Parsed human transition decision, if available.
    pub decision: Option<HumanTransitionDecision>,
    /// Whether the decision path was missing.
    pub missing: bool,
    /// Whether the decision existed but could not be parsed.
    pub invalid: bool,
}

/// Read-only intake status for a human transition decision.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct HumanTransitionDecisionIntakeStatus {
    /// Status id for this advisory artifact.
    pub status_id: String,
    /// Aggregate human decision intake status.
    pub status: String,
    /// Status generation is always dry-run.
    pub dry_run: bool,
    /// Whether the gate/decision chain claims live execution.
    pub live_execution: bool,
    /// Whether a parseable human decision was present.
    pub decision_present: bool,
    /// Human decision kind, or `none` when unavailable.
    pub decision_kind: String,
    /// Expected transition gate id for stale/mismatch protection.
    pub expected_gate_id: String,
    /// Decision artifact, if present.
    pub decision: Option<HumanTransitionDecision>,
    /// Whether this intake allows queue consumption.
    pub queue_consumption_allowed: bool,
    /// Whether this intake allows source mutation.
    pub source_mutation_allowed: bool,
    /// Next local-safe action.
    pub next_action: String,
    /// Stable machine-readable decision reason.
    pub reason: String,
}

/// No-mutation preview for a human-approved review-result transition.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TransitionExecutionPreview {
    /// Preview id for this advisory artifact.
    pub preview_id: String,
    /// Aggregate transition execution preview status.
    pub status: String,
    /// Preview generation is always dry-run.
    pub dry_run: bool,
    /// Whether the decision intake chain claims live execution.
    pub live_execution: bool,
    /// Human decision intake status used to make this preview.
    pub decision_status: HumanTransitionDecisionIntakeStatus,
    /// Human decision kind being previewed.
    pub decision_kind: String,
    /// Transition action that would happen in a later explicit apply gate.
    pub transition_action: String,
    /// Whether this preview may consume queue entries.
    pub queue_consumption_allowed: bool,
    /// Whether this preview may mutate source files.
    pub source_mutation_allowed: bool,
    /// Whether this preview may mutate persisted orchestrator state.
    pub state_mutation_allowed: bool,
    /// Next local-safe action.
    pub next_action: String,
    /// Stable machine-readable decision reason.
    pub reason: String,
}

/// Operator-facing apply gate preview for a transition execution preview.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TransitionApplyGatePreview {
    /// Gate id for this advisory artifact.
    pub gate_id: String,
    /// Aggregate apply gate preview status.
    pub status: String,
    /// Gate preview generation is always dry-run.
    pub dry_run: bool,
    /// Whether the transition preview chain claims live execution.
    pub live_execution: bool,
    /// Short human-facing gate title.
    pub title: String,
    /// Manual operator action. This is an instruction, not execution.
    pub operator_action: String,
    /// Transition execution preview used to prepare this apply gate.
    pub transition_preview: TransitionExecutionPreview,
    /// Human decision kind being gated.
    pub decision_kind: String,
    /// Transition action that would require a later explicit apply approval.
    pub transition_action: String,
    /// Whether a human approval is required before any later apply step.
    pub human_approval_required: bool,
    /// Whether exact gate-specific approval is required.
    pub exact_approval_required: bool,
    /// Whether this gate preview may consume queue entries.
    pub queue_consumption_allowed: bool,
    /// Whether this gate preview may mutate source files.
    pub source_mutation_allowed: bool,
    /// Whether this gate preview may mutate persisted orchestrator state.
    pub state_mutation_allowed: bool,
    /// Next local-safe action.
    pub next_action: String,
    /// Stable machine-readable decision reason.
    pub reason: String,
}

/// Exact human approval artifact for a transition apply gate preview.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TransitionApplyApproval {
    /// Approval id for this local operator artifact.
    pub approval_id: String,
    /// Apply gate id this approval answers.
    pub source_gate_id: String,
    /// Approval type: `apply`, `reject`, or `hold`.
    pub approval_type: String,
    /// Exact approval text supplied by the operator.
    pub approval_text: String,
    /// Approval artifact status.
    pub status: String,
    /// Approval intake is always dry-run until a later apply packet.
    pub dry_run: bool,
    /// Whether the approval claims live execution happened.
    pub live_execution: bool,
    /// Whether this approval allows queue consumption.
    pub queue_consumption_allowed: bool,
    /// Whether this approval allows source mutation.
    pub source_mutation_allowed: bool,
    /// Whether this approval allows persisted orchestrator state mutation.
    pub state_mutation_allowed: bool,
    /// Operator note for local audit.
    pub operator_notes: String,
    /// Advisory next action from the approval.
    pub next_action: String,
}

/// Read result for one transition apply approval artifact.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TransitionApplyApprovalReadReport {
    /// Parsed transition apply approval, if available.
    pub approval: Option<TransitionApplyApproval>,
    /// Whether the approval path was missing.
    pub missing: bool,
    /// Whether the approval existed but could not be parsed.
    pub invalid: bool,
}

/// Read-only intake status for an exact transition apply approval.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TransitionApplyApprovalIntakeStatus {
    /// Status id for this advisory artifact.
    pub status_id: String,
    /// Aggregate apply approval intake status.
    pub status: String,
    /// Status generation is always dry-run.
    pub dry_run: bool,
    /// Whether the gate/approval chain claims live execution.
    pub live_execution: bool,
    /// Whether a parseable approval was present.
    pub approval_present: bool,
    /// Approval type, or `none` when unavailable.
    pub approval_type: String,
    /// Expected apply gate id for stale/mismatch protection.
    pub expected_gate_id: String,
    /// Exact approval text required for this gate.
    pub expected_approval_text: String,
    /// Approval artifact, if present.
    pub approval: Option<TransitionApplyApproval>,
    /// Whether this intake allows queue consumption.
    pub queue_consumption_allowed: bool,
    /// Whether this intake allows source mutation.
    pub source_mutation_allowed: bool,
    /// Whether this intake allows persisted orchestrator state mutation.
    pub state_mutation_allowed: bool,
    /// Next local-safe action.
    pub next_action: String,
    /// Stable machine-readable decision reason.
    pub reason: String,
}

/// No-mutation execution plan for a transition apply approval.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TransitionApplyExecutionPlan {
    /// Plan id for this advisory artifact.
    pub plan_id: String,
    /// Aggregate execution-plan status.
    pub status: String,
    /// Plan generation is always dry-run.
    pub dry_run: bool,
    /// Whether the approval intake chain claims live execution.
    pub live_execution: bool,
    /// Approval intake status used to make this plan.
    pub approval_status: TransitionApplyApprovalIntakeStatus,
    /// Approval type being planned: `apply`, `reject`, or `hold`.
    pub approval_type: String,
    /// Planned transition that would require a later explicit execution gate.
    pub planned_transition: String,
    /// Whether this artifact is plan-only.
    pub plan_only: bool,
    /// Whether a later exact gate is still required before mutation.
    pub apply_requires_next_gate: bool,
    /// Whether this plan may consume queue entries.
    pub queue_consumption_allowed: bool,
    /// Whether this plan may mutate source files.
    pub source_mutation_allowed: bool,
    /// Whether this plan may mutate persisted orchestrator state.
    pub state_mutation_allowed: bool,
    /// Next local-safe action.
    pub next_action: String,
    /// Stable machine-readable decision reason.
    pub reason: String,
}

/// Operator-facing execution gate preview for a transition apply plan.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TransitionApplyExecutionGatePreview {
    /// Gate id for this advisory artifact.
    pub gate_id: String,
    /// Aggregate execution gate preview status.
    pub status: String,
    /// Gate preview generation is always dry-run.
    pub dry_run: bool,
    /// Whether the execution plan chain claims live execution.
    pub live_execution: bool,
    /// Short human-facing gate title.
    pub title: String,
    /// Manual operator action. This is an instruction, not execution.
    pub operator_action: String,
    /// Execution plan used to prepare this gate.
    pub execution_plan: TransitionApplyExecutionPlan,
    /// Approval type being gated: `apply`, `reject`, or `hold`.
    pub approval_type: String,
    /// Planned transition that would require a later exact execution approval.
    pub planned_transition: String,
    /// Whether a human approval is required before any later execution step.
    pub human_execution_approval_required: bool,
    /// Whether exact gate-specific execution approval is required.
    pub exact_execution_approval_required: bool,
    /// Whether this gate preview may consume queue entries.
    pub queue_consumption_allowed: bool,
    /// Whether this gate preview may mutate source files.
    pub source_mutation_allowed: bool,
    /// Whether this gate preview may mutate persisted orchestrator state.
    pub state_mutation_allowed: bool,
    /// Next local-safe action.
    pub next_action: String,
    /// Stable machine-readable decision reason.
    pub reason: String,
}

/// Exact human approval artifact for a transition apply execution gate preview.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TransitionApplyExecutionApproval {
    /// Approval id for this local operator artifact.
    pub approval_id: String,
    /// Execution gate id this approval answers.
    pub source_gate_id: String,
    /// Approval type: `apply`, `reject`, or `hold`.
    pub approval_type: String,
    /// Exact approval text supplied by the operator.
    pub approval_text: String,
    /// Approval artifact status.
    pub status: String,
    /// Approval intake is always dry-run until a later apply packet.
    pub dry_run: bool,
    /// Whether the approval claims live execution happened.
    pub live_execution: bool,
    /// Whether this approval allows queue consumption.
    pub queue_consumption_allowed: bool,
    /// Whether this approval allows source mutation.
    pub source_mutation_allowed: bool,
    /// Whether this approval allows persisted orchestrator state mutation.
    pub state_mutation_allowed: bool,
    /// Operator note for local audit.
    pub operator_notes: String,
    /// Advisory next action from the approval.
    pub next_action: String,
}

/// Read result for one transition apply execution approval artifact.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TransitionApplyExecutionApprovalReadReport {
    /// Parsed transition apply execution approval, if available.
    pub approval: Option<TransitionApplyExecutionApproval>,
    /// Whether the approval path was missing.
    pub missing: bool,
    /// Whether the approval existed but could not be parsed.
    pub invalid: bool,
}

/// Read-only intake status for an exact transition apply execution approval.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TransitionApplyExecutionApprovalIntakeStatus {
    /// Status id for this advisory artifact.
    pub status_id: String,
    /// Aggregate execution approval intake status.
    pub status: String,
    /// Status generation is always dry-run.
    pub dry_run: bool,
    /// Whether the gate/approval chain claims live execution.
    pub live_execution: bool,
    /// Whether a parseable approval was present.
    pub approval_present: bool,
    /// Approval type, or `none` when unavailable.
    pub approval_type: String,
    /// Expected execution gate id for stale/mismatch protection.
    pub expected_gate_id: String,
    /// Exact approval text required for this execution gate.
    pub expected_approval_text: String,
    /// Approval artifact, if present.
    pub approval: Option<TransitionApplyExecutionApproval>,
    /// Whether this intake allows queue consumption.
    pub queue_consumption_allowed: bool,
    /// Whether this intake allows source mutation.
    pub source_mutation_allowed: bool,
    /// Whether this intake allows persisted orchestrator state mutation.
    pub state_mutation_allowed: bool,
    /// Next local-safe action.
    pub next_action: String,
    /// Stable machine-readable decision reason.
    pub reason: String,
}

/// No-mutation execution packet prepared from an exact execution approval.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TransitionApplyExecutionPacketNoMutation {
    /// Packet id for this advisory artifact.
    pub packet_id: String,
    /// Aggregate execution-packet status.
    pub status: String,
    /// Packet generation is always dry-run.
    pub dry_run: bool,
    /// Whether the approval intake chain claims live execution.
    pub live_execution: bool,
    /// Approval intake status used to make this packet.
    pub approval_status: TransitionApplyExecutionApprovalIntakeStatus,
    /// Approval type being prepared: `apply`, `reject`, or `hold`.
    pub approval_type: String,
    /// Transition action represented by this packet.
    pub transition_action: String,
    /// Whether this artifact is packet-only and does not execute mutation.
    pub packet_only: bool,
    /// Whether a later exact mutation gate is still required.
    pub mutation_requires_next_gate: bool,
    /// Whether this packet may consume queue entries.
    pub queue_consumption_allowed: bool,
    /// Whether this packet may mutate source files.
    pub source_mutation_allowed: bool,
    /// Whether this packet may mutate persisted orchestrator state.
    pub state_mutation_allowed: bool,
    /// Next local-safe action.
    pub next_action: String,
    /// Stable machine-readable decision reason.
    pub reason: String,
}

impl ReviewWorkerHandoffStatus {
    /// Serializes the handoff status to compact JSON.
    pub fn to_json(&self) -> String {
        let envelope = self.envelope.as_ref().map_or_else(
            || "null".to_string(),
            PersistedReviewWorkerHandoffSummary::to_json,
        );
        format!(
            "{{\"status_id\":\"{}\",\"status\":\"{}\",\"dry_run\":{},\"live_execution\":{},\"envelope_present\":{},\"review_only\":{},\"envelope\":{},\"next_action\":\"{}\",\"reason\":\"{}\"}}",
            escape_json(&self.status_id),
            escape_json(&self.status),
            self.dry_run,
            self.live_execution,
            self.envelope_present,
            self.review_only,
            envelope,
            escape_json(&self.next_action),
            escape_json(&self.reason)
        )
    }
}

impl PersistedReviewHandoffBundleManifestSummary {
    /// Parses stable top-level fields from a local handoff bundle manifest.
    pub fn from_json(json: &str) -> Option<Self> {
        if !json.contains("\"manifest_kind\":\"review_handoff_bundle_manifest\"") {
            return None;
        }
        Some(Self {
            manifest_id: extract_string(json, "manifest_id")?,
            status: extract_string(json, "status")?,
            dry_run: extract_bool(json, "dry_run")?,
            live_execution: extract_bool(json, "live_execution")?,
            review_only: extract_bool(json, "review_only")?,
            selected_packet_id: extract_string(json, "packet_id"),
            next_action: extract_last_string(json, "next_action")?,
        })
    }

    /// Serializes the summary to compact JSON.
    pub fn to_json(&self) -> String {
        let selected_packet_id = self.selected_packet_id.as_ref().map_or_else(
            || "null".to_string(),
            |packet_id| format!("\"{}\"", escape_json(packet_id)),
        );
        format!(
            "{{\"manifest_id\":\"{}\",\"status\":\"{}\",\"dry_run\":{},\"live_execution\":{},\"review_only\":{},\"selected_packet_id\":{},\"next_action\":\"{}\"}}",
            escape_json(&self.manifest_id),
            escape_json(&self.status),
            self.dry_run,
            self.live_execution,
            self.review_only,
            selected_packet_id,
            escape_json(&self.next_action)
        )
    }
}

impl ReviewHandoffBundleManifestReadReport {
    /// Serializes the read report to compact JSON.
    pub fn to_json(&self) -> String {
        let manifest = self.manifest.as_ref().map_or_else(
            || "null".to_string(),
            PersistedReviewHandoffBundleManifestSummary::to_json,
        );
        format!(
            "{{\"manifest\":{},\"missing\":{},\"invalid\":{}}}",
            manifest, self.missing, self.invalid
        )
    }
}

impl ReviewHandoffBundleManifestStatus {
    /// Serializes the handoff bundle manifest status to compact JSON.
    pub fn to_json(&self) -> String {
        let manifest = self.manifest.as_ref().map_or_else(
            || "null".to_string(),
            PersistedReviewHandoffBundleManifestSummary::to_json,
        );
        format!(
            "{{\"status_id\":\"{}\",\"status\":\"{}\",\"dry_run\":{},\"live_execution\":{},\"manifest_present\":{},\"review_only\":{},\"manifest\":{},\"next_action\":\"{}\",\"reason\":\"{}\"}}",
            escape_json(&self.status_id),
            escape_json(&self.status),
            self.dry_run,
            self.live_execution,
            self.manifest_present,
            self.review_only,
            manifest,
            escape_json(&self.next_action),
            escape_json(&self.reason)
        )
    }
}

impl ReviewHandoffOperatorCard {
    /// Serializes the operator card to compact JSON.
    pub fn to_json(&self) -> String {
        format!(
            "{{\"card_id\":\"{}\",\"card_kind\":\"review_handoff_operator_card\",\"status\":\"{}\",\"dry_run\":{},\"live_execution\":{},\"title\":\"{}\",\"operator_action\":\"{}\",\"manifest_status\":{},\"next_action\":\"{}\",\"reason\":\"{}\"}}",
            escape_json(&self.card_id),
            escape_json(&self.status),
            self.dry_run,
            self.live_execution,
            escape_json(&self.title),
            escape_json(&self.operator_action),
            self.manifest_status.to_json(),
            escape_json(&self.next_action),
            escape_json(&self.reason)
        )
    }
}

impl ManualReviewCandidate {
    /// Parses stable top-level fields from a manual review candidate artifact.
    pub fn from_json(json: &str) -> Option<Self> {
        if !json.contains("\"candidate_kind\":\"manual_opencode_review_candidate\"") {
            return None;
        }
        Some(Self {
            candidate_id: extract_string(json, "candidate_id")?,
            source_card_id: extract_string(json, "source_card_id")?,
            status: extract_string(json, "status")?,
            dry_run: extract_bool(json, "dry_run")?,
            live_execution: extract_bool(json, "live_execution")?,
            review_only: extract_bool(json, "review_only")?,
            verdict: extract_string(json, "verdict")?,
            blocking_issue: extract_bool(json, "blocking_issue")?,
            next_action: extract_last_string(json, "next_action")?,
        })
    }

    /// Serializes the candidate to compact JSON.
    pub fn to_json(&self) -> String {
        format!(
            "{{\"candidate_id\":\"{}\",\"candidate_kind\":\"manual_opencode_review_candidate\",\"source_card_id\":\"{}\",\"status\":\"{}\",\"dry_run\":{},\"live_execution\":{},\"review_only\":{},\"verdict\":\"{}\",\"blocking_issue\":{},\"next_action\":\"{}\"}}",
            escape_json(&self.candidate_id),
            escape_json(&self.source_card_id),
            escape_json(&self.status),
            self.dry_run,
            self.live_execution,
            self.review_only,
            escape_json(&self.verdict),
            self.blocking_issue,
            escape_json(&self.next_action)
        )
    }
}

impl ReviewCandidateReadReport {
    /// Serializes the candidate read report to compact JSON.
    pub fn to_json(&self) -> String {
        let candidate = self
            .candidate
            .as_ref()
            .map_or_else(|| "null".to_string(), ManualReviewCandidate::to_json);
        format!(
            "{{\"candidate\":{},\"missing\":{},\"invalid\":{}}}",
            candidate, self.missing, self.invalid
        )
    }
}

impl ReviewCandidateIntakeStatus {
    /// Serializes the candidate intake status to compact JSON.
    pub fn to_json(&self) -> String {
        let candidate = self
            .candidate
            .as_ref()
            .map_or_else(|| "null".to_string(), ManualReviewCandidate::to_json);
        format!(
            "{{\"status_id\":\"{}\",\"status\":\"{}\",\"dry_run\":{},\"live_execution\":{},\"candidate_present\":{},\"review_only\":{},\"expected_card_id\":\"{}\",\"candidate\":{},\"next_action\":\"{}\",\"reason\":\"{}\"}}",
            escape_json(&self.status_id),
            escape_json(&self.status),
            self.dry_run,
            self.live_execution,
            self.candidate_present,
            self.review_only,
            escape_json(&self.expected_card_id),
            candidate,
            escape_json(&self.next_action),
            escape_json(&self.reason)
        )
    }
}

impl ReviewResultTransitionPreview {
    /// Serializes the transition preview to compact JSON.
    pub fn to_json(&self) -> String {
        format!(
            "{{\"preview_id\":\"{}\",\"status\":\"{}\",\"dry_run\":{},\"live_execution\":{},\"candidate_status\":{},\"transition_allowed\":{},\"queue_consumption_allowed\":{},\"source_mutation_allowed\":{},\"next_action\":\"{}\",\"reason\":\"{}\"}}",
            escape_json(&self.preview_id),
            escape_json(&self.status),
            self.dry_run,
            self.live_execution,
            self.candidate_status.to_json(),
            self.transition_allowed,
            self.queue_consumption_allowed,
            self.source_mutation_allowed,
            escape_json(&self.next_action),
            escape_json(&self.reason)
        )
    }
}

impl ReviewResultTransitionGate {
    /// Serializes the transition gate to compact JSON.
    pub fn to_json(&self) -> String {
        format!(
            "{{\"gate_id\":\"{}\",\"gate_kind\":\"review_result_transition_gate\",\"status\":\"{}\",\"dry_run\":{},\"live_execution\":{},\"title\":\"{}\",\"operator_action\":\"{}\",\"transition_preview\":{},\"human_decision_required\":{},\"queue_consumption_allowed\":{},\"source_mutation_allowed\":{},\"next_action\":\"{}\",\"reason\":\"{}\"}}",
            escape_json(&self.gate_id),
            escape_json(&self.status),
            self.dry_run,
            self.live_execution,
            escape_json(&self.title),
            escape_json(&self.operator_action),
            self.transition_preview.to_json(),
            self.human_decision_required,
            self.queue_consumption_allowed,
            self.source_mutation_allowed,
            escape_json(&self.next_action),
            escape_json(&self.reason)
        )
    }
}

impl PersistedReviewResultTransitionGateSummary {
    /// Parses stable top-level fields from a local transition gate.
    pub fn from_json(json: &str) -> Option<Self> {
        if !json.contains("\"gate_kind\":\"review_result_transition_gate\"") {
            return None;
        }
        Some(Self {
            gate_id: extract_string(json, "gate_id")?,
            status: extract_string(json, "status")?,
            dry_run: extract_bool(json, "dry_run")?,
            live_execution: extract_bool(json, "live_execution")?,
            human_decision_required: extract_bool(json, "human_decision_required")?,
            queue_consumption_allowed: extract_bool(json, "queue_consumption_allowed")?,
            source_mutation_allowed: extract_bool(json, "source_mutation_allowed")?,
            operator_action: extract_string(json, "operator_action")?,
            next_action: extract_last_string(json, "next_action")?,
        })
    }

    /// Serializes the summary to compact JSON.
    pub fn to_json(&self) -> String {
        format!(
            "{{\"gate_id\":\"{}\",\"status\":\"{}\",\"dry_run\":{},\"live_execution\":{},\"human_decision_required\":{},\"queue_consumption_allowed\":{},\"source_mutation_allowed\":{},\"operator_action\":\"{}\",\"next_action\":\"{}\"}}",
            escape_json(&self.gate_id),
            escape_json(&self.status),
            self.dry_run,
            self.live_execution,
            self.human_decision_required,
            self.queue_consumption_allowed,
            self.source_mutation_allowed,
            escape_json(&self.operator_action),
            escape_json(&self.next_action)
        )
    }
}

impl ReviewResultTransitionGateReadReport {
    /// Serializes the transition gate read report to compact JSON.
    pub fn to_json(&self) -> String {
        let gate = self.gate.as_ref().map_or_else(
            || "null".to_string(),
            PersistedReviewResultTransitionGateSummary::to_json,
        );
        format!(
            "{{\"gate\":{},\"missing\":{},\"invalid\":{}}}",
            gate, self.missing, self.invalid
        )
    }
}

impl ReviewResultTransitionGateStatus {
    /// Serializes the transition gate status to compact JSON.
    pub fn to_json(&self) -> String {
        let gate = self.gate.as_ref().map_or_else(
            || "null".to_string(),
            PersistedReviewResultTransitionGateSummary::to_json,
        );
        format!(
            "{{\"status_id\":\"{}\",\"status\":\"{}\",\"dry_run\":{},\"live_execution\":{},\"gate_present\":{},\"human_decision_required\":{},\"queue_consumption_allowed\":{},\"source_mutation_allowed\":{},\"gate\":{},\"next_action\":\"{}\",\"reason\":\"{}\"}}",
            escape_json(&self.status_id),
            escape_json(&self.status),
            self.dry_run,
            self.live_execution,
            self.gate_present,
            self.human_decision_required,
            self.queue_consumption_allowed,
            self.source_mutation_allowed,
            gate,
            escape_json(&self.next_action),
            escape_json(&self.reason)
        )
    }
}

impl HumanTransitionDecision {
    /// Parses stable top-level fields from a human transition decision artifact.
    pub fn from_json(json: &str) -> Option<Self> {
        if !json.contains("\"decision_kind\":\"human_transition_decision\"") {
            return None;
        }
        Some(Self {
            decision_id: extract_string(json, "decision_id")?,
            source_gate_id: extract_string(json, "source_gate_id")?,
            decision_kind: extract_string(json, "decision_type")?,
            status: extract_string(json, "status")?,
            dry_run: extract_bool(json, "dry_run")?,
            live_execution: extract_bool(json, "live_execution")?,
            queue_consumption_allowed: extract_bool(json, "queue_consumption_allowed")?,
            source_mutation_allowed: extract_bool(json, "source_mutation_allowed")?,
            operator_notes: extract_string(json, "operator_notes")?,
            next_action: extract_last_string(json, "next_action")?,
        })
    }

    /// Serializes the human transition decision to compact JSON.
    pub fn to_json(&self) -> String {
        format!(
            "{{\"decision_id\":\"{}\",\"decision_kind\":\"human_transition_decision\",\"source_gate_id\":\"{}\",\"decision_type\":\"{}\",\"status\":\"{}\",\"dry_run\":{},\"live_execution\":{},\"queue_consumption_allowed\":{},\"source_mutation_allowed\":{},\"operator_notes\":\"{}\",\"next_action\":\"{}\"}}",
            escape_json(&self.decision_id),
            escape_json(&self.source_gate_id),
            escape_json(&self.decision_kind),
            escape_json(&self.status),
            self.dry_run,
            self.live_execution,
            self.queue_consumption_allowed,
            self.source_mutation_allowed,
            escape_json(&self.operator_notes),
            escape_json(&self.next_action)
        )
    }
}

impl HumanTransitionDecisionReadReport {
    /// Serializes the human decision read report to compact JSON.
    pub fn to_json(&self) -> String {
        let decision = self
            .decision
            .as_ref()
            .map_or_else(|| "null".to_string(), HumanTransitionDecision::to_json);
        format!(
            "{{\"decision\":{},\"missing\":{},\"invalid\":{}}}",
            decision, self.missing, self.invalid
        )
    }
}

impl HumanTransitionDecisionIntakeStatus {
    /// Serializes the human decision intake status to compact JSON.
    pub fn to_json(&self) -> String {
        let decision = self
            .decision
            .as_ref()
            .map_or_else(|| "null".to_string(), HumanTransitionDecision::to_json);
        format!(
            "{{\"status_id\":\"{}\",\"status\":\"{}\",\"dry_run\":{},\"live_execution\":{},\"decision_present\":{},\"decision_kind\":\"{}\",\"expected_gate_id\":\"{}\",\"decision\":{},\"queue_consumption_allowed\":{},\"source_mutation_allowed\":{},\"next_action\":\"{}\",\"reason\":\"{}\"}}",
            escape_json(&self.status_id),
            escape_json(&self.status),
            self.dry_run,
            self.live_execution,
            self.decision_present,
            escape_json(&self.decision_kind),
            escape_json(&self.expected_gate_id),
            decision,
            self.queue_consumption_allowed,
            self.source_mutation_allowed,
            escape_json(&self.next_action),
            escape_json(&self.reason)
        )
    }
}

impl TransitionExecutionPreview {
    /// Serializes the transition execution preview to compact JSON.
    pub fn to_json(&self) -> String {
        format!(
            "{{\"preview_id\":\"{}\",\"status\":\"{}\",\"dry_run\":{},\"live_execution\":{},\"decision_status\":{},\"decision_kind\":\"{}\",\"transition_action\":\"{}\",\"queue_consumption_allowed\":{},\"source_mutation_allowed\":{},\"state_mutation_allowed\":{},\"next_action\":\"{}\",\"reason\":\"{}\"}}",
            escape_json(&self.preview_id),
            escape_json(&self.status),
            self.dry_run,
            self.live_execution,
            self.decision_status.to_json(),
            escape_json(&self.decision_kind),
            escape_json(&self.transition_action),
            self.queue_consumption_allowed,
            self.source_mutation_allowed,
            self.state_mutation_allowed,
            escape_json(&self.next_action),
            escape_json(&self.reason)
        )
    }
}

impl TransitionApplyGatePreview {
    /// Serializes the transition apply gate preview to compact JSON.
    pub fn to_json(&self) -> String {
        format!(
            "{{\"gate_id\":\"{}\",\"gate_kind\":\"transition_apply_gate_preview\",\"status\":\"{}\",\"dry_run\":{},\"live_execution\":{},\"title\":\"{}\",\"operator_action\":\"{}\",\"transition_preview\":{},\"decision_kind\":\"{}\",\"transition_action\":\"{}\",\"human_approval_required\":{},\"exact_approval_required\":{},\"queue_consumption_allowed\":{},\"source_mutation_allowed\":{},\"state_mutation_allowed\":{},\"next_action\":\"{}\",\"reason\":\"{}\"}}",
            escape_json(&self.gate_id),
            escape_json(&self.status),
            self.dry_run,
            self.live_execution,
            escape_json(&self.title),
            escape_json(&self.operator_action),
            self.transition_preview.to_json(),
            escape_json(&self.decision_kind),
            escape_json(&self.transition_action),
            self.human_approval_required,
            self.exact_approval_required,
            self.queue_consumption_allowed,
            self.source_mutation_allowed,
            self.state_mutation_allowed,
            escape_json(&self.next_action),
            escape_json(&self.reason)
        )
    }
}

impl TransitionApplyApproval {
    /// Parses stable top-level fields from a transition apply approval artifact.
    pub fn from_json(json: &str) -> Option<Self> {
        if !json.contains("\"approval_kind\":\"transition_apply_approval\"") {
            return None;
        }
        Some(Self {
            approval_id: extract_string(json, "approval_id")?,
            source_gate_id: extract_string(json, "source_gate_id")?,
            approval_type: extract_string(json, "approval_type")?,
            approval_text: extract_string(json, "approval_text")?,
            status: extract_string(json, "status")?,
            dry_run: extract_bool(json, "dry_run")?,
            live_execution: extract_bool(json, "live_execution")?,
            queue_consumption_allowed: extract_bool(json, "queue_consumption_allowed")?,
            source_mutation_allowed: extract_bool(json, "source_mutation_allowed")?,
            state_mutation_allowed: extract_bool(json, "state_mutation_allowed")?,
            operator_notes: extract_string(json, "operator_notes")?,
            next_action: extract_last_string(json, "next_action")?,
        })
    }

    /// Serializes the transition apply approval to compact JSON.
    pub fn to_json(&self) -> String {
        format!(
            "{{\"approval_id\":\"{}\",\"approval_kind\":\"transition_apply_approval\",\"source_gate_id\":\"{}\",\"approval_type\":\"{}\",\"approval_text\":\"{}\",\"status\":\"{}\",\"dry_run\":{},\"live_execution\":{},\"queue_consumption_allowed\":{},\"source_mutation_allowed\":{},\"state_mutation_allowed\":{},\"operator_notes\":\"{}\",\"next_action\":\"{}\"}}",
            escape_json(&self.approval_id),
            escape_json(&self.source_gate_id),
            escape_json(&self.approval_type),
            escape_json(&self.approval_text),
            escape_json(&self.status),
            self.dry_run,
            self.live_execution,
            self.queue_consumption_allowed,
            self.source_mutation_allowed,
            self.state_mutation_allowed,
            escape_json(&self.operator_notes),
            escape_json(&self.next_action)
        )
    }
}

impl TransitionApplyApprovalReadReport {
    /// Serializes the transition apply approval read report to compact JSON.
    pub fn to_json(&self) -> String {
        let approval = self
            .approval
            .as_ref()
            .map_or_else(|| "null".to_string(), TransitionApplyApproval::to_json);
        format!(
            "{{\"approval\":{},\"missing\":{},\"invalid\":{}}}",
            approval, self.missing, self.invalid
        )
    }
}

impl TransitionApplyApprovalIntakeStatus {
    /// Serializes the transition apply approval intake status to compact JSON.
    pub fn to_json(&self) -> String {
        let approval = self
            .approval
            .as_ref()
            .map_or_else(|| "null".to_string(), TransitionApplyApproval::to_json);
        format!(
            "{{\"status_id\":\"{}\",\"status\":\"{}\",\"dry_run\":{},\"live_execution\":{},\"approval_present\":{},\"approval_type\":\"{}\",\"expected_gate_id\":\"{}\",\"expected_approval_text\":\"{}\",\"approval\":{},\"queue_consumption_allowed\":{},\"source_mutation_allowed\":{},\"state_mutation_allowed\":{},\"next_action\":\"{}\",\"reason\":\"{}\"}}",
            escape_json(&self.status_id),
            escape_json(&self.status),
            self.dry_run,
            self.live_execution,
            self.approval_present,
            escape_json(&self.approval_type),
            escape_json(&self.expected_gate_id),
            escape_json(&self.expected_approval_text),
            approval,
            self.queue_consumption_allowed,
            self.source_mutation_allowed,
            self.state_mutation_allowed,
            escape_json(&self.next_action),
            escape_json(&self.reason)
        )
    }
}

impl TransitionApplyExecutionPlan {
    /// Serializes the transition apply execution plan to compact JSON.
    pub fn to_json(&self) -> String {
        format!(
            "{{\"plan_id\":\"{}\",\"plan_kind\":\"transition_apply_execution_plan\",\"status\":\"{}\",\"dry_run\":{},\"live_execution\":{},\"approval_status\":{},\"approval_type\":\"{}\",\"planned_transition\":\"{}\",\"plan_only\":{},\"apply_requires_next_gate\":{},\"queue_consumption_allowed\":{},\"source_mutation_allowed\":{},\"state_mutation_allowed\":{},\"next_action\":\"{}\",\"reason\":\"{}\"}}",
            escape_json(&self.plan_id),
            escape_json(&self.status),
            self.dry_run,
            self.live_execution,
            self.approval_status.to_json(),
            escape_json(&self.approval_type),
            escape_json(&self.planned_transition),
            self.plan_only,
            self.apply_requires_next_gate,
            self.queue_consumption_allowed,
            self.source_mutation_allowed,
            self.state_mutation_allowed,
            escape_json(&self.next_action),
            escape_json(&self.reason)
        )
    }
}

impl TransitionApplyExecutionGatePreview {
    /// Serializes the transition apply execution gate preview to compact JSON.
    pub fn to_json(&self) -> String {
        format!(
            "{{\"gate_id\":\"{}\",\"gate_kind\":\"transition_apply_execution_gate_preview\",\"status\":\"{}\",\"dry_run\":{},\"live_execution\":{},\"title\":\"{}\",\"operator_action\":\"{}\",\"execution_plan\":{},\"approval_type\":\"{}\",\"planned_transition\":\"{}\",\"human_execution_approval_required\":{},\"exact_execution_approval_required\":{},\"queue_consumption_allowed\":{},\"source_mutation_allowed\":{},\"state_mutation_allowed\":{},\"next_action\":\"{}\",\"reason\":\"{}\"}}",
            escape_json(&self.gate_id),
            escape_json(&self.status),
            self.dry_run,
            self.live_execution,
            escape_json(&self.title),
            escape_json(&self.operator_action),
            self.execution_plan.to_json(),
            escape_json(&self.approval_type),
            escape_json(&self.planned_transition),
            self.human_execution_approval_required,
            self.exact_execution_approval_required,
            self.queue_consumption_allowed,
            self.source_mutation_allowed,
            self.state_mutation_allowed,
            escape_json(&self.next_action),
            escape_json(&self.reason)
        )
    }
}

impl TransitionApplyExecutionApproval {
    /// Parses stable top-level fields from a transition apply execution approval artifact.
    pub fn from_json(json: &str) -> Option<Self> {
        if !json.contains("\"approval_kind\":\"transition_apply_execution_approval\"") {
            return None;
        }
        Some(Self {
            approval_id: extract_string(json, "approval_id")?,
            source_gate_id: extract_string(json, "source_gate_id")?,
            approval_type: extract_string(json, "approval_type")?,
            approval_text: extract_string(json, "approval_text")?,
            status: extract_string(json, "status")?,
            dry_run: extract_bool(json, "dry_run")?,
            live_execution: extract_bool(json, "live_execution")?,
            queue_consumption_allowed: extract_bool(json, "queue_consumption_allowed")?,
            source_mutation_allowed: extract_bool(json, "source_mutation_allowed")?,
            state_mutation_allowed: extract_bool(json, "state_mutation_allowed")?,
            operator_notes: extract_string(json, "operator_notes")?,
            next_action: extract_last_string(json, "next_action")?,
        })
    }

    /// Serializes the transition apply execution approval to compact JSON.
    pub fn to_json(&self) -> String {
        format!(
            "{{\"approval_id\":\"{}\",\"approval_kind\":\"transition_apply_execution_approval\",\"source_gate_id\":\"{}\",\"approval_type\":\"{}\",\"approval_text\":\"{}\",\"status\":\"{}\",\"dry_run\":{},\"live_execution\":{},\"queue_consumption_allowed\":{},\"source_mutation_allowed\":{},\"state_mutation_allowed\":{},\"operator_notes\":\"{}\",\"next_action\":\"{}\"}}",
            escape_json(&self.approval_id),
            escape_json(&self.source_gate_id),
            escape_json(&self.approval_type),
            escape_json(&self.approval_text),
            escape_json(&self.status),
            self.dry_run,
            self.live_execution,
            self.queue_consumption_allowed,
            self.source_mutation_allowed,
            self.state_mutation_allowed,
            escape_json(&self.operator_notes),
            escape_json(&self.next_action)
        )
    }
}

impl TransitionApplyExecutionApprovalReadReport {
    /// Serializes the transition apply execution approval read report to compact JSON.
    pub fn to_json(&self) -> String {
        let approval = self.approval.as_ref().map_or_else(
            || "null".to_string(),
            TransitionApplyExecutionApproval::to_json,
        );
        format!(
            "{{\"approval\":{},\"missing\":{},\"invalid\":{}}}",
            approval, self.missing, self.invalid
        )
    }
}

impl TransitionApplyExecutionApprovalIntakeStatus {
    /// Serializes the transition apply execution approval intake status to compact JSON.
    pub fn to_json(&self) -> String {
        let approval = self.approval.as_ref().map_or_else(
            || "null".to_string(),
            TransitionApplyExecutionApproval::to_json,
        );
        format!(
            "{{\"status_id\":\"{}\",\"status\":\"{}\",\"dry_run\":{},\"live_execution\":{},\"approval_present\":{},\"approval_type\":\"{}\",\"expected_gate_id\":\"{}\",\"expected_approval_text\":\"{}\",\"approval\":{},\"queue_consumption_allowed\":{},\"source_mutation_allowed\":{},\"state_mutation_allowed\":{},\"next_action\":\"{}\",\"reason\":\"{}\"}}",
            escape_json(&self.status_id),
            escape_json(&self.status),
            self.dry_run,
            self.live_execution,
            self.approval_present,
            escape_json(&self.approval_type),
            escape_json(&self.expected_gate_id),
            escape_json(&self.expected_approval_text),
            approval,
            self.queue_consumption_allowed,
            self.source_mutation_allowed,
            self.state_mutation_allowed,
            escape_json(&self.next_action),
            escape_json(&self.reason)
        )
    }
}

impl TransitionApplyExecutionPacketNoMutation {
    /// Serializes the transition apply execution packet to compact JSON.
    pub fn to_json(&self) -> String {
        format!(
            "{{\"packet_id\":\"{}\",\"packet_kind\":\"transition_apply_execution_packet_no_mutation\",\"status\":\"{}\",\"dry_run\":{},\"live_execution\":{},\"approval_status\":{},\"approval_type\":\"{}\",\"transition_action\":\"{}\",\"packet_only\":{},\"mutation_requires_next_gate\":{},\"queue_consumption_allowed\":{},\"source_mutation_allowed\":{},\"state_mutation_allowed\":{},\"next_action\":\"{}\",\"reason\":\"{}\"}}",
            escape_json(&self.packet_id),
            escape_json(&self.status),
            self.dry_run,
            self.live_execution,
            self.approval_status.to_json(),
            escape_json(&self.approval_type),
            escape_json(&self.transition_action),
            self.packet_only,
            self.mutation_requires_next_gate,
            self.queue_consumption_allowed,
            self.source_mutation_allowed,
            self.state_mutation_allowed,
            escape_json(&self.next_action),
            escape_json(&self.reason)
        )
    }
}

impl ReviewHandoffBundleManifest {
    /// Serializes the handoff bundle manifest to compact JSON.
    pub fn to_json(&self) -> String {
        let selected_packet = self
            .selected_packet
            .as_ref()
            .map_or_else(|| "null".to_string(), PersistedReviewPacketSummary::to_json);
        format!(
            "{{\"manifest_id\":\"{}\",\"manifest_kind\":\"review_handoff_bundle_manifest\",\"status\":\"{}\",\"dry_run\":{},\"live_execution\":{},\"review_only\":{},\"selected_packet\":{},\"consume_preview\":{},\"handoff_status\":{},\"next_action\":\"{}\",\"reason\":\"{}\"}}",
            escape_json(&self.manifest_id),
            escape_json(&self.status),
            self.dry_run,
            self.live_execution,
            self.review_only,
            selected_packet,
            self.consume_preview.to_json(),
            self.handoff_status.to_json(),
            escape_json(&self.next_action),
            escape_json(&self.reason)
        )
    }
}

impl ReviewWorkerHandoffEnvelope {
    /// Serializes the handoff envelope to compact JSON.
    pub fn to_json(&self) -> String {
        let selected_packet = self
            .selected_packet
            .as_ref()
            .map_or_else(|| "null".to_string(), PersistedReviewPacketSummary::to_json);
        format!(
            "{{\"envelope_id\":\"{}\",\"status\":\"{}\",\"dry_run\":{},\"live_execution\":{},\"handoff_target\":\"{}\",\"selected_packet\":{},\"consume_preview\":{},\"next_action\":\"{}\",\"reason\":\"{}\"}}",
            escape_json(&self.envelope_id),
            escape_json(&self.status),
            self.dry_run,
            self.live_execution,
            escape_json(&self.handoff_target),
            selected_packet,
            self.consume_preview.to_json(),
            escape_json(&self.next_action),
            escape_json(&self.reason)
        )
    }
}

impl ReviewPacketConsumePreview {
    /// Serializes the consume preview to compact JSON.
    pub fn to_json(&self) -> String {
        let selected_packet = self
            .selected_packet
            .as_ref()
            .map_or_else(|| "null".to_string(), PersistedReviewPacketSummary::to_json);
        format!(
            "{{\"preview_id\":\"{}\",\"status\":\"{}\",\"dry_run\":{},\"live_execution\":{},\"selected_packet\":{},\"outbox_status\":{},\"next_action\":\"{}\",\"reason\":\"{}\"}}",
            escape_json(&self.preview_id),
            escape_json(&self.status),
            self.dry_run,
            self.live_execution,
            selected_packet,
            self.outbox_status.to_json(),
            escape_json(&self.next_action),
            escape_json(&self.reason)
        )
    }
}

impl ReviewOutboxStatus {
    /// Serializes the review outbox status to compact JSON.
    pub fn to_json(&self) -> String {
        let latest_packet = self
            .latest_packet
            .as_ref()
            .map_or_else(|| "null".to_string(), PersistedReviewPacketSummary::to_json);
        format!(
            "{{\"status_id\":\"{}\",\"status\":\"{}\",\"dry_run\":{},\"live_execution\":{},\"packet_count\":{},\"ready_count\":{},\"blocked_count\":{},\"invalid_lines\":{},\"skipped_empty_lines\":{},\"latest_packet\":{},\"next_action\":\"{}\",\"reason\":\"{}\"}}",
            escape_json(&self.status_id),
            escape_json(&self.status),
            self.dry_run,
            self.live_execution,
            self.packet_count,
            self.ready_count,
            self.blocked_count,
            self.invalid_lines,
            self.skipped_empty_lines,
            latest_packet,
            escape_json(&self.next_action),
            escape_json(&self.reason)
        )
    }
}

/// Read result for persisted review packet JSONL scans.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReviewPacketReadReport {
    /// Valid review packet summaries parsed from storage.
    pub packets: Vec<PersistedReviewPacketSummary>,
    /// Number of non-empty malformed lines.
    pub invalid_lines: usize,
    /// Number of empty or whitespace-only lines skipped.
    pub skipped_empty_lines: usize,
}

impl ReviewPacketReadReport {
    /// Serializes the read report to compact JSON.
    pub fn to_json(&self) -> String {
        let packets = self
            .packets
            .iter()
            .map(PersistedReviewPacketSummary::to_json)
            .collect::<Vec<_>>()
            .join(",");
        format!(
            "{{\"packets\":[{}],\"invalid_lines\":{},\"skipped_empty_lines\":{}}}",
            packets, self.invalid_lines, self.skipped_empty_lines
        )
    }
}

/// Evaluates an advisory review outbox status without consuming packets.
pub fn evaluate_review_outbox_status(
    status_id: impl Into<String>,
    report: &ReviewPacketReadReport,
) -> ReviewOutboxStatus {
    let live_execution = report.packets.iter().any(|packet| packet.live_execution);
    let ready_count = report
        .packets
        .iter()
        .filter(|packet| {
            packet.status == "ready_for_opencode_review" && packet.dry_run && !packet.live_execution
        })
        .count();
    let packet_count = report.packets.len();
    let blocked_count = packet_count.saturating_sub(ready_count);
    let latest_packet = report.packets.last().cloned();
    let (status, reason, next_action) = review_outbox_decision(
        packet_count,
        ready_count,
        report.invalid_lines,
        live_execution,
    );

    ReviewOutboxStatus {
        status_id: status_id.into(),
        status: status.to_string(),
        dry_run: true,
        live_execution,
        packet_count,
        ready_count,
        blocked_count,
        invalid_lines: report.invalid_lines,
        skipped_empty_lines: report.skipped_empty_lines,
        latest_packet,
        next_action: next_action.to_string(),
        reason: reason.to_string(),
    }
}

/// Previews which review packet would be consumed without mutating the store.
pub fn preview_review_packet_consume(
    preview_id: impl Into<String>,
    outbox_status_id: impl Into<String>,
    report: &ReviewPacketReadReport,
) -> ReviewPacketConsumePreview {
    let outbox_status = evaluate_review_outbox_status(outbox_status_id, report);
    let selected_packet = if outbox_status.status == "ready_review_packet_available" {
        report
            .packets
            .iter()
            .find(|packet| {
                packet.status == "ready_for_opencode_review"
                    && packet.dry_run
                    && !packet.live_execution
            })
            .cloned()
    } else {
        None
    };
    let (status, reason, next_action) =
        review_consume_preview_decision(&outbox_status.status, selected_packet.is_some());

    ReviewPacketConsumePreview {
        preview_id: preview_id.into(),
        status: status.to_string(),
        dry_run: true,
        live_execution: outbox_status.live_execution,
        selected_packet,
        outbox_status,
        next_action: next_action.to_string(),
        reason: reason.to_string(),
    }
}

/// Creates a local handoff envelope from a dry-run consume preview.
pub fn create_review_worker_handoff_envelope(
    envelope_id: impl Into<String>,
    handoff_target: impl Into<String>,
    consume_preview: &ReviewPacketConsumePreview,
) -> ReviewWorkerHandoffEnvelope {
    let selected_packet = consume_preview.selected_packet.clone();
    let (status, reason, next_action) = review_worker_handoff_decision(
        &consume_preview.status,
        selected_packet.is_some(),
        consume_preview.live_execution,
    );

    ReviewWorkerHandoffEnvelope {
        envelope_id: envelope_id.into(),
        status: status.to_string(),
        dry_run: true,
        live_execution: consume_preview.live_execution,
        handoff_target: handoff_target.into(),
        selected_packet,
        consume_preview: consume_preview.clone(),
        next_action: next_action.to_string(),
        reason: reason.to_string(),
    }
}

/// Evaluates whether a local handoff envelope is ready for manual review.
pub fn evaluate_review_worker_handoff_status(
    status_id: impl Into<String>,
    report: &ReviewWorkerHandoffReadReport,
) -> ReviewWorkerHandoffStatus {
    let envelope_present = report.envelope.is_some();
    let live_execution = report
        .envelope
        .as_ref()
        .map(|envelope| envelope.live_execution)
        .unwrap_or(false);
    let review_only = report
        .envelope
        .as_ref()
        .map(|envelope| {
            envelope.status == "ready_for_manual_opencode_review"
                && envelope.dry_run
                && !envelope.live_execution
                && envelope.handoff_target == "opencode_review_only"
        })
        .unwrap_or(false);
    let (status, reason, next_action) = review_worker_handoff_status_decision(
        report.missing,
        report.invalid,
        review_only,
        live_execution,
    );

    ReviewWorkerHandoffStatus {
        status_id: status_id.into(),
        status: status.to_string(),
        dry_run: true,
        live_execution,
        envelope_present,
        review_only,
        envelope: report.envelope.clone(),
        next_action: next_action.to_string(),
        reason: reason.to_string(),
    }
}

/// Creates a local handoff bundle manifest without invoking a reviewer.
pub fn create_review_handoff_bundle_manifest(
    manifest_id: impl Into<String>,
    consume_preview: &ReviewPacketConsumePreview,
    handoff_status: &ReviewWorkerHandoffStatus,
) -> ReviewHandoffBundleManifest {
    let selected_packet = consume_preview.selected_packet.clone();
    let live_execution = consume_preview.live_execution || handoff_status.live_execution;
    let review_only = handoff_status.review_only
        && handoff_status.envelope_present
        && handoff_status.status == "ready_for_manual_opencode_review";
    let (status, reason, next_action) = review_handoff_bundle_manifest_decision(
        &consume_preview.status,
        selected_packet.is_some(),
        &handoff_status.status,
        review_only,
        live_execution,
    );

    ReviewHandoffBundleManifest {
        manifest_id: manifest_id.into(),
        status: status.to_string(),
        dry_run: true,
        live_execution,
        review_only,
        selected_packet,
        consume_preview: consume_preview.clone(),
        handoff_status: handoff_status.clone(),
        next_action: next_action.to_string(),
        reason: reason.to_string(),
    }
}

/// Evaluates whether a local handoff bundle manifest is ready for an operator card.
pub fn evaluate_review_handoff_bundle_manifest_status(
    status_id: impl Into<String>,
    report: &ReviewHandoffBundleManifestReadReport,
) -> ReviewHandoffBundleManifestStatus {
    let manifest_present = report.manifest.is_some();
    let live_execution = report
        .manifest
        .as_ref()
        .map(|manifest| manifest.live_execution)
        .unwrap_or(false);
    let review_only = report
        .manifest
        .as_ref()
        .map(|manifest| {
            manifest.status == "ready_for_manual_review_handoff_manifest"
                && manifest.dry_run
                && !manifest.live_execution
                && manifest.review_only
                && manifest.selected_packet_id.is_some()
        })
        .unwrap_or(false);
    let (status, reason, next_action) = review_handoff_bundle_manifest_status_decision(
        report.missing,
        report.invalid,
        review_only,
        live_execution,
    );

    ReviewHandoffBundleManifestStatus {
        status_id: status_id.into(),
        status: status.to_string(),
        dry_run: true,
        live_execution,
        manifest_present,
        review_only,
        manifest: report.manifest.clone(),
        next_action: next_action.to_string(),
        reason: reason.to_string(),
    }
}

/// Creates an operator-facing manual review card without invoking OpenCode.
pub fn create_review_handoff_operator_card(
    card_id: impl Into<String>,
    manifest_status: &ReviewHandoffBundleManifestStatus,
) -> ReviewHandoffOperatorCard {
    let (status, reason, next_action, operator_action) =
        review_handoff_operator_card_decision(manifest_status);

    ReviewHandoffOperatorCard {
        card_id: card_id.into(),
        status: status.to_string(),
        dry_run: true,
        live_execution: manifest_status.live_execution,
        title: "Manual OpenCode review-only handoff".to_string(),
        operator_action: operator_action.to_string(),
        manifest_status: manifest_status.clone(),
        next_action: next_action.to_string(),
        reason: reason.to_string(),
    }
}

/// Evaluates a manually returned review candidate against the expected operator card.
pub fn evaluate_review_candidate_intake_status(
    status_id: impl Into<String>,
    operator_card: &ReviewHandoffOperatorCard,
    report: &ReviewCandidateReadReport,
) -> ReviewCandidateIntakeStatus {
    let candidate_present = report.candidate.is_some();
    let candidate_live_execution = report
        .candidate
        .as_ref()
        .map(|candidate| candidate.live_execution)
        .unwrap_or(false);
    let live_execution = operator_card.live_execution || candidate_live_execution;
    let review_only = report
        .candidate
        .as_ref()
        .map(|candidate| candidate.review_only && candidate.dry_run && !candidate.live_execution)
        .unwrap_or(false);
    let (status, reason, next_action) =
        review_candidate_intake_decision(operator_card, report, review_only, live_execution);

    ReviewCandidateIntakeStatus {
        status_id: status_id.into(),
        status: status.to_string(),
        dry_run: true,
        live_execution,
        candidate_present,
        review_only,
        expected_card_id: operator_card.card_id.clone(),
        candidate: report.candidate.clone(),
        next_action: next_action.to_string(),
        reason: reason.to_string(),
    }
}

/// Previews review-result transition readiness without consuming or mutating.
pub fn preview_review_result_transition(
    preview_id: impl Into<String>,
    candidate_status: &ReviewCandidateIntakeStatus,
) -> ReviewResultTransitionPreview {
    let (status, reason, next_action, transition_allowed) =
        review_result_transition_preview_decision(candidate_status);

    ReviewResultTransitionPreview {
        preview_id: preview_id.into(),
        status: status.to_string(),
        dry_run: true,
        live_execution: candidate_status.live_execution,
        candidate_status: candidate_status.clone(),
        transition_allowed,
        queue_consumption_allowed: false,
        source_mutation_allowed: false,
        next_action: next_action.to_string(),
        reason: reason.to_string(),
    }
}

/// Creates a human decision gate from a review result transition preview.
pub fn create_review_result_transition_gate(
    gate_id: impl Into<String>,
    transition_preview: &ReviewResultTransitionPreview,
) -> ReviewResultTransitionGate {
    let (status, reason, next_action, operator_action) =
        review_result_transition_gate_decision(transition_preview);

    ReviewResultTransitionGate {
        gate_id: gate_id.into(),
        status: status.to_string(),
        dry_run: true,
        live_execution: transition_preview.live_execution,
        title: "Manual review result transition gate".to_string(),
        operator_action: operator_action.to_string(),
        transition_preview: transition_preview.clone(),
        human_decision_required: true,
        queue_consumption_allowed: false,
        source_mutation_allowed: false,
        next_action: next_action.to_string(),
        reason: reason.to_string(),
    }
}

/// Evaluates whether a local result transition gate is ready for human decision.
pub fn evaluate_review_result_transition_gate_status(
    status_id: impl Into<String>,
    report: &ReviewResultTransitionGateReadReport,
) -> ReviewResultTransitionGateStatus {
    let gate_present = report.gate.is_some();
    let live_execution = report
        .gate
        .as_ref()
        .map(|gate| gate.live_execution)
        .unwrap_or(false);
    let human_decision_required = report
        .gate
        .as_ref()
        .map(|gate| gate.human_decision_required)
        .unwrap_or(false);
    let queue_consumption_allowed = report
        .gate
        .as_ref()
        .map(|gate| gate.queue_consumption_allowed)
        .unwrap_or(false);
    let source_mutation_allowed = report
        .gate
        .as_ref()
        .map(|gate| gate.source_mutation_allowed)
        .unwrap_or(false);
    let (status, reason, next_action) = review_result_transition_gate_status_decision(
        report.missing,
        report.invalid,
        report.gate.as_ref(),
    );

    ReviewResultTransitionGateStatus {
        status_id: status_id.into(),
        status: status.to_string(),
        dry_run: true,
        live_execution,
        gate_present,
        human_decision_required,
        queue_consumption_allowed,
        source_mutation_allowed,
        gate: report.gate.clone(),
        next_action: next_action.to_string(),
        reason: reason.to_string(),
    }
}

/// Evaluates a human transition decision without executing the transition.
pub fn evaluate_human_transition_decision_intake_status(
    status_id: impl Into<String>,
    gate_status: &ReviewResultTransitionGateStatus,
    report: &HumanTransitionDecisionReadReport,
) -> HumanTransitionDecisionIntakeStatus {
    let decision_present = report.decision.is_some();
    let decision_live_execution = report
        .decision
        .as_ref()
        .map(|decision| decision.live_execution)
        .unwrap_or(false);
    let live_execution = gate_status.live_execution || decision_live_execution;
    let decision_kind = report
        .decision
        .as_ref()
        .map(|decision| decision.decision_kind.clone())
        .unwrap_or_else(|| "none".to_string());
    let expected_gate_id = gate_status
        .gate
        .as_ref()
        .map(|gate| gate.gate_id.clone())
        .unwrap_or_else(|| "none".to_string());
    let queue_consumption_allowed = report
        .decision
        .as_ref()
        .map(|decision| decision.queue_consumption_allowed)
        .unwrap_or(false);
    let source_mutation_allowed = report
        .decision
        .as_ref()
        .map(|decision| decision.source_mutation_allowed)
        .unwrap_or(false);
    let (status, reason, next_action) = human_transition_decision_intake_decision(
        gate_status,
        report,
        &expected_gate_id,
        live_execution,
    );

    HumanTransitionDecisionIntakeStatus {
        status_id: status_id.into(),
        status: status.to_string(),
        dry_run: true,
        live_execution,
        decision_present,
        decision_kind,
        expected_gate_id,
        decision: report.decision.clone(),
        queue_consumption_allowed,
        source_mutation_allowed,
        next_action: next_action.to_string(),
        reason: reason.to_string(),
    }
}

/// Previews transition execution without consuming queues or mutating state.
pub fn preview_transition_execution_no_mutation(
    preview_id: impl Into<String>,
    decision_status: &HumanTransitionDecisionIntakeStatus,
) -> TransitionExecutionPreview {
    let (status, reason, next_action, transition_action) =
        transition_execution_preview_decision(decision_status);

    TransitionExecutionPreview {
        preview_id: preview_id.into(),
        status: status.to_string(),
        dry_run: true,
        live_execution: decision_status.live_execution,
        decision_status: decision_status.clone(),
        decision_kind: decision_status.decision_kind.clone(),
        transition_action: transition_action.to_string(),
        queue_consumption_allowed: false,
        source_mutation_allowed: false,
        state_mutation_allowed: false,
        next_action: next_action.to_string(),
        reason: reason.to_string(),
    }
}

/// Creates an operator-facing apply gate preview without applying transitions.
pub fn create_transition_apply_gate_preview(
    gate_id: impl Into<String>,
    transition_preview: &TransitionExecutionPreview,
) -> TransitionApplyGatePreview {
    let (status, reason, next_action, operator_action, exact_approval_required) =
        transition_apply_gate_preview_decision(transition_preview);

    TransitionApplyGatePreview {
        gate_id: gate_id.into(),
        status: status.to_string(),
        dry_run: true,
        live_execution: transition_preview.live_execution,
        title: "Manual transition apply gate preview".to_string(),
        operator_action: operator_action.to_string(),
        transition_preview: transition_preview.clone(),
        decision_kind: transition_preview.decision_kind.clone(),
        transition_action: transition_preview.transition_action.clone(),
        human_approval_required: true,
        exact_approval_required,
        queue_consumption_allowed: false,
        source_mutation_allowed: false,
        state_mutation_allowed: false,
        next_action: next_action.to_string(),
        reason: reason.to_string(),
    }
}

/// Evaluates an exact transition apply approval without applying mutation.
pub fn evaluate_transition_apply_approval_intake_status(
    status_id: impl Into<String>,
    apply_gate: &TransitionApplyGatePreview,
    report: &TransitionApplyApprovalReadReport,
) -> TransitionApplyApprovalIntakeStatus {
    let approval_present = report.approval.is_some();
    let approval_live_execution = report
        .approval
        .as_ref()
        .map(|approval| approval.live_execution)
        .unwrap_or(false);
    let live_execution = apply_gate.live_execution || approval_live_execution;
    let approval_type = report
        .approval
        .as_ref()
        .map(|approval| approval.approval_type.clone())
        .unwrap_or_else(|| "none".to_string());
    let expected_gate_id = apply_gate.gate_id.clone();
    let expected_approval_type = expected_transition_apply_approval_type(apply_gate);
    let expected_approval_text = expected_transition_apply_approval_text(apply_gate);
    let queue_consumption_allowed = report
        .approval
        .as_ref()
        .map(|approval| approval.queue_consumption_allowed)
        .unwrap_or(false);
    let source_mutation_allowed = report
        .approval
        .as_ref()
        .map(|approval| approval.source_mutation_allowed)
        .unwrap_or(false);
    let state_mutation_allowed = report
        .approval
        .as_ref()
        .map(|approval| approval.state_mutation_allowed)
        .unwrap_or(false);
    let (status, reason, next_action) = transition_apply_approval_intake_decision(
        apply_gate,
        report,
        &expected_gate_id,
        &expected_approval_type,
        &expected_approval_text,
        live_execution,
    );

    TransitionApplyApprovalIntakeStatus {
        status_id: status_id.into(),
        status: status.to_string(),
        dry_run: true,
        live_execution,
        approval_present,
        approval_type,
        expected_gate_id,
        expected_approval_text,
        approval: report.approval.clone(),
        queue_consumption_allowed,
        source_mutation_allowed,
        state_mutation_allowed,
        next_action: next_action.to_string(),
        reason: reason.to_string(),
    }
}

/// Plans transition apply execution without consuming queues or mutating state.
pub fn plan_transition_apply_execution_no_mutation(
    plan_id: impl Into<String>,
    approval_status: &TransitionApplyApprovalIntakeStatus,
) -> TransitionApplyExecutionPlan {
    let (status, reason, next_action, planned_transition, apply_requires_next_gate) =
        transition_apply_execution_plan_decision(approval_status);

    TransitionApplyExecutionPlan {
        plan_id: plan_id.into(),
        status: status.to_string(),
        dry_run: true,
        live_execution: approval_status.live_execution,
        approval_status: approval_status.clone(),
        approval_type: approval_status.approval_type.clone(),
        planned_transition: planned_transition.to_string(),
        plan_only: true,
        apply_requires_next_gate,
        queue_consumption_allowed: false,
        source_mutation_allowed: false,
        state_mutation_allowed: false,
        next_action: next_action.to_string(),
        reason: reason.to_string(),
    }
}

/// Creates an operator-facing execution gate preview without applying transitions.
pub fn create_transition_apply_execution_gate_preview(
    gate_id: impl Into<String>,
    execution_plan: &TransitionApplyExecutionPlan,
) -> TransitionApplyExecutionGatePreview {
    let (status, reason, next_action, operator_action, exact_execution_approval_required) =
        transition_apply_execution_gate_preview_decision(execution_plan);

    TransitionApplyExecutionGatePreview {
        gate_id: gate_id.into(),
        status: status.to_string(),
        dry_run: true,
        live_execution: execution_plan.live_execution,
        title: "Manual transition apply execution gate preview".to_string(),
        operator_action: operator_action.to_string(),
        execution_plan: execution_plan.clone(),
        approval_type: execution_plan.approval_type.clone(),
        planned_transition: execution_plan.planned_transition.clone(),
        human_execution_approval_required: true,
        exact_execution_approval_required,
        queue_consumption_allowed: false,
        source_mutation_allowed: false,
        state_mutation_allowed: false,
        next_action: next_action.to_string(),
        reason: reason.to_string(),
    }
}

/// Evaluates an exact transition apply execution approval without applying mutation.
pub fn evaluate_transition_apply_execution_approval_intake_status(
    status_id: impl Into<String>,
    execution_gate: &TransitionApplyExecutionGatePreview,
    report: &TransitionApplyExecutionApprovalReadReport,
) -> TransitionApplyExecutionApprovalIntakeStatus {
    let approval_present = report.approval.is_some();
    let approval_live_execution = report
        .approval
        .as_ref()
        .map(|approval| approval.live_execution)
        .unwrap_or(false);
    let live_execution = execution_gate.live_execution || approval_live_execution;
    let approval_type = report
        .approval
        .as_ref()
        .map(|approval| approval.approval_type.clone())
        .unwrap_or_else(|| "none".to_string());
    let expected_gate_id = execution_gate.gate_id.clone();
    let expected_approval_type = expected_transition_apply_execution_approval_type(execution_gate);
    let expected_approval_text = expected_transition_apply_execution_approval_text(execution_gate);
    let queue_consumption_allowed = report
        .approval
        .as_ref()
        .map(|approval| approval.queue_consumption_allowed)
        .unwrap_or(false);
    let source_mutation_allowed = report
        .approval
        .as_ref()
        .map(|approval| approval.source_mutation_allowed)
        .unwrap_or(false);
    let state_mutation_allowed = report
        .approval
        .as_ref()
        .map(|approval| approval.state_mutation_allowed)
        .unwrap_or(false);
    let (status, reason, next_action) = transition_apply_execution_approval_intake_decision(
        execution_gate,
        report,
        &expected_gate_id,
        &expected_approval_type,
        &expected_approval_text,
        live_execution,
    );

    TransitionApplyExecutionApprovalIntakeStatus {
        status_id: status_id.into(),
        status: status.to_string(),
        dry_run: true,
        live_execution,
        approval_present,
        approval_type,
        expected_gate_id,
        expected_approval_text,
        approval: report.approval.clone(),
        queue_consumption_allowed,
        source_mutation_allowed,
        state_mutation_allowed,
        next_action: next_action.to_string(),
        reason: reason.to_string(),
    }
}

/// Prepares a transition apply execution packet without consuming queues or mutating state.
pub fn prepare_transition_apply_execution_packet_no_mutation(
    packet_id: impl Into<String>,
    approval_status: &TransitionApplyExecutionApprovalIntakeStatus,
) -> TransitionApplyExecutionPacketNoMutation {
    let (status, reason, next_action, transition_action, mutation_requires_next_gate) =
        transition_apply_execution_packet_decision(approval_status);

    TransitionApplyExecutionPacketNoMutation {
        packet_id: packet_id.into(),
        status: status.to_string(),
        dry_run: true,
        live_execution: approval_status.live_execution,
        approval_status: approval_status.clone(),
        approval_type: approval_status.approval_type.clone(),
        transition_action: transition_action.to_string(),
        packet_only: true,
        mutation_requires_next_gate,
        queue_consumption_allowed: false,
        source_mutation_allowed: false,
        state_mutation_allowed: false,
        next_action: next_action.to_string(),
        reason: reason.to_string(),
    }
}

fn transition_apply_execution_gate_preview_decision(
    execution_plan: &TransitionApplyExecutionPlan,
) -> (&'static str, &'static str, &'static str, &'static str, bool) {
    if execution_plan.live_execution {
        return (
            "blocked_live_execution_flag",
            "transition_apply_execution_plan_live_flag_present",
            "stop_before_transition_apply_execution_gate",
            "do_not_execute_transition",
            false,
        );
    }
    if execution_plan.queue_consumption_allowed
        || execution_plan.source_mutation_allowed
        || execution_plan.state_mutation_allowed
    {
        return (
            "blocked_transition_apply_plan_mutation_enabled",
            "transition_apply_execution_plan_mutation_enabled",
            "reject_transition_apply_execution_plan",
            "do_not_execute_transition",
            false,
        );
    }
    if !execution_plan.plan_only || !execution_plan.apply_requires_next_gate {
        return (
            "blocked_transition_apply_plan_not_ready",
            "transition_apply_execution_plan_gate_flags_not_ready",
            "prepare_transition_apply_execution_plan_no_mutation",
            "do_not_execute_transition",
            false,
        );
    }
    match execution_plan.status.as_str() {
        "ready_for_transition_apply_execution_plan" => (
            "ready_for_transition_apply_execution_gate_preview",
            "apply_execution_plan_ready_for_gate",
            "wait_for_exact_transition_apply_execution_approval",
            "request_exact_transition_apply_execution_approval",
            true,
        ),
        "ready_for_rejection_record_plan" => (
            "ready_for_rejection_record_execution_gate_preview",
            "rejection_record_plan_ready_for_gate",
            "wait_for_exact_rejection_record_execution_approval",
            "request_exact_rejection_record_execution_approval",
            true,
        ),
        "ready_for_hold_record_plan" => (
            "ready_for_hold_record_execution_gate_preview",
            "hold_record_plan_ready_for_gate",
            "wait_for_exact_hold_record_execution_approval",
            "request_exact_hold_record_execution_approval",
            true,
        ),
        _ => (
            "blocked_transition_apply_plan_not_ready",
            "transition_apply_execution_plan_status_not_ready",
            "wait_for_ready_transition_apply_execution_plan",
            "do_not_execute_transition",
            false,
        ),
    }
}

fn transition_apply_execution_packet_decision(
    approval_status: &TransitionApplyExecutionApprovalIntakeStatus,
) -> (&'static str, &'static str, &'static str, &'static str, bool) {
    if approval_status.live_execution {
        return (
            "blocked_live_execution_flag",
            "transition_apply_execution_approval_live_flag_present",
            "stop_before_transition_apply_execution_packet",
            "do_not_apply_transition",
            false,
        );
    }
    if approval_status.queue_consumption_allowed
        || approval_status.source_mutation_allowed
        || approval_status.state_mutation_allowed
    {
        return (
            "blocked_execution_approval_mutation_enabled",
            "transition_apply_execution_approval_mutation_enabled",
            "reject_transition_apply_execution_approval_intake",
            "do_not_apply_transition",
            false,
        );
    }
    match approval_status.status.as_str() {
        "ready_for_transition_apply_execution_approval_intake" => (
            "ready_for_transition_apply_execution_packet_no_mutation",
            "exact_apply_execution_approval_ready_for_packet",
            "request_transition_apply_mutation_gate",
            "packet_mark_review_result_accepted_and_unlock_next_packet",
            true,
        ),
        "ready_for_rejection_record_execution_approval_intake" => (
            "ready_for_rejection_record_execution_packet_no_mutation",
            "exact_rejection_record_execution_approval_ready_for_packet",
            "request_rejection_record_mutation_gate",
            "packet_record_review_result_rejected",
            true,
        ),
        "ready_for_hold_record_execution_approval_intake" => (
            "ready_for_hold_record_execution_packet_no_mutation",
            "exact_hold_record_execution_approval_ready_for_packet",
            "request_hold_record_mutation_gate",
            "packet_record_review_result_hold",
            true,
        ),
        _ => (
            "blocked_execution_approval_not_ready",
            "transition_apply_execution_approval_status_not_ready",
            "wait_for_ready_transition_apply_execution_approval_intake",
            "do_not_apply_transition",
            false,
        ),
    }
}

fn transition_apply_execution_approval_intake_decision(
    execution_gate: &TransitionApplyExecutionGatePreview,
    report: &TransitionApplyExecutionApprovalReadReport,
    expected_gate_id: &str,
    expected_approval_type: &str,
    expected_approval_text: &str,
    live_execution: bool,
) -> (&'static str, &'static str, &'static str) {
    if live_execution {
        return (
            "blocked_live_execution_flag",
            "transition_apply_execution_approval_live_flag_present",
            "stop_before_apply_execution_approval_intake",
        );
    }
    if !execution_gate.exact_execution_approval_required
        || !execution_gate.human_execution_approval_required
        || expected_approval_type == "none"
    {
        return (
            "blocked_execution_gate_not_ready",
            "transition_apply_execution_gate_not_ready_for_approval",
            "prepare_transition_apply_execution_gate_preview",
        );
    }
    if execution_gate.queue_consumption_allowed
        || execution_gate.source_mutation_allowed
        || execution_gate.state_mutation_allowed
    {
        return (
            "blocked_execution_gate_mutation_enabled",
            "transition_apply_execution_gate_mutation_enabled",
            "reject_transition_apply_execution_gate_preview",
        );
    }
    if report.invalid {
        return (
            "blocked_invalid_transition_apply_execution_approval",
            "transition_apply_execution_approval_parse_failed",
            "repair_transition_apply_execution_approval",
        );
    }
    if report.missing {
        return (
            "missing_transition_apply_execution_approval",
            "transition_apply_execution_approval_missing",
            "wait_for_exact_transition_apply_execution_approval",
        );
    }
    let Some(approval) = report.approval.as_ref() else {
        return (
            "missing_transition_apply_execution_approval",
            "transition_apply_execution_approval_missing",
            "wait_for_exact_transition_apply_execution_approval",
        );
    };
    if approval.source_gate_id != expected_gate_id {
        return (
            "blocked_execution_approval_gate_mismatch",
            "transition_apply_execution_approval_source_gate_mismatch",
            "verify_transition_apply_execution_approval_source",
        );
    }
    if approval.status != "transition_apply_execution_approval_ready" {
        return (
            "blocked_execution_approval_not_ready",
            "transition_apply_execution_approval_status_not_ready",
            "inspect_transition_apply_execution_approval_status",
        );
    }
    if !approval.dry_run {
        return (
            "blocked_execution_approval_not_dry_run",
            "transition_apply_execution_approval_not_dry_run",
            "reject_transition_apply_execution_approval",
        );
    }
    if approval.queue_consumption_allowed
        || approval.source_mutation_allowed
        || approval.state_mutation_allowed
    {
        return (
            "blocked_execution_approval_mutation_enabled",
            "transition_apply_execution_approval_allows_mutation",
            "reject_transition_apply_execution_approval",
        );
    }
    if approval.approval_type != expected_approval_type {
        return (
            "blocked_execution_approval_type_mismatch",
            "transition_apply_execution_approval_type_mismatch",
            "verify_transition_apply_execution_approval_type",
        );
    }
    if approval.approval_text != expected_approval_text {
        return (
            "blocked_execution_approval_text_mismatch",
            "transition_apply_execution_approval_text_not_exact",
            "request_exact_transition_apply_execution_approval_text",
        );
    }
    match approval.approval_type.as_str() {
        "apply" => (
            "ready_for_transition_apply_execution_approval_intake",
            "exact_transition_apply_execution_approval_ready",
            "prepare_transition_apply_execution_packet_no_mutation",
        ),
        "reject" => (
            "ready_for_rejection_record_execution_approval_intake",
            "exact_rejection_record_execution_approval_ready",
            "prepare_rejection_record_execution_packet_no_mutation",
        ),
        "hold" => (
            "ready_for_hold_record_execution_approval_intake",
            "exact_hold_record_execution_approval_ready",
            "prepare_hold_record_execution_packet_no_mutation",
        ),
        _ => (
            "blocked_unknown_transition_apply_execution_approval",
            "transition_apply_execution_approval_type_unknown",
            "inspect_transition_apply_execution_approval_type",
        ),
    }
}

fn expected_transition_apply_execution_approval_type(
    execution_gate: &TransitionApplyExecutionGatePreview,
) -> String {
    match execution_gate.status.as_str() {
        "ready_for_transition_apply_execution_gate_preview" => "apply".to_string(),
        "ready_for_rejection_record_execution_gate_preview" => "reject".to_string(),
        "ready_for_hold_record_execution_gate_preview" => "hold".to_string(),
        _ => "none".to_string(),
    }
}

fn expected_transition_apply_execution_approval_text(
    execution_gate: &TransitionApplyExecutionGatePreview,
) -> String {
    match expected_transition_apply_execution_approval_type(execution_gate).as_str() {
        "apply" => format!(
            "APPROVE_TRANSITION_APPLY_EXECUTION:{}",
            execution_gate.gate_id
        ),
        "reject" => format!(
            "APPROVE_TRANSITION_REJECTION_RECORD_EXECUTION:{}",
            execution_gate.gate_id
        ),
        "hold" => format!(
            "APPROVE_TRANSITION_HOLD_RECORD_EXECUTION:{}",
            execution_gate.gate_id
        ),
        _ => "NO_EXECUTION_APPROVAL_AVAILABLE".to_string(),
    }
}

fn transition_apply_execution_plan_decision(
    approval_status: &TransitionApplyApprovalIntakeStatus,
) -> (&'static str, &'static str, &'static str, &'static str, bool) {
    if approval_status.live_execution {
        return (
            "blocked_live_execution_flag",
            "transition_apply_approval_live_flag_present",
            "stop_before_transition_apply_execution_plan",
            "do_not_apply_transition",
            false,
        );
    }
    if approval_status.queue_consumption_allowed
        || approval_status.source_mutation_allowed
        || approval_status.state_mutation_allowed
    {
        return (
            "blocked_apply_approval_mutation_enabled",
            "transition_apply_approval_mutation_enabled",
            "reject_transition_apply_approval_intake",
            "do_not_apply_transition",
            false,
        );
    }
    match approval_status.status.as_str() {
        "ready_for_transition_apply_approval_intake" => (
            "ready_for_transition_apply_execution_plan",
            "exact_apply_approval_ready_for_plan",
            "request_transition_apply_execution_gate",
            "plan_mark_review_result_accepted_and_unlock_next_packet",
            true,
        ),
        "ready_for_rejection_record_approval_intake" => (
            "ready_for_rejection_record_plan",
            "exact_rejection_record_approval_ready_for_plan",
            "request_rejection_record_execution_gate",
            "plan_record_review_result_rejected",
            true,
        ),
        "ready_for_hold_record_approval_intake" => (
            "ready_for_hold_record_plan",
            "exact_hold_record_approval_ready_for_plan",
            "request_hold_record_execution_gate",
            "plan_record_review_result_hold",
            true,
        ),
        _ => (
            "blocked_apply_approval_not_ready",
            "apply_approval_status_not_ready",
            "wait_for_ready_apply_approval_intake",
            "do_not_apply_transition",
            false,
        ),
    }
}

fn transition_apply_approval_intake_decision(
    apply_gate: &TransitionApplyGatePreview,
    report: &TransitionApplyApprovalReadReport,
    expected_gate_id: &str,
    expected_approval_type: &str,
    expected_approval_text: &str,
    live_execution: bool,
) -> (&'static str, &'static str, &'static str) {
    if live_execution {
        return (
            "blocked_live_execution_flag",
            "transition_apply_approval_live_flag_present",
            "stop_before_apply_approval_intake",
        );
    }
    if !apply_gate.exact_approval_required
        || !apply_gate.human_approval_required
        || expected_approval_type == "none"
    {
        return (
            "blocked_apply_gate_not_ready",
            "transition_apply_gate_not_ready_for_approval",
            "prepare_transition_apply_gate_preview",
        );
    }
    if apply_gate.queue_consumption_allowed
        || apply_gate.source_mutation_allowed
        || apply_gate.state_mutation_allowed
    {
        return (
            "blocked_apply_gate_mutation_enabled",
            "transition_apply_gate_mutation_enabled",
            "reject_transition_apply_gate_preview",
        );
    }
    if report.invalid {
        return (
            "blocked_invalid_transition_apply_approval",
            "transition_apply_approval_parse_failed",
            "repair_transition_apply_approval",
        );
    }
    if report.missing {
        return (
            "missing_transition_apply_approval",
            "transition_apply_approval_missing",
            "wait_for_exact_transition_apply_approval",
        );
    }
    let Some(approval) = report.approval.as_ref() else {
        return (
            "missing_transition_apply_approval",
            "transition_apply_approval_missing",
            "wait_for_exact_transition_apply_approval",
        );
    };
    if approval.source_gate_id != expected_gate_id {
        return (
            "blocked_approval_gate_mismatch",
            "transition_apply_approval_source_gate_mismatch",
            "verify_transition_apply_approval_source",
        );
    }
    if approval.status != "transition_apply_approval_ready" {
        return (
            "blocked_approval_not_ready",
            "transition_apply_approval_status_not_ready",
            "inspect_transition_apply_approval_status",
        );
    }
    if !approval.dry_run {
        return (
            "blocked_approval_not_dry_run",
            "transition_apply_approval_not_dry_run",
            "reject_transition_apply_approval",
        );
    }
    if approval.queue_consumption_allowed
        || approval.source_mutation_allowed
        || approval.state_mutation_allowed
    {
        return (
            "blocked_approval_mutation_enabled",
            "transition_apply_approval_allows_mutation",
            "reject_transition_apply_approval",
        );
    }
    if approval.approval_type != expected_approval_type {
        return (
            "blocked_approval_type_mismatch",
            "transition_apply_approval_type_mismatch",
            "verify_transition_apply_approval_type",
        );
    }
    if approval.approval_text != expected_approval_text {
        return (
            "blocked_approval_text_mismatch",
            "transition_apply_approval_text_not_exact",
            "request_exact_transition_apply_approval_text",
        );
    }
    match approval.approval_type.as_str() {
        "apply" => (
            "ready_for_transition_apply_approval_intake",
            "exact_transition_apply_approval_ready",
            "prepare_transition_apply_execution_plan_no_mutation",
        ),
        "reject" => (
            "ready_for_rejection_record_approval_intake",
            "exact_rejection_record_approval_ready",
            "prepare_rejection_record_plan_no_mutation",
        ),
        "hold" => (
            "ready_for_hold_record_approval_intake",
            "exact_hold_record_approval_ready",
            "prepare_hold_record_plan_no_mutation",
        ),
        _ => (
            "blocked_unknown_transition_apply_approval",
            "transition_apply_approval_type_unknown",
            "inspect_transition_apply_approval_type",
        ),
    }
}

fn expected_transition_apply_approval_type(apply_gate: &TransitionApplyGatePreview) -> String {
    match apply_gate.status.as_str() {
        "ready_for_transition_apply_gate_preview" => "apply".to_string(),
        "ready_for_transition_rejection_apply_gate_preview" => "reject".to_string(),
        "ready_for_transition_hold_apply_gate_preview" => "hold".to_string(),
        _ => "none".to_string(),
    }
}

fn expected_transition_apply_approval_text(apply_gate: &TransitionApplyGatePreview) -> String {
    match expected_transition_apply_approval_type(apply_gate).as_str() {
        "apply" => format!("APPROVE_TRANSITION_APPLY:{}", apply_gate.gate_id),
        "reject" => format!("APPROVE_TRANSITION_REJECTION_RECORD:{}", apply_gate.gate_id),
        "hold" => format!("APPROVE_TRANSITION_HOLD_RECORD:{}", apply_gate.gate_id),
        _ => "NO_APPROVAL_AVAILABLE".to_string(),
    }
}

fn transition_apply_gate_preview_decision(
    transition_preview: &TransitionExecutionPreview,
) -> (&'static str, &'static str, &'static str, &'static str, bool) {
    if transition_preview.live_execution {
        return (
            "blocked_live_execution_flag",
            "transition_preview_live_flag_present",
            "stop_before_transition_apply_gate",
            "do_not_apply_transition",
            false,
        );
    }
    if transition_preview.queue_consumption_allowed
        || transition_preview.source_mutation_allowed
        || transition_preview.state_mutation_allowed
    {
        return (
            "blocked_transition_preview_mutation_enabled",
            "transition_preview_mutation_enabled",
            "reject_transition_execution_preview",
            "do_not_apply_transition",
            false,
        );
    }
    match transition_preview.status.as_str() {
        "ready_for_transition_execution_preview" => (
            "ready_for_transition_apply_gate_preview",
            "accepted_transition_preview_ready_for_apply_gate",
            "wait_for_exact_transition_apply_approval",
            "request_exact_transition_apply_approval",
            true,
        ),
        "ready_for_transition_rejection_preview" => (
            "ready_for_transition_rejection_apply_gate_preview",
            "rejected_transition_preview_ready_for_apply_gate",
            "wait_for_exact_rejection_record_approval",
            "request_exact_rejection_record_approval",
            true,
        ),
        "ready_for_transition_hold_preview" => (
            "ready_for_transition_hold_apply_gate_preview",
            "held_transition_preview_ready_for_apply_gate",
            "wait_for_exact_hold_record_approval",
            "request_exact_hold_record_approval",
            true,
        ),
        _ => (
            "blocked_transition_preview_not_ready",
            "transition_preview_not_ready_for_apply_gate",
            "inspect_transition_execution_preview",
            "do_not_apply_transition",
            false,
        ),
    }
}

fn transition_execution_preview_decision(
    decision_status: &HumanTransitionDecisionIntakeStatus,
) -> (&'static str, &'static str, &'static str, &'static str) {
    if decision_status.live_execution {
        return (
            "blocked_live_execution_flag",
            "human_transition_decision_live_flag_present",
            "stop_before_transition_execution_preview",
            "do_not_transition",
        );
    }
    if decision_status.queue_consumption_allowed || decision_status.source_mutation_allowed {
        return (
            "blocked_decision_mutation_enabled",
            "human_transition_decision_mutation_enabled",
            "reject_human_transition_decision",
            "do_not_transition",
        );
    }
    match decision_status.status.as_str() {
        "ready_for_accepted_human_transition_decision" => (
            "ready_for_transition_execution_preview",
            "accepted_human_transition_decision_ready",
            "prepare_transition_apply_gate_explicit_mutation_required",
            "would_mark_review_result_accepted_and_unlock_next_packet",
        ),
        "ready_for_rejected_human_transition_decision" => (
            "ready_for_transition_rejection_preview",
            "rejected_human_transition_decision_ready",
            "record_rejection_preview_no_mutation",
            "would_record_rejection_and_stop_transition",
        ),
        "ready_for_held_human_transition_decision" => (
            "ready_for_transition_hold_preview",
            "held_human_transition_decision_ready",
            "keep_gate_waiting_no_mutation",
            "would_keep_gate_waiting_for_operator",
        ),
        _ => (
            "blocked_human_decision_not_ready",
            "human_transition_decision_status_not_ready",
            "inspect_human_transition_decision_intake_status",
            "do_not_transition",
        ),
    }
}

fn human_transition_decision_intake_decision(
    gate_status: &ReviewResultTransitionGateStatus,
    report: &HumanTransitionDecisionReadReport,
    expected_gate_id: &str,
    live_execution: bool,
) -> (&'static str, &'static str, &'static str) {
    if live_execution {
        return (
            "blocked_live_execution_flag",
            "human_transition_decision_live_flag_present",
            "stop_before_human_decision_intake",
        );
    }
    if gate_status.status != "ready_for_human_result_transition_decision"
        && gate_status.status != "ready_for_human_warn_decision_status"
    {
        return (
            "blocked_gate_status_not_ready",
            "result_transition_gate_status_not_ready",
            "prepare_result_transition_gate_status",
        );
    }
    if report.invalid {
        return (
            "blocked_invalid_human_transition_decision",
            "human_transition_decision_parse_failed",
            "repair_human_transition_decision",
        );
    }
    if report.missing {
        return (
            "missing_human_transition_decision",
            "human_transition_decision_missing",
            "wait_for_human_transition_decision",
        );
    }
    let Some(decision) = report.decision.as_ref() else {
        return (
            "missing_human_transition_decision",
            "human_transition_decision_missing",
            "wait_for_human_transition_decision",
        );
    };
    if decision.source_gate_id != expected_gate_id {
        return (
            "blocked_decision_gate_mismatch",
            "human_transition_decision_source_gate_mismatch",
            "verify_human_transition_decision_source",
        );
    }
    if decision.status != "human_transition_decision_ready" {
        return (
            "blocked_decision_not_ready",
            "human_transition_decision_status_not_ready",
            "inspect_human_transition_decision_status",
        );
    }
    if !decision.dry_run {
        return (
            "blocked_decision_not_dry_run",
            "human_transition_decision_not_dry_run",
            "reject_human_transition_decision",
        );
    }
    if decision.queue_consumption_allowed || decision.source_mutation_allowed {
        return (
            "blocked_decision_mutation_enabled",
            "human_transition_decision_allows_queue_or_source_mutation",
            "reject_human_transition_decision",
        );
    }
    match decision.decision_kind.as_str() {
        "accept" => (
            "ready_for_accepted_human_transition_decision",
            "human_transition_decision_accept_ready",
            "prepare_transition_execution_preview_no_mutation",
        ),
        "reject" => (
            "ready_for_rejected_human_transition_decision",
            "human_transition_decision_reject_ready",
            "record_rejection_and_stop_transition",
        ),
        "hold" => (
            "ready_for_held_human_transition_decision",
            "human_transition_decision_hold_ready",
            "keep_gate_waiting_for_operator",
        ),
        _ => (
            "blocked_unknown_human_transition_decision",
            "human_transition_decision_type_unknown",
            "inspect_human_transition_decision_type",
        ),
    }
}

fn review_result_transition_gate_status_decision(
    missing: bool,
    invalid: bool,
    gate: Option<&PersistedReviewResultTransitionGateSummary>,
) -> (&'static str, &'static str, &'static str) {
    if invalid {
        return (
            "blocked_invalid_result_transition_gate",
            "result_transition_gate_parse_failed",
            "repair_result_transition_gate_before_status",
        );
    }
    if missing {
        return (
            "missing_result_transition_gate",
            "result_transition_gate_missing",
            "write_review_result_transition_gate",
        );
    }
    let Some(gate) = gate else {
        return (
            "missing_result_transition_gate",
            "result_transition_gate_missing",
            "write_review_result_transition_gate",
        );
    };
    if gate.live_execution {
        return (
            "blocked_live_execution_flag",
            "result_transition_gate_live_flag_present",
            "stop_before_result_transition_status",
        );
    }
    if gate.queue_consumption_allowed || gate.source_mutation_allowed {
        return (
            "blocked_transition_gate_mutation_enabled",
            "transition_gate_allows_queue_or_source_mutation",
            "reject_transition_gate_artifact",
        );
    }
    if gate.status == "ready_for_human_result_transition_gate"
        && gate.dry_run
        && gate.human_decision_required
    {
        return (
            "ready_for_human_result_transition_decision",
            "transition_gate_ready_for_human_decision",
            "wait_for_explicit_human_transition_decision",
        );
    }
    if gate.status == "ready_for_human_warn_decision_gate"
        && gate.dry_run
        && gate.human_decision_required
    {
        return (
            "ready_for_human_warn_decision_status",
            "warn_gate_ready_for_human_decision",
            "decide_warn_candidate_before_transition",
        );
    }
    (
        "blocked_transition_gate_not_ready",
        "transition_gate_not_ready_for_status",
        "inspect_transition_gate_before_decision",
    )
}

fn review_result_transition_gate_decision(
    transition_preview: &ReviewResultTransitionPreview,
) -> (&'static str, &'static str, &'static str, &'static str) {
    if transition_preview.live_execution {
        return (
            "blocked_live_execution_flag",
            "transition_preview_live_flag_present",
            "stop_before_human_transition_gate",
            "do_not_transition",
        );
    }
    if transition_preview.status == "ready_for_review_result_transition_preview"
        && transition_preview.transition_allowed
        && !transition_preview.queue_consumption_allowed
        && !transition_preview.source_mutation_allowed
    {
        return (
            "ready_for_human_result_transition_gate",
            "transition_preview_ready_for_human_gate",
            "wait_for_explicit_human_transition_decision",
            "approve_or_reject_review_result_transition",
        );
    }
    if transition_preview.status == "ready_for_human_review_decision_preview" {
        return (
            "ready_for_human_warn_decision_gate",
            "warn_candidate_requires_human_decision",
            "decide_warn_candidate_before_transition",
            "review_warn_candidate_and_choose_accept_or_reject",
        );
    }
    (
        "blocked_transition_preview_not_ready",
        "transition_preview_not_ready_for_gate",
        "inspect_transition_preview_before_gate",
        "do_not_transition",
    )
}

fn review_result_transition_preview_decision(
    candidate_status: &ReviewCandidateIntakeStatus,
) -> (&'static str, &'static str, &'static str, bool) {
    if candidate_status.live_execution {
        return (
            "blocked_live_execution_flag",
            "candidate_status_live_flag_present",
            "stop_before_review_result_transition",
            false,
        );
    }
    match candidate_status.status.as_str() {
        "ready_for_review_candidate_acceptance" => (
            "ready_for_review_result_transition_preview",
            "review_candidate_acceptance_ready",
            "prepare_human_result_transition_gate",
            true,
        ),
        "ready_for_human_review_decision" => (
            "ready_for_human_review_decision_preview",
            "review_candidate_warn_requires_human_decision",
            "present_warn_candidate_to_operator",
            false,
        ),
        _ => (
            "blocked_candidate_status_not_ready",
            "candidate_status_not_ready_for_transition",
            "inspect_review_candidate_intake_status",
            false,
        ),
    }
}

fn review_candidate_intake_decision(
    operator_card: &ReviewHandoffOperatorCard,
    report: &ReviewCandidateReadReport,
    review_only: bool,
    live_execution: bool,
) -> (&'static str, &'static str, &'static str) {
    if live_execution {
        return (
            "blocked_live_execution_flag",
            "review_candidate_live_flag_present",
            "stop_before_candidate_intake",
        );
    }
    if operator_card.status != "ready_for_manual_opencode_review_instruction" {
        return (
            "blocked_operator_card_not_ready",
            "operator_card_not_ready",
            "prepare_operator_card_before_candidate_intake",
        );
    }
    if report.invalid {
        return (
            "blocked_invalid_review_candidate",
            "review_candidate_parse_failed",
            "repair_review_candidate_before_intake",
        );
    }
    if report.missing {
        return (
            "missing_review_candidate",
            "review_candidate_missing",
            "wait_for_manual_review_candidate",
        );
    }
    let Some(candidate) = report.candidate.as_ref() else {
        return (
            "missing_review_candidate",
            "review_candidate_missing",
            "wait_for_manual_review_candidate",
        );
    };
    if candidate.source_card_id != operator_card.card_id {
        return (
            "blocked_candidate_card_mismatch",
            "candidate_source_card_mismatch",
            "verify_manual_review_candidate_source",
        );
    }
    if !review_only {
        return (
            "blocked_candidate_not_review_only",
            "review_candidate_not_review_only",
            "reject_candidate_and_request_review_only_result",
        );
    }
    if candidate.status != "review_candidate_ready" {
        return (
            "blocked_candidate_not_ready",
            "review_candidate_status_not_ready",
            "inspect_review_candidate_status",
        );
    }
    if candidate.blocking_issue {
        return (
            "blocked_review_candidate_blocking_issue",
            "review_candidate_has_blocking_issue",
            "route_blocking_issue_to_codex_fix_packet",
        );
    }
    match candidate.verdict.as_str() {
        "pass" => (
            "ready_for_review_candidate_acceptance",
            "review_candidate_pass_no_blocking_issue",
            "prepare_review_result_transition_no_execution",
        ),
        "warn" => (
            "ready_for_human_review_decision",
            "review_candidate_warn_no_blocking_issue",
            "present_warn_candidate_to_operator",
        ),
        _ => (
            "blocked_review_candidate_verdict",
            "review_candidate_verdict_not_acceptable",
            "inspect_review_candidate_verdict",
        ),
    }
}

fn review_handoff_operator_card_decision(
    manifest_status: &ReviewHandoffBundleManifestStatus,
) -> (&'static str, &'static str, &'static str, &'static str) {
    if manifest_status.live_execution {
        return (
            "blocked_live_execution_flag",
            "handoff_manifest_live_flag_present",
            "stop_before_operator_card",
            "do_not_invoke_opencode",
        );
    }
    if manifest_status.status == "ready_for_operator_review_card"
        && manifest_status.review_only
        && manifest_status.manifest_present
    {
        return (
            "ready_for_manual_opencode_review_instruction",
            "handoff_manifest_review_only_ready",
            "manual_opencode_review_only_no_invocation",
            "review_manifest_manually_no_invocation",
        );
    }
    (
        "blocked_manifest_not_review_ready",
        "handoff_manifest_status_not_ready",
        "inspect_manifest_status_before_operator_card",
        "do_not_invoke_opencode",
    )
}

fn review_handoff_bundle_manifest_status_decision(
    missing: bool,
    invalid: bool,
    review_only: bool,
    live_execution: bool,
) -> (&'static str, &'static str, &'static str) {
    if live_execution {
        return (
            "blocked_live_execution_flag",
            "handoff_manifest_live_flag_present",
            "stop_before_operator_card",
        );
    }
    if invalid {
        return (
            "blocked_invalid_handoff_manifest",
            "handoff_manifest_parse_failed",
            "repair_handoff_manifest_before_operator_card",
        );
    }
    if missing {
        return (
            "missing_handoff_manifest",
            "handoff_manifest_missing",
            "write_review_handoff_manifest",
        );
    }
    if review_only {
        return (
            "ready_for_operator_review_card",
            "handoff_manifest_review_only_ready",
            "prepare_operator_card_no_invocation",
        );
    }
    (
        "blocked_manifest_not_review_ready",
        "handoff_manifest_not_review_ready",
        "inspect_handoff_manifest_before_operator_card",
    )
}

fn review_handoff_bundle_manifest_decision(
    consume_preview_status: &str,
    has_selected_packet: bool,
    handoff_status: &str,
    review_only: bool,
    live_execution: bool,
) -> (&'static str, &'static str, &'static str) {
    if live_execution {
        return (
            "blocked_live_execution_flag",
            "handoff_bundle_live_flag_present",
            "stop_before_review_handoff_manifest",
        );
    }
    if consume_preview_status != "ready_for_review_consume_preview" {
        return (
            "blocked_consume_preview_not_ready",
            "consume_preview_not_ready",
            "inspect_consume_preview_before_manifest",
        );
    }
    if !has_selected_packet {
        return (
            "blocked_no_selected_review_packet",
            "selected_review_packet_missing",
            "wait_for_ready_review_packet",
        );
    }
    if handoff_status != "ready_for_manual_opencode_review" {
        return (
            "blocked_handoff_status_not_ready",
            "handoff_status_not_ready",
            "inspect_handoff_status_before_manifest",
        );
    }
    if !review_only {
        return (
            "blocked_not_review_only",
            "handoff_bundle_not_review_only",
            "inspect_handoff_bundle_before_manual_review",
        );
    }
    (
        "ready_for_manual_review_handoff_manifest",
        "consume_preview_and_handoff_status_ready",
        "manual_opencode_review_only_no_invocation",
    )
}

fn review_worker_handoff_status_decision(
    missing: bool,
    invalid: bool,
    review_only: bool,
    live_execution: bool,
) -> (&'static str, &'static str, &'static str) {
    if live_execution {
        return (
            "blocked_live_execution_flag",
            "handoff_envelope_live_flag_present",
            "stop_before_manual_review",
        );
    }
    if invalid {
        return (
            "blocked_invalid_handoff_envelope",
            "handoff_envelope_parse_failed",
            "repair_handoff_envelope_before_review",
        );
    }
    if missing {
        return (
            "missing_handoff_envelope",
            "handoff_envelope_missing",
            "write_review_worker_handoff_envelope",
        );
    }
    if review_only {
        return (
            "ready_for_manual_opencode_review",
            "handoff_envelope_review_only_ready",
            "manual_opencode_review_only_no_invocation",
        );
    }
    (
        "blocked_not_review_only",
        "handoff_envelope_not_review_only",
        "inspect_handoff_envelope_before_review",
    )
}

fn review_worker_handoff_decision(
    consume_preview_status: &str,
    has_selected_packet: bool,
    live_execution: bool,
) -> (&'static str, &'static str, &'static str) {
    if live_execution || consume_preview_status == "blocked_live_execution_flag" {
        return (
            "blocked_live_execution_flag",
            "review_packet_live_flag_present",
            "stop_before_review_worker_handoff",
        );
    }
    if consume_preview_status == "blocked_outbox_needs_repair" {
        return (
            "blocked_outbox_needs_repair",
            "invalid_review_packet_lines_present",
            "repair_review_packet_store_before_handoff",
        );
    }
    if consume_preview_status == "blocked_empty_review_outbox" {
        return (
            "blocked_empty_review_outbox",
            "no_review_packets",
            "wait_for_review_packet_export",
        );
    }
    if consume_preview_status == "ready_for_review_consume_preview" && has_selected_packet {
        return (
            "ready_for_manual_opencode_review",
            "selected_consume_preview_ready",
            "manual_opencode_review_only_no_invocation",
        );
    }
    (
        "blocked_no_ready_review_packet",
        "no_ready_review_packet",
        "inspect_blocked_review_packets",
    )
}

fn review_consume_preview_decision(
    outbox_status: &str,
    has_selected_packet: bool,
) -> (&'static str, &'static str, &'static str) {
    if outbox_status == "blocked_live_execution_flag" {
        return (
            "blocked_live_execution_flag",
            "review_packet_live_flag_present",
            "stop_before_review_consume",
        );
    }
    if outbox_status == "review_outbox_needs_repair" {
        return (
            "blocked_outbox_needs_repair",
            "invalid_review_packet_lines_present",
            "repair_review_packet_store_before_consume",
        );
    }
    if outbox_status == "empty_review_outbox" {
        return (
            "blocked_empty_review_outbox",
            "no_review_packets",
            "wait_for_review_packet_export",
        );
    }
    if has_selected_packet {
        return (
            "ready_for_review_consume_preview",
            "selected_ready_review_packet",
            "handoff_selected_packet_to_opencode_review_only",
        );
    }
    (
        "blocked_no_ready_review_packet",
        "no_ready_review_packet",
        "inspect_blocked_review_packets",
    )
}

fn review_outbox_decision(
    packet_count: usize,
    ready_count: usize,
    invalid_lines: usize,
    live_execution: bool,
) -> (&'static str, &'static str, &'static str) {
    if live_execution {
        return (
            "blocked_live_execution_flag",
            "review_packet_live_flag_present",
            "stop_before_review_consume",
        );
    }
    if invalid_lines > 0 {
        return (
            "review_outbox_needs_repair",
            "invalid_review_packet_lines_present",
            "repair_review_packet_store_before_consume",
        );
    }
    if ready_count > 0 {
        return (
            "ready_review_packet_available",
            "ready_packet_available",
            "prepare_opencode_review_only_handoff",
        );
    }
    if packet_count == 0 {
        return (
            "empty_review_outbox",
            "no_review_packets",
            "wait_for_review_packet_export",
        );
    }
    (
        "no_ready_review_packet_available",
        "no_ready_review_packet",
        "inspect_blocked_review_packets",
    )
}

/// File-backed JSONL store for local review packet exports.
#[derive(Clone, Debug)]
pub struct FileReviewPacketStore {
    path: PathBuf,
}

/// File-backed local handoff envelope artifact writer.
#[derive(Clone, Debug)]
pub struct FileReviewWorkerHandoffStore {
    path: PathBuf,
}

/// File-backed local handoff bundle manifest writer.
#[derive(Clone, Debug)]
pub struct FileReviewHandoffBundleManifestStore {
    path: PathBuf,
}

/// File-backed local manual review candidate artifact store.
#[derive(Clone, Debug)]
pub struct FileReviewCandidateStore {
    path: PathBuf,
}

/// File-backed local review result transition gate artifact store.
#[derive(Clone, Debug)]
pub struct FileReviewResultTransitionGateStore {
    path: PathBuf,
}

/// File-backed local human transition decision artifact store.
#[derive(Clone, Debug)]
pub struct FileHumanTransitionDecisionStore {
    path: PathBuf,
}

/// File-backed local transition apply approval artifact store.
#[derive(Clone, Debug)]
pub struct FileTransitionApplyApprovalStore {
    path: PathBuf,
}

/// File-backed local transition apply execution approval artifact store.
#[derive(Clone, Debug)]
pub struct FileTransitionApplyExecutionApprovalStore {
    path: PathBuf,
}

impl FileTransitionApplyExecutionApprovalStore {
    /// Creates a file-backed transition apply execution approval store.
    pub fn new(path: impl Into<PathBuf>) -> Self {
        Self { path: path.into() }
    }

    /// Returns the transition apply execution approval path.
    pub fn path(&self) -> &Path {
        &self.path
    }

    /// Writes one local transition apply execution approval without applying it.
    pub fn write(&self, approval: &TransitionApplyExecutionApproval) -> Result<()> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(&self.path, approval.to_json())?;
        Ok(())
    }

    /// Reads one local transition apply execution approval without consuming or applying state.
    pub fn read_report(&self) -> Result<TransitionApplyExecutionApprovalReadReport> {
        if !self.path.exists() {
            return Ok(TransitionApplyExecutionApprovalReadReport {
                approval: None,
                missing: true,
                invalid: false,
            });
        }
        let content = fs::read_to_string(&self.path)?;
        if let Some(approval) = TransitionApplyExecutionApproval::from_json(&content) {
            Ok(TransitionApplyExecutionApprovalReadReport {
                approval: Some(approval),
                missing: false,
                invalid: false,
            })
        } else {
            Ok(TransitionApplyExecutionApprovalReadReport {
                approval: None,
                missing: false,
                invalid: true,
            })
        }
    }
}

impl FileTransitionApplyApprovalStore {
    /// Creates a file-backed transition apply approval store.
    pub fn new(path: impl Into<PathBuf>) -> Self {
        Self { path: path.into() }
    }

    /// Returns the transition apply approval path.
    pub fn path(&self) -> &Path {
        &self.path
    }

    /// Writes one local transition apply approval without applying it.
    pub fn write(&self, approval: &TransitionApplyApproval) -> Result<()> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(&self.path, approval.to_json())?;
        Ok(())
    }

    /// Reads one local transition apply approval without consuming or applying state.
    pub fn read_report(&self) -> Result<TransitionApplyApprovalReadReport> {
        if !self.path.exists() {
            return Ok(TransitionApplyApprovalReadReport {
                approval: None,
                missing: true,
                invalid: false,
            });
        }
        let content = fs::read_to_string(&self.path)?;
        if let Some(approval) = TransitionApplyApproval::from_json(&content) {
            Ok(TransitionApplyApprovalReadReport {
                approval: Some(approval),
                missing: false,
                invalid: false,
            })
        } else {
            Ok(TransitionApplyApprovalReadReport {
                approval: None,
                missing: false,
                invalid: true,
            })
        }
    }
}

impl FileHumanTransitionDecisionStore {
    /// Creates a file-backed human transition decision store.
    pub fn new(path: impl Into<PathBuf>) -> Self {
        Self { path: path.into() }
    }

    /// Returns the human transition decision path.
    pub fn path(&self) -> &Path {
        &self.path
    }

    /// Writes one local human transition decision without executing it.
    pub fn write(&self, decision: &HumanTransitionDecision) -> Result<()> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(&self.path, decision.to_json())?;
        Ok(())
    }

    /// Reads one local human transition decision without consuming or transitioning state.
    pub fn read_report(&self) -> Result<HumanTransitionDecisionReadReport> {
        if !self.path.exists() {
            return Ok(HumanTransitionDecisionReadReport {
                decision: None,
                missing: true,
                invalid: false,
            });
        }
        let content = fs::read_to_string(&self.path)?;
        if let Some(decision) = HumanTransitionDecision::from_json(&content) {
            Ok(HumanTransitionDecisionReadReport {
                decision: Some(decision),
                missing: false,
                invalid: false,
            })
        } else {
            Ok(HumanTransitionDecisionReadReport {
                decision: None,
                missing: false,
                invalid: true,
            })
        }
    }
}

impl FileReviewResultTransitionGateStore {
    /// Creates a file-backed transition gate store.
    pub fn new(path: impl Into<PathBuf>) -> Self {
        Self { path: path.into() }
    }

    /// Returns the transition gate path.
    pub fn path(&self) -> &Path {
        &self.path
    }

    /// Writes one local transition gate without executing its operator action.
    pub fn write(&self, gate: &ReviewResultTransitionGate) -> Result<()> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(&self.path, gate.to_json())?;
        Ok(())
    }

    /// Reads one local transition gate summary without consuming or transitioning state.
    pub fn read_report(&self) -> Result<ReviewResultTransitionGateReadReport> {
        if !self.path.exists() {
            return Ok(ReviewResultTransitionGateReadReport {
                gate: None,
                missing: true,
                invalid: false,
            });
        }
        let content = fs::read_to_string(&self.path)?;
        if let Some(gate) = PersistedReviewResultTransitionGateSummary::from_json(&content) {
            Ok(ReviewResultTransitionGateReadReport {
                gate: Some(gate),
                missing: false,
                invalid: false,
            })
        } else {
            Ok(ReviewResultTransitionGateReadReport {
                gate: None,
                missing: false,
                invalid: true,
            })
        }
    }
}

impl FileReviewCandidateStore {
    /// Creates a file-backed review candidate store.
    pub fn new(path: impl Into<PathBuf>) -> Self {
        Self { path: path.into() }
    }

    /// Returns the review candidate path.
    pub fn path(&self) -> &Path {
        &self.path
    }

    /// Writes one local manual review candidate without consuming it.
    pub fn write(&self, candidate: &ManualReviewCandidate) -> Result<()> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(&self.path, candidate.to_json())?;
        Ok(())
    }

    /// Reads one local review candidate summary without transitioning packet state.
    pub fn read_report(&self) -> Result<ReviewCandidateReadReport> {
        if !self.path.exists() {
            return Ok(ReviewCandidateReadReport {
                candidate: None,
                missing: true,
                invalid: false,
            });
        }
        let content = fs::read_to_string(&self.path)?;
        if let Some(candidate) = ManualReviewCandidate::from_json(&content) {
            Ok(ReviewCandidateReadReport {
                candidate: Some(candidate),
                missing: false,
                invalid: false,
            })
        } else {
            Ok(ReviewCandidateReadReport {
                candidate: None,
                missing: false,
                invalid: true,
            })
        }
    }
}

impl FileReviewHandoffBundleManifestStore {
    /// Creates a file-backed handoff bundle manifest store.
    pub fn new(path: impl Into<PathBuf>) -> Self {
        Self { path: path.into() }
    }

    /// Returns the handoff bundle manifest path.
    pub fn path(&self) -> &Path {
        &self.path
    }

    /// Writes one local handoff bundle manifest without invoking a reviewer.
    pub fn write(&self, manifest: &ReviewHandoffBundleManifest) -> Result<()> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(&self.path, manifest.to_json())?;
        Ok(())
    }

    /// Reads one local handoff bundle manifest summary without invoking a reviewer.
    pub fn read_report(&self) -> Result<ReviewHandoffBundleManifestReadReport> {
        if !self.path.exists() {
            return Ok(ReviewHandoffBundleManifestReadReport {
                manifest: None,
                missing: true,
                invalid: false,
            });
        }
        let content = fs::read_to_string(&self.path)?;
        if let Some(manifest) = PersistedReviewHandoffBundleManifestSummary::from_json(&content) {
            Ok(ReviewHandoffBundleManifestReadReport {
                manifest: Some(manifest),
                missing: false,
                invalid: false,
            })
        } else {
            Ok(ReviewHandoffBundleManifestReadReport {
                manifest: None,
                missing: false,
                invalid: true,
            })
        }
    }
}

impl FileReviewWorkerHandoffStore {
    /// Creates a file-backed handoff envelope store.
    pub fn new(path: impl Into<PathBuf>) -> Self {
        Self { path: path.into() }
    }

    /// Returns the handoff envelope path.
    pub fn path(&self) -> &Path {
        &self.path
    }

    /// Writes one local handoff envelope without invoking a reviewer.
    pub fn write(&self, envelope: &ReviewWorkerHandoffEnvelope) -> Result<()> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(&self.path, envelope.to_json())?;
        Ok(())
    }

    /// Reads one local handoff envelope summary without invoking a reviewer.
    pub fn read_report(&self) -> Result<ReviewWorkerHandoffReadReport> {
        if !self.path.exists() {
            return Ok(ReviewWorkerHandoffReadReport {
                envelope: None,
                missing: true,
                invalid: false,
            });
        }
        let content = fs::read_to_string(&self.path)?;
        if let Some(envelope) = PersistedReviewWorkerHandoffSummary::from_json(&content) {
            Ok(ReviewWorkerHandoffReadReport {
                envelope: Some(envelope),
                missing: false,
                invalid: false,
            })
        } else {
            Ok(ReviewWorkerHandoffReadReport {
                envelope: None,
                missing: false,
                invalid: true,
            })
        }
    }
}

impl FileReviewPacketStore {
    /// Creates a file-backed review packet store.
    pub fn new(path: impl Into<PathBuf>) -> Self {
        Self { path: path.into() }
    }

    /// Returns the review packet store path.
    pub fn path(&self) -> &Path {
        &self.path
    }

    /// Appends one local review packet without invoking reviewers or workers.
    pub fn append(&self, packet: &SelectedBundleReviewPacket) -> Result<()> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)?;
        }
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.path)?;
        writeln!(file, "{}", packet.to_json())?;
        Ok(())
    }

    /// Reads all review packets, failing closed when malformed records exist.
    pub fn read_all(&self) -> Result<Vec<PersistedReviewPacketSummary>> {
        let report = self.read_report()?;
        if report.invalid_lines > 0 {
            return Err(MigrationError::CorruptStore {
                store: "review_packet",
                invalid_lines: report.invalid_lines,
            });
        }
        Ok(report.packets)
    }

    /// Reads review packet storage and reports malformed lines without execution.
    pub fn read_report(&self) -> Result<ReviewPacketReadReport> {
        if !self.path.exists() {
            return Ok(ReviewPacketReadReport {
                packets: Vec::new(),
                invalid_lines: 0,
                skipped_empty_lines: 0,
            });
        }
        let file = OpenOptions::new().read(true).open(&self.path)?;
        let reader = BufReader::new(file);
        let mut packets = Vec::new();
        let mut invalid_lines = 0;
        let mut skipped_empty_lines = 0;
        for line in reader.lines() {
            let line = line?;
            if line.trim().is_empty() {
                skipped_empty_lines += 1;
                continue;
            }
            if let Some(summary) = PersistedReviewPacketSummary::from_json_line(&line) {
                packets.push(summary);
            } else {
                invalid_lines += 1;
            }
        }
        Ok(ReviewPacketReadReport {
            packets,
            invalid_lines,
            skipped_empty_lines,
        })
    }
}

fn extract_string(line: &str, key: &str) -> Option<String> {
    let needle = format!("\"{key}\":\"");
    let start = line.find(&needle)? + needle.len();
    read_json_string_at(line, start)
}

fn extract_last_string(line: &str, key: &str) -> Option<String> {
    let needle = format!("\"{key}\":\"");
    let start = line.rfind(&needle)? + needle.len();
    read_json_string_at(line, start)
}

fn extract_bool(line: &str, key: &str) -> Option<bool> {
    let needle = format!("\"{key}\":");
    let start = line.find(&needle)? + needle.len();
    let tail = &line[start..];
    if tail.starts_with("true") {
        Some(true)
    } else if tail.starts_with("false") {
        Some(false)
    } else {
        None
    }
}

fn read_json_string_at(line: &str, start: usize) -> Option<String> {
    let mut escaped = false;
    let mut output = String::new();
    for ch in line[start..].chars() {
        if escaped {
            match ch {
                'n' => output.push('\n'),
                'r' => output.push('\r'),
                't' => output.push('\t'),
                '\\' => output.push('\\'),
                '"' => output.push('"'),
                other => output.push(other),
            }
            escaped = false;
            continue;
        }
        match ch {
            '\\' => escaped = true,
            '"' => return Some(output),
            other => output.push(other),
        }
    }
    None
}
