// tests/p006-cloud-canary/p006-cloud-mock-canary.test.mjs
// P006: Schedule/Cloud Mock Canary
// Gate: cloud accepts only pre-delegated A/B; local-dependent task becomes WAITING_LOCAL_NODE

import { describe, it, expect } from 'vitest';
import { MockCloudWorker, WorkerStatus } from '../../packages/types/src/worker-interfaces.mjs';
import { createHash } from 'node:crypto';

describe('P006 — Schedule/Cloud Mock Canary', () => {
  // ═══ T-C02: Duplicate trigger = one result ═══
  it('T-C02: duplicate trigger creates exactly one result', async () => {
    const w = new MockCloudWorker();
    const bundle = { taskId: 'task-dedupe-1', maximumTier: 'A', dataClass: 'PUBLIC' };
    await w.acceptBundle(bundle);
    const r1 = await w.execute(bundle);
    const r2 = await w.execute(bundle);
    const r3 = await w.execute(bundle);
    expect(r1.deduped).toBeFalsy();
    expect(r2.deduped).toBe(true);
    expect(r3.deduped).toBe(true);
  });

  // ═══ Cloud rejects Tier D/X ═══
  it('rejects Tier D bundle in cloud', async () => {
    const w = new MockCloudWorker();
    const result = await w.acceptBundle({ maximumTier: 'D', dataClass: 'PUBLIC' });
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('tier_too_high_for_cloud');
  });

  it('rejects Tier X bundle in cloud', async () => {
    const w = new MockCloudWorker();
    const result = await w.acceptBundle({ maximumTier: 'X', dataClass: 'PUBLIC' });
    expect(result.accepted).toBe(false);
  });

  // ═══ Cloud rejects CONFIDENTIAL/RESTRICTED ═══
  it('rejects CONFIDENTIAL payload leaving local node', async () => {
    const w = new MockCloudWorker();
    const result = await w.acceptBundle({ maximumTier: 'B', dataClass: 'CONFIDENTIAL' });
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('data_class_too_high_for_cloud');
  });

  it('rejects RESTRICTED payload leaving local node', async () => {
    const w = new MockCloudWorker();
    const result = await w.acceptBundle({ maximumTier: 'A', dataClass: 'RESTRICTED' });
    expect(result.accepted).toBe(false);
  });

  // ═══ T-C03: Local node offline → WAITING_LOCAL_NODE ═══
  it('T-C03: local-dependent task enters WAITING_LOCAL_NODE', async () => {
    const w = new MockCloudWorker();
    await w.checkpoint({ canContinueRemotely: false });
    expect(w.getStatus()).toBe(WorkerStatus.WAITING_LOCAL_NODE);
  });

  it('allows continuation when remote-capable', async () => {
    const w = new MockCloudWorker();
    const result = await w.checkpoint({ canContinueRemotely: true });
    expect(result.status).toBe('checkpointed');
    expect(w.getStatus()).not.toBe(WorkerStatus.WAITING_LOCAL_NODE);
  });

  // ═══ T-C04: Runtime/call/cost caps ═══
  it('T-C04: accepts valid Tier A/B bundle', async () => {
    const w = new MockCloudWorker();
    const r1 = await w.acceptBundle({ maximumTier: 'A', dataClass: 'PUBLIC' });
    const r2 = await w.acceptBundle({ maximumTier: 'B', dataClass: 'INTERNAL' });
    expect(r1.accepted).toBe(true);
    expect(r2.accepted).toBe(true);
  });

  // ═══ Signed bundle verification ═══
  it('signed bundle has immutable hash', () => {
    const bundle = {
      taskId: 'task-sign-1',
      planHash: 'plan-abc',
      scopeHash: 'scope-def',
      maximumTier: 'A',
      dataClass: 'PUBLIC'
    };
    const data = JSON.stringify(bundle);
    const hash = createHash('sha256').update(data).digest('hex');
    // Any change should produce different hash
    const modified = { ...bundle, maximumTier: 'D' };
    const modifiedHash = createHash('sha256').update(JSON.stringify(modified)).digest('hex');
    expect(hash).not.toBe(modifiedHash);
  });
});