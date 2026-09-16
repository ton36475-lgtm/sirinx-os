import { describe, it, expect } from 'vitest';
import {
  MockBrowserWorker, MockCloudWorker, MockResearchWorker,
  MockEvidenceStore, MockNotificationRelay, WorkerStatus, WorkerResult
} from './worker-interfaces.mjs';

describe('Mock Browser Worker', () => {
  it('executes read-only action with zero mutations', async () => {
    const w = new MockBrowserWorker();
    const cap = { capabilityId: 'cap-1' };
    const result = await w.execute(cap, { type: 'read' });
    expect(result.result).toBe(WorkerResult.RESULT);
    expect(w.getMutationCount()).toBe(0);
    expect(await w.verifyReadonly()).toBe(true);
  });

  it('returns WAITING_HUMAN_AUTH for MFA', async () => {
    const w = new MockBrowserWorker();
    await w.execute({ capabilityId: 'cap-1' }, { type: 'mfa_challenge' });
    expect(w.getStatus()).toBe(WorkerStatus.WAITING_HUMAN_AUTH);
  });
});

describe('Mock Cloud Worker', () => {
  it('rejects Tier D in cloud', async () => {
    const w = new MockCloudWorker();
    const accepted = await w.acceptBundle({ maximumTier: 'D', dataClass: 'PUBLIC' });
    expect(accepted.accepted).toBe(false);
  });

  it('rejects CONFIDENTIAL payload', async () => {
    const w = new MockCloudWorker();
    const accepted = await w.acceptBundle({ maximumTier: 'B', dataClass: 'CONFIDENTIAL' });
    expect(accepted.accepted).toBe(false);
  });

  it('deduplicates same taskId', async () => {
    const w = new MockCloudWorker();
    await w.acceptBundle({ maximumTier: 'A', dataClass: 'PUBLIC' });
    const r1 = await w.execute({ taskId: 'task-1' });
    const r2 = await w.execute({ taskId: 'task-1' });
    expect(r1.deduped).toBeFalsy();
    expect(r2.deduped).toBe(true);
  });

  it('checkpoints to WAITING_LOCAL_NODE when local needed', async () => {
    const w = new MockCloudWorker();
    await w.checkpoint({ canContinueRemotely: false });
    expect(w.getStatus()).toBe(WorkerStatus.WAITING_LOCAL_NODE);
  });
});

describe('Mock Research Worker', () => {
  it('returns ResearchBundle with citations', async () => {
    const w = new MockResearchWorker();
    const results = await w.search('test query');
    const bundle = await w.buildBundle({ query: 'test query' });
    expect(bundle.claims.length).toBeGreaterThan(0);
    expect(bundle.claims[0].sourceIds.length).toBeGreaterThan(0);
    expect(bundle.sources[0].licenseStatus).toBeDefined();
  });
});

describe('Mock Evidence Store', () => {
  it('stores and retrieves artifacts', () => {
    const store = new MockEvidenceStore();
    const id = store.store({ type: 'screenshot', contentHash: 'abc123' });
    const art = store.retrieve(id);
    expect(art.contentHash).toBe('abc123');
  });
});

describe('Mock Notification Relay', () => {
  it('redacts business data in notifications', () => {
    const relay = new MockNotificationRelay();
    relay.send({
      type: 'alert', severity: 'high', reportRef: '/reports/daily.md',
      sensitiveData: 'password123', customerName: 'John'
    });
    const sent = relay.getSent()[0];
    expect(sent.sensitiveData).toBeUndefined();
    expect(sent.customerName).toBeUndefined();
    expect(sent.reportRef).toBeDefined();
  });
});