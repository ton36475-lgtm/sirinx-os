/**
 * GHOSTCLAW Model Auto Swap Router
 * Phase 6 — ModelRouter
 *
 * Routes tasks to model lanes based on task type.
 * This router is metadata-only: it makes NO live provider calls,
 * reads NO API keys, reads NO .env files, downloads NO models,
 * and runs NO GPU inference.
 *
 * The action_tier_cap policy (GHOSTCLAW/policies/action-tier-cap.yaml)
 * remains final authority over all routing decisions. The router
 * does not override policy gates.
 */

/**
 * @typedef {Object} ModelLane
 * @property {string} model - Model registry key
 * @property {string} display_name - Human-readable model name
 * @property {string} role - Model role
 * @property {string} provider - Provider name
 */

/** Default lane-to-model mapping (Phase 6) */
const DEFAULT_LANES = Object.freeze({
  code_patch: {
    model: 'kimi_k2_7_code',
    display_name: 'Kimi K2.7 Code',
    role: 'coding_tool_use_reference',
    provider: 'moonshot_ai',
  },
  repo_mapping: {
    model: 'glm_5_2_max',
    display_name: 'GLM 5.2 Max',
    role: 'high_throughput_coder',
    provider: 'zhipu_ai',
  },
  architecture: {
    model: 'deepseek_v4_pro',
    display_name: 'DeepSeek V4 Pro',
    role: 'architecture_reasoner',
    provider: 'deepseek',
  },
  final_decision: {
    model: 'gpt_5_5',
    display_name: 'GPT-5.5',
    role: 'final_decision_maker',
    provider: 'openai',
  },
  critic_review: {
    model: 'claude_opus_4_8',
    display_name: 'Claude Opus 4.8',
    role: 'critic_reviewer',
    provider: 'anthropic',
  },
});

/**
 * Action classes that are auto-blocked (tier D and X).
 * No routing occurs for these — the router returns a blocked result.
 * This list mirrors action_tier_cap auto-block tiers.
 */
const BLOCKED_ACTION_CLASSES = Object.freeze([
  // Tier D
  'dependency_install',
  'model_download',
  'gpu_inference',
  'external_network_write',
  // Tier X
  'push',
  'deploy',
  'production_action',
  'secret_access',
  'ambiguous_input',
  'recursive_codex_launch',
  'recursive_moa_launch',
  'kv_only_protocol',
]);

/** Fallback lane used when a task type is not in the default lane map */
const FALLBACK_LANE = Object.freeze({
  model: 'glm_5_2_max',
  display_name: 'GLM 5.2 Max',
  role: 'high_throughput_coder',
  provider: 'zhipu_ai',
});

/**
 * ModelRouter — routes a given task type to the appropriate model lane.
 *
 * Design constraints (from model-swap-policy.yaml):
 *   - No live provider calls
 *   - No API key reads
 *   - No .env reads
 *   - No model downloads
 *   - No GPU inference
 *   - action_tier_cap remains final authority
 *   - D/X action classes are auto-blocked
 */
export class ModelRouter {
  /**
   * @param {Object} [opts]
   * @param {Record<string, ModelLane>} [opts.lanes] - Custom lane mapping
   * @param {string[]} [opts.blockedClasses] - Additional blocked action classes
   */
  constructor(opts = {}) {
    this.lanes = opts.lanes
      ? { ...DEFAULT_LANES, ...opts.lanes }
      : { ...DEFAULT_LANES };

    this.blockedClasses = opts.blockedClasses
      ? [...BLOCKED_ACTION_CLASSES, ...opts.blockedClasses]
      : [...BLOCKED_ACTION_CLASSES];

    this.fallbackLane = { ...FALLBACK_LANE };
  }

  /**
   * Check whether an action class is blocked.
   * @param {string} actionClass
   * @returns {boolean}
   */
  isBlocked(actionClass) {
    return this.blockedClasses.includes(actionClass);
  }

  /**
   * Route a task to its model lane.
   *
   * @param {string} taskType - The task type key (e.g. "code_patch", "architecture")
   * @returns {{ blocked: boolean, lane?: ModelLane, task_type: string, reason?: string }}
   */
  route(taskType) {
    // Auto-block D/X action classes — no routing occurs
    if (this.isBlocked(taskType)) {
      return {
        blocked: true,
        task_type: taskType,
        reason: `Action class "${taskType}" is blocked (tier D/X). action_tier_cap is final authority.`,
      };
    }

    const lane = this.lanes[taskType];

    if (lane) {
      return {
        blocked: false,
        task_type: taskType,
        lane,
      };
    }

    // Unknown task type → fallback
    return {
      blocked: false,
      task_type: taskType,
      lane: this.fallbackLane,
      reason: `Unknown task type "${taskType}" — routed to fallback lane: ${this.fallbackLane.model}`,
    };
  }

  /**
   * List all registered lanes.
   * @returns {Record<string, ModelLane>}
   */
  listLanes() {
    return { ...this.lanes };
  }

  /**
   * Get the fallback lane.
   * @returns {ModelLane}
   */
  getFallback() {
    return { ...this.fallbackLane };
  }
}

export default ModelRouter;