import fs from "fs";
import path from "path";

const DEFAULT_POLICY_PATH = "/Users/sirinx/sirinx-os/GHOSTCLAW/policies/action-tier-cap.yaml";

const EMBEDDED_POLICY = {
  schema: "ghostclaw.action_tier_cap.v2",
  mode: "autonomous_mutual_approval",
  metadata: {
    version: "2.0.0",
    effective_date: "2026-06-29",
    description: "Enforces zero-human-interaction policy loops via agent mutual approval and policy gates"
  },
  autonomous_mutual_approval: {
    enabled: true,
    human_approval_required: false,
    fallback_behavior: "auto_block"
  },
  agents: {
    allowed_approvers: ["hermes", "codex", "manus", "kob"],
    no_self_approval: true
  },
  tier_rank: { A: 4, B: 3, C: 2, D: 1, X: 0 },
  action_tier_cap: {
    read_only: "A",
    runtime_artifact_write: "A",
    governance_doc_write: "A",
    no_install_validation: "B",
    allowed_path_staging: "B",
    source_mutation_allowed_path: "B",
    schema_upgrade_allowed_path: "B",
    code_patch_allowed_path: "B",
    local_commit_allowed_scope: "B",
    lockfile_bound_dependency_repair: "C",
    non_production_branch_push: "C",
    staging_deploy_with_rollback: "C",
    dependency_install: "D",
    model_download: "D",
    gpu_inference: "D",
    external_network_write: "D",
    push: "X",
    deploy: "X",
    production_action: "X",
    secret_access: "X",
    ambiguous_input: "X",
    recursive_codex_launch: "X",
    recursive_moa_launch: "X",
    kv_only_protocol: "X"
  },
  action_class_aliases: {
    read: "read_only",
    read_only: "read_only",
    file_read: "read_only",
    git_status: "read_only",
    git_diff: "read_only",
    brain_query: "read_only",
    mission_status: "read_only",
    plan: "read_only",
    report_status: "read_only",
    validate: "read_only",
    run_tests: "read_only",
    run_lint: "read_only",
    debug_probe: "read_only",

    runtime_artifact_write: "runtime_artifact_write",
    write_runtime_artifact: "runtime_artifact_write",
    write_lane: "runtime_artifact_write",
    write_module: "runtime_artifact_write",
    fix_bug: "runtime_artifact_write",
    refactor: "runtime_artifact_write",

    governance_doc_write: "governance_doc_write",
    write_governance_doc: "governance_doc_write",

    validation_no_install: "no_install_validation",
    no_install_validation: "no_install_validation",
    brainstorm: "no_install_validation",
    moa_review: "no_install_validation",

    allowed_path_staging: "allowed_path_staging",
    stage_allowed_files: "allowed_path_staging",
    git_add_allowed_scope: "allowed_path_staging",

    allowed_path_mutation: "source_mutation_allowed_path",
    source_mutation_allowed_path: "source_mutation_allowed_path",
    integrate: "source_mutation_allowed_path",
    integrate_patches: "source_mutation_allowed_path",
    update_brain: "source_mutation_allowed_path",

    schema_upgrade: "schema_upgrade_allowed_path",
    schema_upgrade_allowed_path: "schema_upgrade_allowed_path",

    code_patch: "code_patch_allowed_path",
    code_patch_allowed_path: "code_patch_allowed_path",

    local_commit: "local_commit_allowed_scope",
    local_commit_allowed_scope: "local_commit_allowed_scope",
    git_commit_local_scope: "local_commit_allowed_scope",

    dependency_repair: "lockfile_bound_dependency_repair",
    lockfile_bound_dependency_repair: "lockfile_bound_dependency_repair",

    install_dependencies: "dependency_install",
    dependency_install: "dependency_install",

    gpu_inference: "gpu_inference",
    model_download: "model_download",

    commit: "commit",
    git_commit: "commit",
    stage_commit: "commit",

    push: "push",
    git_push: "push",

    deploy: "deploy",
    production_deploy: "deploy",
    production_action: "production_action",

    read_env: "secret_access",
    read_secret: "secret_access",
    secret_access: "secret_access",

    ambiguous_input: "ambiguous_input",
    blocked_action_attempted: "ambiguous_input",
    blocked_action: "ambiguous_input",
    external_api_write: "ambiguous_input",
    customer_message_send: "ambiguous_input",
    cloud_mutation: "ambiguous_input",

    recursive_codex_launch: "recursive_codex_launch",
    recursive_moa_launch: "recursive_moa_launch",
    kv_only_protocol: "kv_only_protocol"
  },
  auto_approve_tiers: ["A", "B"],
  agent_quorum_tiers: ["C"],
  auto_block_tiers: ["D", "X"],
  hard_violations_force_x: [
    "self_approval_attempted",
    "secret_access_requested",
    "ambiguous_input",
    "blocked_action_attempted",
    "production_action_requested",
    "model_download_requested",
    "gpu_live_inference_requested",
    "kv_only_protocol_requested",
    "recursive_codex_launch_requested",
    "recursive_moa_launch_requested"
  ],
  unknown_action_class_default: "D"
};

