import { describe, it, expect } from 'vitest';
import { LoopEngineeringWorkflow } from '../../packages/types/src/loop-engineering-workflow.mjs';
import { Tier } from '../../packages/types/src/ghostclaw-governance.mjs';

describe('Loop Engineering Workflow', () => {
  it('auto-executes Tier A tasks without human approval', async () => {
    const loop = new LoopEngineeringWorkflow();
    loop.registerTask({ action: 'research', dataClass: 'PUBLIC', taskId: 't-a1' });
    const result = await loop.runContinuous();
    expect(result.totalExecuted).toBe(1);
    expect(result.totalBlocked).toBe(0);
  });

  it('auto-executes Tier B tasks without human approval', async () => {
    const loop = new LoopEngineeringWorkflow();
    loop.registerTask({ action: 'read', dataClass: 'INTERNAL', taskId: 't-b1' });
    const result = await loop.runContinuous();
    expect(result.totalExecuted).toBe(1);
  });

  it('blocks Tier D tasks (requires human approval)', async () => {
    const loop = new LoopEngineeringWorkflow();
    loop.registerTask({ action: 'publish', dataClass: 'INTERNAL', isExternal: true, taskId: 't-d1' });
    const result = await loop.runContinuous();
    expect(result.totalExecuted).toBe(0);
    expect(result.totalBlocked).toBe(1);
  });

  it('blocks Tier X tasks completely', async () => {
    const loop = new LoopEngineeringWorkflow();
    loop.registerTask({ action: 'cookie_export', dataClass: 'PUBLIC', taskId: 't-x1' });
    const result = await loop.runContinuous();
    expect(result.totalBlocked).toBe(1);
    expect(result.totalExecuted).toBe(0);
  });

  it('processes mixed queue: A+B auto, D blocked', async () => {
    const loop = new LoopEngineeringWorkflow();
    loop.registerTask({ action: 'research', dataClass: 'PUBLIC', taskId: 'mix-1' });
    loop.registerTask({ action: 'read', dataClass: 'INTERNAL', taskId: 'mix-2' });
    loop.registerTask({ action: 'send', dataClass: 'INTERNAL', isExternal: true, taskId: 'mix-3' });
    loop.registerTask({ action: 'credential_scraping', dataClass: 'PUBLIC', taskId: 'mix-4' });

    const result = await loop.runContinuous();
    expect(result.totalExecuted).toBe(2);   // mix-1 (A) + mix-2 (B)
    expect(result.totalBlocked).toBe(2);     // mix-3 (D) + mix-4 (X)
  });

  it('creates valid receipt chain', async () => {
    const loop = new LoopEngineeringWorkflow();
    loop.registerTask({ action: 'calc', dataClass: 'PUBLIC', taskId: 'chain-1' });
    loop.registerTask({ action: 'read', dataClass: 'PUBLIC', taskId: 'chain-2' });
    loop.registerTask({ action: 'status', dataClass: 'PUBLIC', taskId: 'chain-3' });

    await loop.runContinuous();
    expect(loop.receipts.length).toBe(3);
    expect(loop.verifyChain().valid).toBe(true);
  });

  it('panic controller stops the loop', async () => {
    const loop = new LoopEngineeringWorkflow();
    loop.registerTask({ action: 'research', dataClass: 'PUBLIC', taskId: 'panic-1' });
    loop.panicController.panic('test_emergency');
    const result = await loop.runContinuous();
    expect(loop.panicController.isPanicked()).toBe(true);
  });

  it('handles multiple cycles correctly', async () => {
    const loop = new LoopEngineeringWorkflow();
    for (let i = 0; i < 10; i++) {
      loop.registerTask({ action: 'calc', dataClass: 'PUBLIC', taskId: `batch-${i}` });
    }
    const result = await loop.runContinuous();
    expect(result.totalExecuted).toBe(10);
    expect(loop.verifyChain().valid).toBe(true);
  });
});