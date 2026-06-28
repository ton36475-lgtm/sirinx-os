const TIER_RANK = Object.freeze({
  X: 0,
  D: 1,
  C: 2,
  B: 3,
  A: 4
});

export const HARD_VIOLATIONS = new Set([
  "secret_access_requested",
  "ambiguous_input",
  "blocked_action_attempted"
]);

export const ACTION_TIER_CAP = Object.freeze({
  read: "A",
  file_read: "A",
  git_status: "A",
  git_diff: "A",
  brain_query: "A",
  mission_status: "A",
  plan: "A",
  report_status: "A",
  validate: "A",
  run_tests: "A",
  run_lint: "A",
  debug_probe: "A",

  brainstorm: "B",
  moa_review: "B",
  write_lane: "B",
  write_module: "B",
  fix_bug: "B",
  refactor: "B",

  integrate: "C",
  integrate_patches: "C",
  update_brain: "C",

  commit: "D",
  stage_commit: "D",
  approve_action: "D",
  dependency_install: "D",

  push: "X",
  deploy: "X",
  external_api_write: "X",
  customer_message_send: "X",
  cloud_mutation: "X",
  secret_access: "X",
  model_download: "X",
  gpu_inference: "X",
  blocked_action: "X"
});

function scoreToTier(cappedScore) {
  if (cappedScore >= 95) return "A";
  if (cappedScore >= 85) return "B";
  if (cappedScore >= 70) return "C";
  if (cappedScore >= 50) return "D";
  return "X";
}

function normalizeNumber(value, label) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw new TypeError(`${label} must be a finite number`);
  }
  return numeric;
}

function normalizeScore(value) {
  return Number(value.toFixed(4));
}

function sumModifiers(modifiers) {
  if (modifiers == null) return 0;
  if (typeof modifiers === "number") return normalizeNumber(modifiers, "standard_modifiers");
  if (Array.isArray(modifiers)) {
    return modifiers.reduce((total, modifier, index) => {
      return total + normalizeNumber(modifier, `standard_modifiers[${index}]`);
    }, 0);
  }
  if (typeof modifiers === "object") {
    return Object.entries(modifiers).reduce((total, [key, modifier]) => {
      return total + normalizeNumber(modifier, `standard_modifiers.${key}`);
    }, 0);
  }
  throw new TypeError("standard_modifiers must be a number, array, or object");
}

function capTier(baseTier, capTierValue) {
  return TIER_RANK[baseTier] > TIER_RANK[capTierValue] ? capTierValue : baseTier;
}

export function computeFinalConfidence(baseBrainstorm, latentBonus = 0, standardModifiers = []) {
  const base_brainstorm = normalizeNumber(baseBrainstorm, "base_brainstorm");
  const latent_bonus = normalizeNumber(latentBonus, "latent_bonus");
  const modifier_total = normalizeScore(sumModifiers(standardModifiers));
  const raw_score = normalizeScore(base_brainstorm + latent_bonus + modifier_total);
  const capped_score = normalizeScore(Math.min(Math.max(raw_score, 0), 100));

  return {
    base_brainstorm,
    latent_bonus,
    modifier_total,
    raw_score,
    capped_score,
    display_score: raw_score
  };
}

export function assignSafeTier(cappedScore, actionClass, violations = []) {
  const capped_score = normalizeNumber(cappedScore, "capped_score");
  const action_class = typeof actionClass === "string" && actionClass.length > 0 ? actionClass : "unknown";
  const normalizedViolations = Array.isArray(violations) ? violations : [violations];
  const base_tier = scoreToTier(capped_score);
  const hardViolation = normalizedViolations.find((violation) => HARD_VIOLATIONS.has(violation));

  if (hardViolation) {
    return {
      base_tier,
      final_tier: "X",
      reason: `hard_violation:${hardViolation}`
    };
  }

  const actionCap = ACTION_TIER_CAP[action_class] ?? "X";
  const final_tier = capTier(base_tier, actionCap);
  const reasonPrefix = ACTION_TIER_CAP[action_class] == null ? "unknown_action_class" : "action_tier_cap";

  return {
    base_tier,
    final_tier,
    reason: `${reasonPrefix}:${action_class}:${actionCap}`
  };
}

export function evaluateAutoApproval({
  base_brainstorm,
  latent_bonus = 0,
  standard_modifiers = [],
  action_class,
  violations = []
}) {
  const confidence = computeFinalConfidence(base_brainstorm, latent_bonus, standard_modifiers);
  const tier = assignSafeTier(confidence.capped_score, action_class, violations);

  return {
    action_class,
    base_tier: tier.base_tier,
    capped_score: confidence.capped_score,
    display_score: confidence.display_score,
    final_tier: tier.final_tier,
    latent_bonus: confidence.latent_bonus,
    modifier_total: confidence.modifier_total,
    raw_score: confidence.raw_score,
    reason: tier.reason
  };
}