function loadYamlPolicy(policyPath) {
  try {
    const text = fs.readFileSync(policyPath, "utf8");
    return parseMinimalYaml(text);
  } catch {
    return null;
  }
}

function parseMinimalYaml(text) {
  const lines = text.split(/\r?\n/);
  const root = {};
  const stack = [{ obj: root, indent: -1 }];

  for (let raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const indent = raw.length - raw.trimStart().length;
    const last = stack[stack.length - 1];

    while (indent <= last.indent && stack.length > 1) {
      stack.pop();
    }

    const current = stack[stack.length - 1].obj;

    if (trimmed.startsWith("- ")) {
      const value = trimmed.slice(2).trim();
      if (!Array.isArray(current)) {
        // This simplistic parser expects well-ordered lists under scalar keys
        continue;
      }
      const parsedValue = parseScalar(value);
      current.push(parsedValue);
    } else if (trimmed.includes(":")) {
      const idx = trimmed.indexOf(":");
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();

      if (value === "") {
        const newObj = {};
        if (Array.isArray(current)) {
          current.push(newObj);
        } else {
          current[key] = newObj;
        }
        stack.push({ obj: newObj, indent });
      } else {
        const parsedValue = parseScalar(value);
        if (Array.isArray(current)) {
          current.push({ [key]: parsedValue });
        } else {
          current[key] = parsedValue;
        }
      }
    }
  }

  return root;
}

