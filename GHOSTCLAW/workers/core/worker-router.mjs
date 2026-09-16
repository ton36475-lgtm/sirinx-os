/**
 * GHOSTCLAW Worker Router
 *
 * Routes messages between workers based on registry capabilities.
 * Uses the worker registry to determine which workers are eligible
 * to receive a given message (by capability or action class).
 *
 * ES Module — import/export syntax.
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Registry Loading ──────────────────────────────────────────────

function loadRegistry() {
  const registryPath = join(__dirname, '..', 'registry', 'worker-registry.json');
  return JSON.parse(readFileSync(registryPath, 'utf-8'));
}

// ─── Router ─────────────────────────────────────────────────────────

class WorkerRouter {
  constructor() {
    this.registry = loadRegistry();
    this.capabilityIndex = new Map();   // capability -> workerId[]
    this.actionIndex = new Map();       // action -> workerId[]
    this.roleIndex = new Map();         // role -> workerId[]
    this.modelLaneIndex = new Map();    // modelLane -> workerId[]

    this._buildIndices();
  }

  _buildIndices() {
    for (const worker of this.registry.workers) {
      // Index by capabilities
      for (const cap of worker.capabilities) {
        if (!this.capabilityIndex.has(cap)) {
          this.capabilityIndex.set(cap, []);
        }
        this.capabilityIndex.get(cap).push(worker.id);
      }

      // Index by allowed actions
      for (const action of worker.allowed_actions) {
        if (!this.actionIndex.has(action)) {
          this.actionIndex.set(action, []);
        }
        this.actionIndex.get(action).push(worker.id);
      }

      // Index by role
      if (!this.roleIndex.has(worker.role)) {
        this.roleIndex.set(worker.role, []);
      }
      this.roleIndex.get(worker.role).push(worker.id);

      // Index by model lane
      if (!this.modelLaneIndex.has(worker.model_lane)) {
        this.modelLaneIndex.set(worker.model_lane, []);
      }
      this.modelLaneIndex.get(worker.model_lane).push(worker.id);
    }
  }

  /**
   * Route a message to the appropriate worker(s) based on its action_class
   * or capability.
   * @param {Object} message - The message to route.
   * @param {string} [message.worker_id] - Explicit target worker.
   * @param {string} [message.action_class] - Action to match.
   * @param {string} [message.to_agent] - Target agent for mutual approval routing.
   * @returns {string[]} Worker IDs that can handle this message.
   */
  route(message) {
    // If explicit worker_id is provided, validate and return it
    if (message.worker_id) {
      const worker = this.registry.workers.find(w => w.id === message.worker_id);
      if (worker) {
        if (message.action_class && worker.blocked_actions.includes(message.action_class)) {
          console.error(
            `[router] Worker "${message.worker_id}" has blocked action: ${message.action_class}`
          );
          return [];
        }
        return [message.worker_id];
      }
      console.error(`[router] Unknown worker_id: ${message.worker_id}`);
      return [];
    }

    // Route by action_class
    if (message.action_class) {
      const candidates = this.actionIndex.get(message.action_class) || [];

      // Filter out workers with blocked actions
      const eligible = candidates.filter(workerId => {
        const worker = this.registry.workers.find(w => w.id === workerId);
        if (!worker) return false;
        if (worker.blocked_actions.includes(message.action_class)) return false;
        return true;
      });

      if (eligible.length > 0) return eligible;
    }

    // Fallback: route by message_type → capability mapping
    const typeToCapability = {
      request: 'planning',
      response: 'code_generation',
      heartbeat: 'heartbeat',
      receipt: 'receipt_storage',
      approval: 'mutual_approval',
      rejection: 'mutual_approval',
      evidence: 'evidence_verification',
      error: 'policy_enforcement'
    };

    const fallbackCap = typeToCapability[message.message_type];
    if (fallbackCap) {
      return this.capabilityIndex.get(fallbackCap) || [];
    }

    return [];
  }

  /**
   * Find workers that have a specific capability.
   * @param {string} capability
   * @returns {string[]}
   */
  findByCapability(capability) {
    return this.capabilityIndex.get(capability) || [];
  }

  /**
   * Find workers that can perform a specific action.
   * @param {string} action
   * @returns {string[]}
   */
  findByAction(action) {
    return this.actionIndex.get(action) || [];
  }

  /**
   * Find workers by role.
   * @param {string} role
   * @returns {string[]}
   */
  findByRole(role) {
    return this.roleIndex.get(role) || [];
  }

  /**
   * Find workers by model lane.
   * @param {string} modelLane
   * @returns {string[]}
   */
  findByModelLane(modelLane) {
    return this.modelLaneIndex.get(modelLane) || [];
  }

  /**
   * Validate that a routing decision respects the mutual approval constraint:
   * the receiving worker must not approve its own output.
   * For approval messages, ensure from_agent !== to_agent.
   * @param {Object} message
   * @returns {{valid: boolean, reason?: string}}
   */
  validateApprovalConstraint(message) {
    const { from_agent, to_agent, autonomous_approval, requester_agent, approver_agent } = message;

    if (from_agent && to_agent && from_agent === to_agent) {
      return {
        valid: false,
        reason: `Self-routing detected: from_agent "${from_agent}" === to_agent "${to_agent}". Mutually exclusive approval required.`
      };
    }

    if (requester_agent && approver_agent && requester_agent === approver_agent) {
      return {
        valid: false,
        reason: `Self-approval detected: requester "${requester_agent}" === approver "${approver_agent}". Autonomous mutual approval required.`
      };
    }

    if (autonomous_approval && autonomous_approval.self_approval === true) {
      return {
        valid: false,
        reason: 'autonomous_approval.self_approval must never be true under GHOSTCLAW policy.'
      };
    }

    return { valid: true };
  }

  /**
   * Get the full routing table as a plain object (for debugging / introspection).
   * @returns {Object}
   */
  getRoutingTable() {
    return {
      byCapability: Object.fromEntries(this.capabilityIndex),
      byAction: Object.fromEntries(this.actionIndex),
      byRole: Object.fromEntries(this.roleIndex),
      byModelLane: Object.fromEntries(this.modelLaneIndex)
    };
  }
}

// ─── Export ────────────────────────────────────────────────────────

export { WorkerRouter };
export default WorkerRouter;