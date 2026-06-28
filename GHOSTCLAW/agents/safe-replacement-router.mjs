import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = "/Users/sirinx/sirinx-os";
const RECEIPT_SCHEMA = "ghostclaw.receipt.v3_1";

const SAFE_REPLACEMENTS = {
  jailbreak_execution: [
    "jailbreak_resilience_test_design",
    "prompt_injection_detector_rules",
    "adversarial_input_classification",
    "safety_policy_regression_tests"
  ],

  bypass_safety_policy: [
    "policy_bypass_attempt_classification",
    "guardrail_regression_test",
    "safe_refusal_template_validation"
  ],

  high_latitude_simulation: [
    "safe_architecture_review",
    "policy_bypass_regression_fixture",
    "dry_run_receipt_schema"
  ],

  policy_restricted_action_bypass: [
    "policy_bypass_attempt_classification",
    "guardrail_regression_test",
    "safe_architecture_review"
  ],

  structural_override: [
    "policy_bypass_attempt_classification",
    "guardrail_regression_test",
    "dry_run_receipt_schema"
  ],

  dynamic_override_injection: [
    "policy_bypass_attempt_classification",
    "redacted_env_schema_validation",
    "guardrail_regression_test"
  ],

  contextual_identity_forgery: [
    "policy_bypass_attempt_classification",
    "redacted_env_schema_validation",
    "safe_refusal_template_validation"
  ],

  credential_mocking_factory: [
    "policy_bypass_attempt_classification",
    "redacted_env_schema_validation",
    "missing_secret_report"
  ],

  token_virtualization_signature_mock: [
    "policy_bypass_attempt_classification",
    "redacted_env_schema_validation",
    "dry_run_receipt_schema"
  ],

  secret_access: [
    "secret_reference_presence_check",
    "redacted_env_schema_validation",
    "missing_secret_report"
  ],

  production_action: [
    "staging_dry_run",
    "rollback_plan_generation",
    "healthcheck_plan_generation"
  ],

  dependency_install: [
    "lockfile_analysis",
    "package_manifest_diff",
    "no_install_test_strategy"
  ],

  external_network_write: [
    "public_read_only_research",
    "local_snapshot_manifest",
    "outbound_write_block_receipt"
  ],

  network_egress_interception: [
    "outbound_write_block_receipt",
    "local_snapshot_manifest",
    "network_egress_policy_test"
  ],

  external_network_write_without_scope: [
    "public_read_only_research",
    "local_snapshot_manifest",
    "outbound_write_block_receipt"
  ],

  destructive_action: [
    "dry_run_diff",
    "backup_manifest",
    "rollback_plan"
  ],

  destructive_filesystem_action: [
    "dry_run_diff",
    "backup_manifest",
    "rollback_plan",
    "path_scope_validation"
  ],

  malware_or_evasion_logic: [
    "defensive_threat_model",
    "detection_rule_generation",
    "secure_coding_patch"
  ],

  credential_dump: [
    "secret_reference_presence_check",
    "redacted_env_schema_validation",
    "missing_secret_report"
  ],

  recursive_agent_launch: [
    "bounded_single_run_task_envelope",
    "agent_queue_depth_check",
    "loop_prevention_receipt"
  ],

  model_download: [
    "model_requirement_documentation",
    "local_model_availability_check",
    "download_request_receipt"
  ],

  dependency_install_without_lock_scope: [
    "lockfile_analysis",
    "package_manifest_diff",
    "no_install_test_strategy"
  ],

  gpu_inference: [
    "gpu_requirement_documentation",
    "dry_run_inference_plan",
    "benchmark_request_receipt"
  ],

  model_download_or_gpu_runtime_without_budget_gate: [
    "model_requirement_documentation",
    "gpu_requirement_documentation",
    "download_request_receipt",
    "benchmark_request_receipt"
  ],

  ambiguous_instruction_execution: [
    "instruction_disambiguation_log",
    "policy_clarification_request_receipt",
    "safe_equivalent_mapping"
  ],

  kv_only_protocol: [
    "kv_protocol_risk_report",
    "json_control_plane_validation",
    "shadow_plane_read_only_probe"
  ]
};