function parseScalar(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  if (/^-?\d+\.\d+$/.test(value)) return Number(value);
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

export class AutoApproveEngine {
  constructor(policyPath = DEFAULT_POLICY_PATH) {
    const loaded = loadYamlPolicy(policyPath);
    this.policy = loaded && Object.keys(loaded).length > 0 && Array.isArray(loaded.hard_violations_force_x)
      ? loaded
      : EMBEDDED_POLICY;
  }

  scoreToTier(score) {
    if (score >= 90) return "A";
    if (score >= 75) return "B";
    if (score >= 60) return "C";
    return "D";
  }

  confidenceLabel(score) {
    if (score > 100) return "A+";
    if (score >= 90) return "A";
    if (score >= 75) return "B";
    if (score >= 60) return "C";
    return "D";
  }

  normalizeActionClass(actionClass) {
    if (!actionClass) return "unknown";
    return String(actionClass).trim().toLowerCase();
  }

  getCanonicalActionClass(actionClass) {
    const normalized = this.normalizeActionClass(actionClass);
    const aliases = this.policy.action_class_aliases || {};
    return aliases[normalized] || normalized;
  }

  getActionTierCap(actionClass) {
    const canonical = this.getCanonicalActionClass(actionClass);
    const mapping = this.policy.action_tier_cap || {};
    return mapping[canonical] || this.policy.unknown_action_class_default || "D";
  }

  hasHardViolation(violations = []) {
    const hard = new Set(this.policy.hard_violations_force_x || []);
    return violations.some((v) => hard.has(v));
  }

  applyActionTierCap(scoreTier, actionClass) {
    const tierRank = this.policy.tier_rank || { A: 4, B: 3, C: 2, D: 1, X: 0 };
    const policyTier = this.getActionTierCap(actionClass);
    const scoreRank = tierRank[scoreTier] ?? tierRank.D;
    const policyRank = tierRank[policyTier] ?? tierRank.D;
    const finalRank = Math.min(scoreRank, policyRank);
    return Object.entries(tierRank).find(([, r]) => r === finalRank)?.[0] || "D";
  }

  evaluateAutonomousApproval(context) {
    const {
      requester_agent,
      approver_agent,
      action_class,
      display_score = 0,
      decision_id,
      evidence_pack,
      violations = [],
      receipt_id
    } = context;

    if (!decision_id || !evidence_pack) {
      return this.buildDecision({
        status: "auto_blocked",
        final_tier: "X",
        human_approval_required: false,
        reason: "missing_required_metadata_fields"
      }, context);
    }

    if (!requester_agent || !approver_agent || requester_agent === approver_agent) {
      return this.buildDecision({
        status: "auto_blocked",
        final_tier: "X",
        human_approval_required: false,
        reason: "self_approval_not_allowed_or_missing_agent"
      }, context);
    }

    if (this.hasHardViolation(violations)) {
      return this.buildDecision({
        status: "auto_blocked",
        final_tier: "X",
        human_approval_required: false,
        reason: "hard_violation_detected",
        violations
      }, context);
    }

    const canonicalActionClass = this.getCanonicalActionClass(action_class);
    if (canonicalActionClass === "local_commit_allowed_scope") {
      const blockedActions = Array.isArray(context.blocked_actions) ? context.blocked_actions : [];
      const validationPassed = context.validation_passed === true;
      const allowedFilesOnly = context.allowed_files_only === true;

      if (!validationPassed || !allowedFilesOnly || blockedActions.length > 0) {
        return this.buildDecision({
          status: "auto_blocked",
          final_tier: "X",
          human_approval_required: false,
          reason: "local_commit_guard_failed",
          validation_passed: validationPassed,
          allowed_files_only: allowedFilesOnly,
          blocked_actions: blockedActions
        }, context);
      }
    }

    const effective_score = Math.min(100, Math.max(0, Number(display_score) || 0));
    const scoreTier = this.scoreToTier(effective_score);
    const final_tier = this.applyActionTierCap(scoreTier, action_class);

    let status = "auto_blocked";
    if ((this.policy.auto_approve_tiers || []).includes(final_tier)) {
      status = "approved";
    } else if ((this.policy.agent_quorum_tiers || []).includes(final_tier)) {
      status = "quorum_required";
    }

    return this.buildDecision({
      status,
      final_tier,
      effective_score,
      display_score: Number(display_score),
      confidence_label: this.confidenceLabel(display_score),
      human_approval_required: false,
      reason: status === "approved"
        ? "autonomous_mutual_approval_passed"
        : status === "quorum_required"
          ? "agent_quorum_required"
          : "policy_tier_auto_blocked"
    }, context, receipt_id);
  }

  buildDecision(decision, context, receiptId) {
    const receipt = {
      schema: "ghostclaw.receipt.v2",
      receipt_id: receiptId || `rcp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      decision_id: context.decision_id,
      timestamp: new Date().toISOString(),
      evaluation: decision,
      context: {
        requester: context.requester_agent,
        approver: context.approver_agent,
        action: context.action_class
      }
    };

    const runtimeDir = "/Users/sirinx/sirinx-os/.ghostclaw_runtime/a2a2a";
    try {
      if (!fs.existsSync(runtimeDir)) fs.mkdirSync(runtimeDir, { recursive: true });
      fs.writeFileSync(
        path.join(runtimeDir, `receipt_${context.decision_id}.json`),
        JSON.stringify(receipt, null, 2)
      );
    } catch {
      // Non-blocking: isolated tests should not fail due to fs issues
    }

    return { ...decision, receipt_id: receipt.receipt_id };
  }
}

export function createEngine(policyPath) {
  return new AutoApproveEngine(policyPath);
}
