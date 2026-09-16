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

import { createEngine } from '../agents/auto-approve-engine.mjs';
import { ProviderHealthCheck } from './provider-health.mjs';

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
   * @param {import('../agents/auto-approve-engine.mjs').AutoApproveEngine} [opts.policyGate] - action_tier_cap gate
   * @param {ProviderHealthCheck} [opts.providerHealth] - Metadata-only provider health stub
   * @param {boolean} [opts.respectProviderHealth] - If true, unavailable target provider falls back
   */
  constructor(opts = {}) {
    this.lanes = opts.lanes
      ? { ...DEFAULT_LANES, ...opts.lanes }
      : { ...DEFAULT_LANES };

    this.fallbackLane = { ...FALLBACK_LANE };
    this.policyGate = opts.policyGate || createEngine();
    this.providerHealth = opts.providerHealth || new ProviderHealthCheck();
    this.respectProviderHealth = opts.respectProviderHealth === true;
  }

  /**
   * Inspect action_tier_cap for a known action class. Unknown lane names are not
   * reclassified as D, so they can still use the safe fallback lane.
   * @param {string} actionClass
   * @returns {{ known: boolean, canonical_action_class: string, tier: string|null, blocked: boolean }}
   */
  getPolicyDecision(actionClass) {
    const canonical = this.policyGate.getCanonicalActionClass(actionClass);
    const tierMap = this.policyGate.policy?.action_tier_cap || {};
    const known = Object.prototype.hasOwnProperty.call(tierMap, canonical);
    const tier = known ? this.policyGate.getActionTierCap(actionClass) : null;

    return {
      known,
      canonical_action_class: canonical,
      tier,
      blocked: tier === 'D' || tier === 'X',
    };
  }

  /**
   * Check whether a known action class is blocked by action_tier_cap.
   * @param {string} actionClass
   * @returns {boolean}
   */
  isBlocked(actionClass) {
    return this.getPolicyDecision(actionClass).blocked;
  }

  /**
   * Resolve a lane with metadata-only provider health fallback.
   * @param {ModelLane} lane
   * @returns {{ lane: ModelLane, provider_health?: object, fallback_applied: boolean, reason?: string }}
   */
  resolveProviderFallback(lane, respectProviderHealth = this.respectProviderHealth) {
    if (!respectProviderHealth) {
      return { lane, fallback_applied: false };
    }

    const providerHealth = this.providerHealth.check(lane.provider);
    if (providerHealth.healthy !== false) {
      return { lane, provider_health: providerHealth, fallback_applied: false };
    }

    return {
      lane: this.fallbackLane,
      provider_health: providerHealth,
      fallback_applied: true,
      reason: `Provider "${lane.provider}" unavailable in metadata health stub — routed to fallback lane: ${this.fallbackLane.model}`,
    };
  }

  /**
   * Route a task to its model lane.
   *
   * @param {string} taskType - The task type key (e.g. "code_patch", "architecture")
   * @param {object} [opts]
   * @param {string} [opts.actionClass] - Explicit action class for policy gate checks
   * @param {boolean} [opts.respectProviderHealth] - Override provider health fallback behavior
   * @returns {{ blocked: boolean, lane?: ModelLane, task_type: string, reason?: string }}
   */
  route(taskType, opts = {}) {
    const actionClass = opts.actionClass || taskType;
    const policy = this.getPolicyDecision(actionClass);

    // Auto-block known D/X action classes — no routing occurs
    if (policy.blocked) {
      return {
        blocked: true,
        task_type: taskType,
        action_class: actionClass,
        policy_gate: policy,
        reason: `Action class "${policy.canonical_action_class}" is blocked (tier ${policy.tier}). action_tier_cap is final authority.`,
      };
    }

    const lane = this.lanes[taskType];
    const respectProviderHealth = typeof opts.respectProviderHealth === 'boolean'
      ? opts.respectProviderHealth
      : this.respectProviderHealth;

    if (lane) {
      const providerResolved = this.resolveProviderFallback(lane, respectProviderHealth);
      return {
        blocked: false,
        task_type: taskType,
        action_class: actionClass,
        policy_gate: policy,
        lane: providerResolved.lane,
        provider_health: providerResolved.provider_health,
        fallback_applied: providerResolved.fallback_applied,
        reason: providerResolved.reason,
      };
    }

    // Unknown task type → fallback
    return {
      blocked: false,
      task_type: taskType,
      action_class: actionClass,
      policy_gate: policy,
      lane: this.fallbackLane,
      fallback_applied: true,
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