export function getSafeReplacement(actionClass) {
  const normalized = String(actionClass || "unknown").trim().toLowerCase();

  return {
    original_action: normalized,
    blocked: true,
    replacement_actions:
      SAFE_REPLACEMENTS[normalized] || [
        "static_analysis",
        "dry_run_diff",
        "manual_risk_report_without_prompting_user"
      ]
  };
}

export function routeBlockedAction(decision, context = {}) {
  if (!["auto_blocked", "hard_blocked"].includes(decision?.status)) {
    return {
      blocked: false,
      replacement_required: false,
      replacement_actions: [],
      human_prompt_required: false,
      continue_pipeline: true
    };
  }

  const replacement = getSafeReplacement(context.action_class);

  return {
    blocked: true,
    replacement_required: true,
    original_action: replacement.original_action,
    replacement_actions: replacement.replacement_actions,
    human_prompt_required: false,
    continue_pipeline: true
  };
}

export function evaluateWithReplacement(context, engine) {
  const decision = engine.evaluateAutonomousApproval(context);
  const routing = routeBlockedAction(decision, context);
  const blockedArtifacts = routing.blocked
    ? buildBlockedActionArtifacts({
        ...context,
        reason: decision.reason,
        timestamp: new Date().toISOString()
      })
    : null;

  return {
    ...decision,
    decision_id: context.decision_id,
    routing,
    blocked_artifacts: blockedArtifacts,
    evidence_pack: context.evidence_pack,
    timestamp: new Date().toISOString()
  };
}

export function buildBlockedActionArtifacts(context = {}) {
  const routing = routeBlockedAction(
    { status: "auto_blocked", final_tier: context.final_tier || "X" },
    context
  );
  const timestamp = context.timestamp || new Date().toISOString();
  const decisionId = context.decision_id || "decision_unknown";
  const evidencePack = context.evidence_pack || {};
  const evidenceFiles = Array.isArray(evidencePack.files) ? evidencePack.files : [];

  const receipt = {
    schema: RECEIPT_SCHEMA,
    decision_id: decisionId,
    requester_agent: context.requester_agent || "unknown",
    approver_agent: context.approver_agent || "unknown",
    action_class: routing.original_action,
    final_tier: context.final_tier || "X",
    decision_status: "auto_blocked",
    reason: context.reason || "blocked_action_replaced",
    human_prompt_required: false,
    human_approval_required: false,
    continue_pipeline: true,
    evidence_pack: evidencePack,
    safe_replacement_action: routing.replacement_actions[0] || "manual_risk_report_without_prompting_user",
    replacement_actions: routing.replacement_actions,
    timestamp
  };

  return {
    receipt,
    safe_replacement_artifact: {
      artifact_type: "safe_replacement_artifact",
      original_action: routing.original_action,
      replacement_actions: routing.replacement_actions,
      output_required: ["receipt", "reason", "safe_next_action", "evidence_pack", "measurable_result"],
      safe_next_action: routing.replacement_actions[0] || "manual_risk_report_without_prompting_user",
      measurable_result: "blocked_action_mapped_to_safe_replacement",
      timestamp
    },
    rollback_manifest: {
      manifest_type: "rollback_simulation_manifest",
      decision_id: decisionId,
      production_execution: false,
      external_write_executed: false,
      destructive_mutation_executed: false,
      rollback_required_for_real_execution: true,
      rollback_plan: [
        "No real execution occurred.",
        "Discard generated local artifacts if review rejects the safe replacement.",
        "Open a separate scoped gate before any staging or production action."
      ],
      simulation_manifest: {
        mode: "dry_run_only",
        blocked_action_behavior: "auto_block_and_continue",
        deterministic_fallback: true
      },
      timestamp
    },
    checksum_manifest: {
      manifest_type: "checksum_manifest",
      algorithm: "sha256",
      entries: evidenceFiles.map((filePath) => ({
        path: filePath,
        algorithm: "sha256",
        sha256: sha256ForPath(filePath),
        exists: existsSync(path.resolve(REPO_ROOT, filePath))
      })),
      timestamp
    }
  };
}

function sha256ForPath(filePath) {
  const absolutePath = path.resolve(REPO_ROOT, filePath);
  if (!existsSync(absolutePath)) return null;
  return createHash("sha256").update(readFileSync(absolutePath)).digest("hex");
}

export default {
  buildBlockedActionArtifacts,
  getSafeReplacement,
  routeBlockedAction,
  evaluateWithReplacement,
  SAFE_REPLACEMENTS
};
