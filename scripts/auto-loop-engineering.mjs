#!/usr/bin/env node
// scripts/auto-loop-engineering.mjs
// Continuous loop engineering: scan → classify → execute → verify → report → cycle
// Runs every 5 minutes via cron

import { LoopEngineeringWorkflow } from '../packages/types/src/loop-engineering-workflow.mjs';

const loop = new LoopEngineeringWorkflow({
  maxCyclesPerRun: 100,
  maxConcurrentAB: 10,
  cycleDelayMs: 50,
  timezone: 'Asia/Bangkok'
});

// Register standard recurring tasks
loop.registerTask({ taskId: 'cron-health-check', action: 'status', dataClass: 'PUBLIC' });
loop.registerTask({ taskId: 'cron-test-runner', action: 'read', dataClass: 'INTERNAL' });
loop.registerTask({ taskId: 'cron-metrics-snapshot', action: 'calc', dataClass: 'PUBLIC' });

async function main() {
  console.log(`[Auto-Loop] Starting cycle at ${new Date().toISOString()}`);
  const result = await loop.runContinuous();

  console.log(`[Auto-Loop] Cycle complete:`, JSON.stringify({
    executed: result.totalExecuted,
    blocked: result.totalBlocked,
    receipts: result.totalReceipts,
    chainValid: loop.verifyChain().valid
  }, null, 2));

  // Print status
  const status = loop.getStatus();
  console.log(`[Auto-Loop] Status:`, JSON.stringify(status, null, 2));
}

main().catch(err => {
  console.error('[Auto-Loop] FATAL:', err.message);
  process.exit(1);
});