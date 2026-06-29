/**
 * GHOSTCLAW Worker Runtime
 *
 * Loads the worker registry, dispatches messages to workers,
 * tracks per-worker state, and enforces autonomous mutual approval
 * (Hermes approves Codex, Codex approves Hermes — no self-approval).
 *
 * ES Module — import/export syntax.
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Registry Loading ──────────────────────────────────────────────

/**
 * Load the worker registry from the sibling registry directory.
 * @returns {Object} The parsed registry JSON.
 */
export function loadRegistry() {
  const registryPath = join(__dirname, '..', 'registry', 'worker-registry.json');
  const raw = readFileSync(registryPath, 'utf-8');
  const registry = JSON.parse(raw);

  // Enforce no-self-approval invariant at load time
  for (const worker of registry.workers) {
    if (worker.self_approval_allowed !== false) {
      throw new Error(
        `Worker "${worker.id}" has self_approval_allowed !== false. ` +
        'GHOSTCLAW policy requires autonomous mutual approval — no self-approval.'
      );
    }
    if (worker.blocked_actions && !worker.blocked_actions.includes('self_approval')) {
      worker.blocked_actions.push('self_approval');
    }
  }

  return registry;
}

// ─── Worker State ──────────────────────────────────────────────────

/**
 * Per-worker runtime state.
 * @typedef {Object} WorkerState
 * @property {string} workerId
 * @property {string} status - idle | busy | error | stopped
 * @property {number} tasksCompleted
 * @property {number} tasksFailed
 * @property {number} lastHeartbeat
 * @property {Object|null} currentTask
 */

class WorkerRuntime {
  constructor() {
    this.registry = loadRegistry();
    this.workers = new Map();       // workerId -> registry entry
    this.workerStates = new Map();   // workerId -> WorkerState
    this.messageQueue = [];
    this.routingTable = new Map();   // actionClass -> workerId[]

    this._indexRegistry();
  }

  _indexRegistry() {
    for (const worker of this.registry.workers) {
      this.workers.set(worker.id, worker);

      this.workerStates.set(worker.id, {
        workerId: worker.id,
        status: 'idle',
        tasksCompleted: 0,
        tasksFailed: 0,
        lastHeartbeat: 0,
        currentTask: null
      });

      for (const action of worker.allowed_actions) {
        if (!this.routingTable.has(action)) {
          this.routingTable.set(action, []);
        }
        this.routingTable.get(action).push(worker.id);
      }
    }
  }

  /**
   * Get a worker definition by ID.
   * @param {string} workerId
   * @returns {Object|null}
   */
  getWorker(workerId) {
    return this.workers.get(workerId) || null;
  }

  /**
   * Get all workers that have a given capability.
   * @param {string} capability
   * @returns {Object[]}
   */
  getWorkersByCapability(capability) {
    return this.registry.workers.filter(w => w.capabilities.includes(capability));
  }

  /**
   * Get all workers that can perform a given action.
   * @param {string} action
   * @returns {string[]}
   */
  getWorkersForAction(action) {
    return this.routingTable.get(action) || [];
  }

  /**
   * Validate that a worker is allowed to perform an action.
   * @param {string} workerId
   * @param {string} action
   * @returns {boolean}
   */
  canPerformAction(workerId, action) {
    const worker = this.getWorker(workerId);
    if (!worker) return false;
    if (worker.blocked_actions.includes(action)) return false;
    if (worker.blocked_actions.includes('self_approval') && action === 'self_approval') return false;
    return worker.allowed_actions.includes(action);
  }

  /**
   * Validate autonomous mutual approval: approver must differ from requester.
   * @param {string} requesterAgent
   * @param {string} approverAgent
   * @returns {boolean}
   */
  validateMutualApproval(requesterAgent, approverAgent) {
    if (!requesterAgent || !approverAgent) return false;
    if (requesterAgent === approverAgent) {
      throw new Error(
        `Self-approval detected: requester "${requesterAgent}" === approver "${approverAgent}". ` +
        'GHOSTCLAW requires autonomous mutual approval — approver must differ from requester.'
      );
    }
    return true;
  }

  /**
   * Enqueue a message for dispatch.
   * @param {Object} message
   */
  enqueue(message) {
    this.messageQueue.push(message);
  }

  /**
   * Dispatch the next message in the queue.
   * Returns the dispatched message or null if queue is empty.
   * @returns {Object|null}
   */
  dispatchNext() {
    if (this.messageQueue.length === 0) return null;

    const message = this.messageQueue.shift();
    const worker = this.getWorker(message.worker_id);

    if (!worker) {
      console.error(`[runtime] Unknown worker_id: ${message.worker_id}`);
      return null;
    }

    // Check action is allowed
    if (message.action_class && !this.canPerformAction(message.worker_id, message.action_class)) {
      console.error(
        `[runtime] Worker "${message.worker_id}" cannot perform action "${message.action_class}"`
      );
      return null;
    }

    // Check mutual approval if approval fields are present
    if (message.autonomous_approval || (message.requester_agent && message.approver_agent)) {
      this.validateMutualApproval(message.requester_agent, message.approver_agent);
    }

    // Update worker state
    const state = this.workerStates.get(message.worker_id);
    if (state) {
      state.status = 'busy';
      state.currentTask = message;
    }

    console.log(
      `[runtime] Dispatched task_id=${message.task_id} ` +
      `to worker=${message.worker_id} ` +
      `action=${message.action_class || 'N/A'}`
    );

    return message;
  }

  /**
   * Mark a worker's current task as completed.
   * @param {string} workerId
   * @param {boolean} success
   */
  completeTask(workerId, success = true) {
    const state = this.workerStates.get(workerId);
    if (!state) return;

    state.currentTask = null;
    state.status = 'idle';

    if (success) {
      state.tasksCompleted++;
    } else {
      state.tasksFailed++;
      state.status = 'error';
    }
  }

  /**
   * Get the current state of a worker.
   * @param {string} workerId
   * @returns {WorkerState|null}
   */
  getWorkerState(workerId) {
    return this.workerStates.get(workerId) || null;
  }

  /**
   * Get a summary of all worker states.
   * @returns {Object[]}
   */
  getAllWorkerStates() {
    return Array.from(this.workerStates.values());
  }

  /**
   * List all registered worker IDs.
   * @returns {string[]}
   */
  listWorkerIds() {
    return Array.from(this.workers.keys());
  }
}

// ─── Export ────────────────────────────────────────────────────────

export { WorkerRuntime };
export default WorkerRuntime;