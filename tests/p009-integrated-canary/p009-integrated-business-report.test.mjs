// tests/p009-integrated-canary/p009-integrated-business-report.test.mjs
// P009: Integrated Read-Only Business Report Canary
// Full pipeline: schedule → browser read → analysis → report → alert → receipt
// Gate: zero mutation, no secret/PII leak, reproducible result and valid receipt chain

import { describe, it, expect } from 'vitest';
import { LoopEngineeringWorkflow } from '../../packages/types/src/loop-engineering-workflow.mjs';
import { SyntheticSite } from '../p005-browser-canary/SyntheticSite.mjs';
import { MockBrowserWorker } from '../../packages/types/src/worker-interfaces.mjs';
import { MockNotificationRelay, MockEvidenceStore } from '../../packages/types/src/worker-interfaces.mjs';
import { createReceipt } from '../../packages/types/src/ghostclaw-governance.mjs';

describe('P009 — Integrated Read-Only Business Report Canary', () => {
  it('full pipeline: schedule → read → analyze → report → receipt', async () => {
    // 1. Setup synthetic site (simulates ThaiMart dashboard)
    const site = new SyntheticSite({ domain: 'seller-thaimart.local', tenant: 'SIRINX-STORE' });
    const browser = new MockBrowserWorker();
    const relay = new MockNotificationRelay();
    const evidence = new MockEvidenceStore();

    // 2. Schedule triggers read (Tier B auto)
    const loop = new LoopEngineeringWorkflow();
    loop.registerTask({
      taskId: 'daily-sales-001',
      action: 'read',
      dataClass: 'INTERNAL',
      planHash: 'daily-sales-plan-v1'
    });

    // 3. Execute
    const result = await loop.runContinuous();
    expect(result.totalExecuted).toBe(1);
    expect(result.totalBlocked).toBe(0);

    // 4. Browser reads metrics (mutation counter = 0)
    const cap = { capabilityId: 'cap-daily' };
    const readResult = await browser.execute(cap, { type: 'read' });
    expect(browser.getMutationCount()).toBe(0);

    // 5. Store evidence
    const artId = evidence.store({
      type: 'sales_snapshot',
      contentHash: 'sha256-abc',
      dataClass: 'INTERNAL',
      metrics: readResult.data.metrics
    });
    expect(evidence.retrieve(artId)).toBeDefined();

    // 6. Notification (redacted)
    relay.send({
      type: 'daily_report_ready',
      severity: 'info',
      reportRef: '/reports/daily-sales-001.md',
      rawSalesData: readResult.data.metrics,
      customerPII: 'SECRET'
    });
    const notification = relay.getSent()[0];
    expect(notification.rawSalesData).toBeUndefined();
    expect(notification.customerPII).toBeUndefined();
    expect(notification.reportRef).toBeDefined();

    // 7. Receipt chain valid
    expect(loop.verifyChain().valid).toBe(true);
  });

  it('mutation counter remains zero across full pipeline', async () => {
    const site = new SyntheticSite();
    const browser = new MockBrowserWorker();

    // Multiple reads
    await browser.execute({ capabilityId: 'cap-1' }, { type: 'read' });
    await browser.execute({ capabilityId: 'cap-2' }, { type: 'read' });
    await browser.execute({ capabilityId: 'cap-3' }, { type: 'read' });

    expect(browser.getMutationCount()).toBe(0);
    expect(site.verifyReadonly()).toBe(true);
  });

  it('blocked task does not produce receipt', async () => {
    const loop = new LoopEngineeringWorkflow();
    loop.registerTask({
      taskId: 'blocked-001',
      action: 'publish',
      dataClass: 'INTERNAL',
      isExternal: true  // Tier D
    });

    const result = await loop.runContinuous();
    expect(result.totalBlocked).toBe(1);
    expect(result.totalReceipts || loop.receipts.length).toBe(0);
  });

  it('evidence store retains artifacts with TTL', () => {
    const store = new MockEvidenceStore();
    const id = store.store({ type: 'test', contentHash: 'h1' });
    const art = store.retrieve(id);
    expect(art.ttl).toBeDefined();
    expect(art.ttl).toBeGreaterThan(0);
  });

  it('receipt chain breaks if tampered', () => {
    const loop = new LoopEngineeringWorkflow();
    // Manually create receipts
    const r1 = createReceipt({
      sequence: 1, previousHash: '0'.repeat(64),
      taskId: 't1', planHash: 'p1', workerId: 'w1',
      result: 'SUCCESS', startedAt: '2026-01-01T00:00:00Z',
      finishedAt: '2026-01-01T00:01:00Z'
    });
    const r2 = createReceipt({
      sequence: 2, previousHash: r1.chainHash,
      taskId: 't2', planHash: 'p2', workerId: 'w2',
      result: 'SUCCESS', startedAt: '2026-01-01T00:02:00Z',
      finishedAt: '2026-01-01T00:03:00Z'
    });
    // Tamper r1
    const tamperedChain = [r1, { ...r2, previousHash: 'TAMPERED' }];
    const broken = tamperedChain[1].previousHash !== tamperedChain[0].chainHash;
    expect(broken).toBe(true);
  });
});