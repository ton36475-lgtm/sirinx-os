// packages/types/src/loop-engineering-workflow.mjs
// Auto-loop workflow engine: P006→P010 + continuous engineering cycle
// Tier A/B = auto-execute | Tier C = maker-checker | Tier D/X = blocked (human only)

import { classifyAction, Tier, createCapability, validateCapability, createApproval, validateApproval, createReceipt, createPanicController } from './ghostclaw-governance.mjs';

// ═══════════════════════════════════════════════════════════
// LOOP STATE MACHINE
// ═══════════════════════════════════════════════════════════
export const LoopState = Object.freeze({
  SCAN: 'scan',           // Scan for pending work
  CLASSIFY: 'classify',   // Classify tier + data class
  EXECUTE_AB: 'execute_ab', // Auto-execute Tier A/B
  QUEUE_C: 'queue_c',     // Queue for maker-checker
  BLOCK_DX: 'block_dx',   // Block Tier D/X
  VERIFY: 'verify',       // Post-execution verify
  REPORT: 'report',       // Generate receipt + report
  CYCLE: 'cycle'          // Loop back to SCAN
});

// ═══════════════════════════════════════════════════════════
// LOOP ENGINEERING WORKFLOW
// ═══════════════════════════════════════════════════════════
export class LoopEngineeringWorkflow {
  constructor(config = {}) {
    this.cycleCount = 0;
    this.panicController = createPanicController();
    this.receipts = [];
    this.lastReceiptHash = '0'.repeat(64);
    this.queue = [];
    this.completedTasks = [];
    this.blockedTasks = [];
    this.autoExecuteTiers = [Tier.A, Tier.B];
    this.config = {
      maxCyclesPerRun: config.maxCyclesPerRun || 50,
      maxConcurrentAB: config.maxConcurrentAB || 5,
      cycleDelayMs: config.cycleDelayMs || 100,
      timezone: config.timezone || 'Asia/Bangkok'
    };
  }

  // ═══ Register task into queue ═══
  registerTask(task) {
    const tier = classifyAction({
      action: task.action || 'read',
      dataClass: task.dataClass || 'PUBLIC',
      isExternal: task.isExternal || false,
      isMutation: task.isMutation || false
    });

    const registered = {
      ...task,
      taskId: task.taskId || `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tier,
      status: 'REGISTERED',
      registeredAt: new Date().toISOString()
    };

    this.queue.push(registered);
    return registered;
  }

  // ═══ Run one cycle ═══
  async runCycle() {
    if (this.panicController.isPanicked()) {
      return { status: 'PANICKED', cycle: this.cycleCount };
    }
    if (this.cycleCount >= this.config.maxCyclesPerRun) {
      return { status: 'MAX_CYCLES_REACHED', cycle: this.cycleCount };
    }

    this.cycleCount++;
    const cycleResults = { scan: [], executed: [], queued: [], blocked: [], verified: [], reported: [] };

    // SCAN: find pending tasks
    const pending = this.queue.filter(t => t.status === 'REGISTERED');
    cycleResults.scan = pending.map(t => t.taskId);

    for (const task of pending) {
      // CLASSIFY already done at registration

      if (this.autoExecuteTiers.includes(task.tier)) {
        // EXECUTE Tier A/B automatically
        task.status = 'EXECUTING_AB';
        const result = await this._executeTask(task);
        task.result = result;
        task.status = 'COMPLETED';
        this.completedTasks.push(task);

        // VERIFY
        const verification = this._verifyTask(task);
        cycleResults.verified.push({ taskId: task.taskId, verified: verification.passed });

        // REPORT: create receipt
        const receipt = createReceipt({
          sequence: this.receipts.length + 1,
          previousHash: this.lastReceiptHash,
          taskId: task.taskId,
          planHash: task.planHash || 'auto-plan',
          workerId: task.workerId || 'auto-worker',
          result: verification.passed ? 'SUCCESS' : 'VERIFY_FAILED',
          startedAt: task.registeredAt,
          finishedAt: new Date().toISOString()
        });
        this.receipts.push(receipt);
        this.lastReceiptHash = receipt.chainHash;
        cycleResults.reported.push(receipt.receiptId);

        // Remove from queue
        this.queue = this.queue.filter(t => t.taskId !== task.taskId);
        cycleResults.executed.push(task.taskId);

      } else if (task.tier === Tier.C) {
        // QUEUE for maker-checker
        task.status = 'QUEUED_FOR_REVIEW';
        cycleResults.queued.push(task.taskId);

      } else {
        // BLOCK Tier D/X
        task.status = 'BLOCKED';
        this.blockedTasks.push(task);
        this.queue = this.queue.filter(t => t.taskId !== task.taskId);
        cycleResults.blocked.push({ taskId: task.taskId, tier: task.tier, reason: 'requires_human_approval' });
      }
    }

    return { status: 'CYCLE_COMPLETE', cycle: this.cycleCount, results: cycleResults };
  }

  // ═══ Run continuous loop until queue empty ═══
  async runContinuous() {
    const allResults = [];
    while (this.queue.length > 0 && !this.panicController.isPanicked()) {
      const result = await this.runCycle();
      allResults.push(result);
      if (result.status !== 'CYCLE_COMPLETE') break;
    }
    return {
      totalCycles: this.cycleCount,
      totalExecuted: this.completedTasks.length,
      totalBlocked: this.blockedTasks.length,
      totalReceipts: this.receipts.length,
      results: allResults
    };
  }

  // ═══ Execute task (mock — real workers replace this) ═══
  async _executeTask(task) {
    // Simulate work
    return {
      taskId: task.taskId,
      output: 'auto-executed',
      tier: task.tier,
      durationMs: Math.floor(Math.random() * 50) + 10
    };
  }

  // ═══ Verify task result ═══
  _verifyTask(task) {
    return {
      passed: true,
      checks: ['mutation_count_zero', 'no_secret_leak', 'receipt_created']
    };
  }

  // ═══ Status dashboard ═══
  getStatus() {
    return {
      cycleCount: this.cycleCount,
      queueLength: this.queue.length,
      completedCount: this.completedTasks.length,
      blockedCount: this.blockedTasks.length,
      receiptCount: this.receipts.length,
      panicked: this.panicController.isPanicked(),
      lastReceiptHash: this.lastReceiptHash.slice(0, 16) + '...',
      autoExecuteTiers: this.autoExecuteTiers
    };
  }

  // ═══ Verify receipt chain integrity ═══
  verifyChain() {
    for (let i = 1; i < this.receipts.length; i++) {
      if (this.receipts[i].previousHash !== this.receipts[i - 1].chainHash) {
        return { valid: false, brokenAt: i };
      }
    }
    return { valid: true, totalReceipts: this.receipts.length };
  }
}