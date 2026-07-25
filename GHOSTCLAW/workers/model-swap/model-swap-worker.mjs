/**
 * GHOSTCLAW Model Swap Worker
 * Phase 6
 *
 * Performs metadata-only model swaps between lanes.
 *
 * Hard constraints (from model-swap-policy.yaml):
 *   - No live provider calls
 *   - No API key reads
 *   - No .env reads
 *   - No model downloads
 *   - No GPU inference
 *   - action_tier_cap remains final authority
 *   - D/X actions auto-blocked
 *   - Receipt required for every swap
 */

import { randomUUID } from 'node:crypto';
import { ModelRouter } from '../../models/model-router.mjs';

/**
 * @typedef {Object} SwapReceipt
 * @property {string} swap_id
 * @property {string} timestamp
 * @property {string} from_model
 * @property {string} to_model
 * @property {string} task_type
 * @property {string} triggered_by
 * @property {string} policy_version
 * @property {string} action_tier_cap_version
 * @property {string} approved_by
 * @property {string} receipt_hash
 * @property {boolean} blocked
 */

const POLICY_VERSION = '1.0.0';
const ACTION_TIER_CAP_VERSION = '2.0.0';

/**
 * ModelSwapWorker — performs metadata-only model lane swaps.
 */
export class ModelSwapWorker {
  /**
   * @param {Object} [opts]
   * @param {ModelRouter} [opts.router] - Configured model router
   */
  constructor(opts = {}) {
    this.router = opts.router || new ModelRouter();
    this.currentModel = null;
  }

  /**
   * Resolve the current model for a task (sets initial model).
   * @param {string} taskType
   * @returns {SwapReceipt}
   */
  resolve(taskType) {
    return this._route(taskType, 'resolve');
  }

  /**
   * Swap the model for a given task type.
   * @param {string} taskType
   * @param {string} triggeredBy - Agent that triggered the swap
   * @returns {SwapReceipt}
   */
  swap(taskType, triggeredBy = 'system') {
    return this._route(taskType, 'swap', triggeredBy);
  }

  /**
   * Internal router — delegates to ModelRouter and generates a receipt.
   * @private
   */
  _route(taskType, action, triggeredBy = 'system') {
    const result = this.router.route(taskType);

    if (result.blocked) {
      return this._generateReceipt({
        from_model: this.currentModel || 'none',
        to_model: 'none',
        task_type: taskType,
        triggered_by: triggeredBy,
        blocked: true,
        reason: result.reason,
      });
    }

    const targetModel = result.lane.model;

    const receipt = this._generateReceipt({
      from_model: this.currentModel || 'none',
      to_model: targetModel,
      task_type: taskType,
      triggered_by: triggeredBy,
      blocked: false,
      approved_by: 'auto_approve_tier_A',
    });

    this.currentModel = targetModel;

    return receipt;
  }

  /**
   * Generate a swap receipt.
   * @private
   */
  _generateReceipt({ from_model, to_model, task_type, triggered_by, blocked, approved_by, reason }) {
    const swap_id = `MS-${randomUUID()}`;
    const timestamp = new Date().toISOString();

    const base = {
      swap_id,
      timestamp,
      from_model,
      to_model,
      task_type,
      triggered_by,
      policy_version: POLICY_VERSION,
      action_tier_cap_version: ACTION_TIER_CAP_VERSION,
      approved_by: approved_by || 'auto_block',
      blocked: blocked ?? false,
    };

    if (reason) {
      base.reason = reason;
    }

    base.receipt_hash = this._hash(swap_id, timestamp, to_model, task_type);

    return base;
  }

  /**
   * Simple deterministic hash (not cryptographic — for receipt integrity only).
   * @private
   */
  _hash(...parts) {
    const str = parts.join('|');
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32-bit integer
    }

    return `h${Math.abs(hash).toString(16)}`;
  }
}

export default ModelSwapWorker;