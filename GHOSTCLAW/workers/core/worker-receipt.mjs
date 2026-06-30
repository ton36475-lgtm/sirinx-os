/**
 * GHOSTCLAW Worker Receipt Writer
 *
 * Writes a receipt for every worker action to the
 * .ghostclaw_runtime/a2a2a/receipt/ directory.
 * Each receipt is a JSON artifact containing: task_id, worker_id, action,
 * timestamp, approver_agent, requester_agent, quoted output, evidence pack.
 *
 * ES Module — import/export syntax.
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Receipt Directory Resolution ───────────────────────────────────

/**
 * Resolve the receipt directory.
 * Walks upward from this file's location if .ghostclaw_runtime is found,
 * otherwise defaults to a safe relative path.
 * @returns {string}
 */
function resolveReceiptDir() {
  // Walk up from __dirname to find .ghostclaw_runtime
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    const candidate = join(dir, '.ghostclaw_runtime', 'a2a2a', 'receipt');
    if (existsSync(candidate)) return candidate;

    const runtimeCandidate = join(dir, '.ghostclaw_runtime');
    if (existsSync(runtimeCandidate)) {
      const receiptDir = join(runtimeCandidate, 'a2a2a', 'receipt');
      mkdirSync(receiptDir, { recursive: true });
      return receiptDir;
    }

    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  // Fallback: create relative to repo root assumption
  const fallback = join(__dirname, '..', '..', '..', '.ghostclaw_runtime', 'a2a2a', 'receipt');
  mkdirSync(fallback, { recursive: true });
  return fallback;
}

// ─── Receipt Writer ─────────────────────────────────────────────────

class WorkerReceipt {
  constructor() {
    this.receiptDir = resolveReceiptDir();
    this.receiptIndex = 0;
    /** @type {Map<string, Object>} - receiptId -> receipt */
    this.inMemoryIndex = new Map();
  }

  /**
   * Generate a unique receipt ID.
   * @param {string} workerId
   * @param {string} taskId
   * @returns {string}
   */
  _generateReceiptId(workerId, taskId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    return `receipt-${workerId}-${taskId}-${timestamp}-${random}`;
  }

  /**
   * Compute a SHA-256 hash of the receipt content (for tamper detection).
   * @param {Object} receipt
   * @returns {string}
   */
  _hashReceipt(receipt) {
    const content = JSON.stringify(receipt, Object.keys(receipt).sort());
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Write a receipt for a worker action.
   * @param {Object} params
   * @param {string} params.workerId - The worker that performed the action.
   * @param {string} params.taskId - The task associated with this action.
   * @param {string} params.action - The action that was performed.
   * @param {string} params.requesterAgent - Agent that requested the action.
   * @param {string} params.approverAgent - Agent that approved the action.
   * @param {Object} [params.payload] - Input payload for the action.
   * @param {Object} [params.output] - Output produced by the action.
   * @param {Object} [params.evidencePack] - Evidence pack (artifacts, verification data).
   * @param {string} params.decisionId - Decision ID for the approving action.
   * @param {boolean} [params.receiptRequired=true] - Must remain true for worker actions.
   * @param {string} [params.correlationId] - Correlation ID for tracing.
   * @param {string} [params.phase] - Workflow phase.
   * @returns {Object} The written receipt (with receipt_id and file_path).
   */
  write(params) {
    const {
      workerId,
      taskId,
      action,
      requesterAgent,
      approverAgent,
      payload = null,
      output = null,
      evidencePack = null,
      decisionId,
      receiptRequired = true,
      correlationId = null,
      phase = null
    } = params;

    if (!workerId || !taskId || !action || !decisionId) {
      throw new Error('Receipt requires workerId, taskId, action, and decisionId');
    }

    if (!requesterAgent || !approverAgent) {
      throw new Error('Receipt requires requesterAgent and approverAgent');
    }

    if (!evidencePack || typeof evidencePack !== 'object') {
      throw new Error('Receipt requires evidencePack');
    }

    if (receiptRequired !== true) {
      throw new Error('Worker action receipts require receiptRequired=true');
    }

    // Enforce mutual approval constraint
    if (requesterAgent && approverAgent && requesterAgent === approverAgent) {
      throw new Error(
        `Self-approval detected in receipt write: requester "${requesterAgent}" === approver "${approverAgent}". ` +
        'GHOSTCLAW requires autonomous mutual approval — no self-approval.'
      );
    }

    const receiptId = this._generateReceiptId(workerId, taskId);
    const timestamp = new Date().toISOString();

    const receipt = {
      receipt_id: receiptId,
      task_id: taskId,
      decision_id: decisionId,
      worker_id: workerId,
      action: action,
      requester_agent: requesterAgent || null,
      approver_agent: approverAgent || null,
      self_approval_allowed: false,
      receipt_required: true,
      payload: payload,
      output: output,
      evidence_pack: evidencePack,
      correlation_id: correlationId,
      phase: phase,
      timestamp: timestamp,
      canonical_terminology: {
        brainstorm: 'canonical',
        beststorm: 'legacy alias — not emitted',
        beststrom: 'invalid typo — not emitted'
      }
    };

    // Compute hash for integrity
    receipt.content_hash = this._hashReceipt({ ...receipt, content_hash: undefined });

    // Write to file
    const fileName = `${receiptId}.json`;
    const filePath = join(this.receiptDir, fileName);
    mkdirSync(this.receiptDir, { recursive: true });
    writeFileSync(filePath, JSON.stringify(receipt, null, 2) + '\n', 'utf-8');

    // Track in memory index
    this.inMemoryIndex.set(receiptId, { ...receipt, file_path: filePath });
    this.receiptIndex++;

    console.log(`[receipt] Written: ${filePath}`);
    console.log(`[receipt] receipt_id=${receiptId} task_id=${taskId} worker=${workerId} action=${action}`);

    return {
      receipt_id: receiptId,
      file_path: filePath,
      task_id: taskId,
      worker_id: workerId,
      timestamp: timestamp,
      content_hash: receipt.content_hash
    };
  }

  /**
   * Retrieve a receipt by ID from the in-memory index.
   * @param {string} receiptId
   * @returns {Object|null}
   */
  get(receiptId) {
    return this.inMemoryIndex.get(receiptId) || null;
  }

  /**
   * Get all receipt IDs in the in-memory index.
   * @returns {string[]}
   */
  listReceiptIds() {
    return Array.from(this.inMemoryIndex.keys());
  }

  /**
   * Get the receipt directory path.
   * @returns {string}
   */
  getReceiptDir() {
    return this.receiptDir;
  }
}

// ─── Export ────────────────────────────────────────────────────────

export { WorkerReceipt };
export default WorkerReceipt;
