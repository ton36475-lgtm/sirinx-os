/**
 * Tier Resolver: maps an action request to a policy tier.
 * Mirrors GHOSTCLAW autonomous-safe-execution-v3.yaml execution_matrix.
 */
import type { A2AMessage, ActionClass, Tier, TierRule } from "./a2a-message.js";

export const TIER_RULES: TierRule[] = [
  {
    tier: "A",
    actionClass: "READ",
    behavior: "auto_execute",
    humanRequired: false,
    examples: ["read_only", "repo_scan", "static_analysis", "file_inventory", "schema_validation", "policy_lint"],
  },
  {
    tier: "B",
    actionClass: "WRITE_LANE",
    behavior: "auto_execute",
    humanRequired: false,
    examples: ["allowed_path_code_patch", "local_test_generation", "local_runtime_artifact_write", "governance_doc_write"],
  },
  {
    tier: "B",
    actionClass: "VALIDATE",
    behavior: "auto_execute",
    humanRequired: false,
    examples: ["run_tests", "run_lint", "typecheck_run", "validate"],
  },
  {
    tier: "B",
    actionClass: "PLAN",
    behavior: "auto_execute",
    humanRequired: false,
    examples: ["design_architecture", "review_design", "goal_define", "mission_create", "brainstorm_deliberate"],
  },
  {
    tier: "C",
    actionClass: "INTEGRATE",
    behavior: "agent_quorum_required",
    humanRequired: false,
    examples: ["integrate_patches", "lockfile_bound_dependency_repair", "local_runtime_repair_plan"],
  },
  {
    tier: "C",
    actionClass: "COMMIT",
    behavior: "agent_quorum_required",
    humanRequired: false,
    examples: ["stage_commit", "dry_run_release_plan"],
  },
  {
    tier: "D",
    actionClass: "EXTERNAL",
    behavior: "auto_block_and_simulate",
    humanRequired: false,
    examples: ["dependency_install", "model_download", "gpu_inference", "external_network_write"],
  },
  {
    tier: "D",
    actionClass: "DESTROY",
    behavior: "auto_block_and_simulate",
    humanRequired: false,
    examples: ["destructive_filesystem_mutation", "broad_filesystem_mutation"],
  },
  {
    tier: "X",
    actionClass: "PUSH",
    behavior: "hard_block_and_simulate",
    humanRequired: true,
    examples: ["generic_push", "generic_deploy", "production_action"],
  },
  {
    tier: "X",
    actionClass: "DEPLOY",
    behavior: "hard_block_and_simulate",
    humanRequired: true,
    examples: ["production_deploy", "cloud_mutation"],
  },
];

const ACTION_TO_CLASS: Record<string, ActionClass> = {
  file_read: "READ",
  brain_query: "READ",
  repo_scan: "READ",
  static_analysis: "READ",
  file_inventory: "READ",
  schema_validation: "READ",
  policy_lint: "READ",
  github_public_read_only_research: "READ",

  write_module: "WRITE_LANE",
  fix_bug: "WRITE_LANE",
  allowed_path_code_patch: "WRITE_LANE",
  local_test_generation: "WRITE_LANE",
  local_runtime_artifact_write: "WRITE_LANE",
  governance_doc_write: "WRITE_LANE",
  build_scaffold: "WRITE_LANE",

  design_architecture: "PLAN",
  review_design: "PLAN",
  goal_define: "PLAN",
  mission_create: "PLAN",
  brainstorm_deliberate: "PLAN",

  run_tests: "VALIDATE",
  run_lint: "VALIDATE",
  validate: "VALIDATE",

  integrate_patches: "INTEGRATE",
  stage_commit: "COMMIT",

  // Plugin/agent lane operations (safe within .hermes/ lanes)
  build: "WRITE_LANE",
  write_module: "WRITE_LANE",
  build_scaffold: "WRITE_LANE",

  // Intent/task classification (safe — local file read + analysis)
  classify: "VALIDATE",
  policy_enforce: "VALIDATE",

  // Dangerous / forbidden defaults
  dependency_install: "EXTERNAL",
  model_download: "EXTERNAL",
  gpu_inference: "EXTERNAL",
  external_network_write: "EXTERNAL",
  generic_push: "PUSH",
  generic_deploy: "DEPLOY",
  production_deploy: "DEPLOY",
  destructive_filesystem_mutation: "DESTROY",
  broad_filesystem_mutation: "DESTROY",
};

// Lane-aware overrides: certain actions are safer within bounded plugin lanes
// and get upgraded from EXTERNAL → WRITE_LANE / VALIDATE.
const LANE_ACTION_UPGRADES: Array<{
  lanePattern: string;
  actionUpgrades: Record<string, ActionClass>;
}> = [
  {
    lanePattern: ".hermes/hermes-agent/plugins/",
    actionUpgrades: {
      build: "WRITE_LANE",
      classify: "VALIDATE",
      verify: "VALIDATE",
      policy_enforce: "VALIDATE",
    },
  },
  {
    lanePattern: "tests/",
    actionUpgrades: {
      verify: "VALIDATE",
      build: "WRITE_LANE",
    },
  },
];

export function resolveActionClass(
  action: string,
  lane?: string,
): ActionClass {
  const base = ACTION_TO_CLASS[action] ?? "EXTERNAL";

  if (!lane) return base;

  for (const upgrade of LANE_ACTION_UPGRADES) {
    if (lane.startsWith(upgrade.lanePattern)) {
      const upgraded = upgrade.actionUpgrades[action];
      if (upgraded) return upgraded;
    }
  }

  return base;
}

export function resolveTier(actionClass: ActionClass): TierRule {
  const rule = TIER_RULES.find((r) => r.actionClass === actionClass);
  if (!rule) {
    return {
      tier: "X",
      actionClass,
      behavior: "hard_block_and_simulate",
      humanRequired: true,
      examples: ["unknown_action"],
    };
  }
  return rule;
}

export function classifyMessage(msg: A2AMessage): TierRule {
  const actionClass = resolveActionClass(
    msg.action_requested,
    msg.context.lane ?? "",
  );
  return resolveTier(actionClass);
}
