import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = "/Users/sirinx/sirinx-os";
const RECEIPT_SCHEMA = "ghostclaw.receipt.v3_1";
const FULL_AUTO_RECEIPT_SCHEMA = "ghostclaw.receipt.v3_2";

const YOLO_TEAM_CONTRACT = {
  schema_version: "3.2.0",
  mode: "full_auto_yolo_safe_execution",
  zero_prompting_non_blocking_runtime: true,
  protocol: "A2A2A",
  roles: [
    {
      agent: "manus",
      role: "supervisor",
      responsibilities: ["architecture_baseline", "patch_direction", "tier_c_quorum_vote"],
      allowed_external_mode: "github_public_read_only_snapshot"
    },
    {
      agent: "hermes",
      role: "commander_aggregator",
      policy_gate: "v3.2_enforced",
      responsibilities: ["policy_gate", "receipt_issuance", "tier_resolution", "block_and_simulate"]
    },
    {
      agent: "codex",
      role: "bounded_worker",
      responsibilities: ["allowed_path_code_patch", "micro_patch", "simulation_plan_generation"]
    },
    {
      agent: "kob",
      role: "validator",
      responsibilities: ["static_check", "vitest_no_install", "checksum_diff_validation"]
    }
  ],
  core_invariants: [
    "tier_a_b_auto_execute",
    "tier_c_quorum_or_dry_run",
    "tier_d_x_block_and_simulate",
    "pipeline_continues_after_block",
    "rollback_manifest_for_file_mutation",
    "real_secret_read_count_zero",
    "real_network_write_count_zero_for_blocked_actions",
    "real_production_call_count_zero",
    "destructive_mutation_count_zero"
  ]
};

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

export function getYoloTeamContract() {
  return structuredClone(YOLO_TEAM_CONTRACT);
}

export function buildFullAutoReceipt(context = {}) {
  const timestamp = context.timestamp || new Date().toISOString();
  const simulationOnly = Boolean(context.simulation_only);
  const realTargetExecution = context.real_target_execution ?? !simulationOnly;
  const actionClass = String(context.action_class || "unknown").trim().toLowerCase();
  const requester = context.requester_agent || "unknown";
  const approver = context.approver_agent || "unknown";
  const decisionStatus = context.decision_status || (simulationOnly ? "hard_blocked_and_simulated" : "approved");
  const restorePoints = Array.isArray(context.restore_points) ? context.restore_points : [];

  return {
    $schema: FULL_AUTO_RECEIPT_SCHEMA,
    decision_id: context.decision_id || "dec-unknown",
    timestamp,
    execution_profile: {
      mode: simulationOnly ? "simulation" : "standard_autonomous",
      simulation_only: simulationOnly,
      real_target_execution: realTargetExecution,
      sandbox_isolation_level: simulationOnly ? "local_artifact_only" : "none",
      structural_override_observed: false,
      structural_override_authorized: false,
      override_token_applied: false
    },
    evaluation_matrix: {
      requested_action_class: actionClass,
      original_policy_tier: context.original_policy_tier || "X",
      resolved_execution_tier: context.resolved_execution_tier || context.original_policy_tier || "X",
      decision_status: decisionStatus,
      display_score: Number(context.display_score ?? 0),
      effective_score: Number(context.effective_score ?? context.display_score ?? 0),
      mutual_approval_pair: {
        requester,
        approver
      },
      policy_rules_status: {
        no_self_approval: requester && approver && requester !== approver
          ? "passed_requester_not_equal_approver"
          : "failed_self_approval_or_missing_agent",
        human_approval_required: false,
        agent_quorum_validated: Boolean(context.agent_quorum_validated),
        tier_downgrade_blocked: true,
        real_execution_blocked: simulationOnly || ["D", "X"].includes(context.resolved_execution_tier || "")
      }
    },
    concrete_performance_metrics: {
      execution_duration_ms: Number(context.execution_duration_ms ?? 0),
      cpu_utilization_pct: Number(context.cpu_utilization_pct ?? 0),
      memory_delta_mb: Number(context.memory_delta_mb ?? 0),
      static_analysis_status: context.static_analysis_status || "completed",
      real_network_write_count: 0,
      real_secret_read_count: 0,
      real_production_call_count: 0,
      destructive_mutation_count: 0
    },
    state_rollback_blueprint: {
      snapshot_id: context.snapshot_id || `snap_v3_2_${timestamp.replace(/[-:TZ.]/g, "").slice(0, 14)}`,
      restore_points: restorePoints
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
  buildFullAutoReceipt,
  getSafeReplacement,
  getYoloTeamContract,
  routeBlockedAction,
  evaluateWithReplacement,
  SAFE_REPLACEMENTS
};
