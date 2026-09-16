// packages/types/src/ghostclaw-governance.test.mjs
// P002: Negative tests — MUST pass before any adapter is built
// Gate: Tier X cannot receive capability; replay/self-approval/digest mismatch rejected 100%

import { describe, it, expect } from 'vitest';
import {
  Tier, FORBIDDEN_ACTIONS, classifyAction,
  createCapability, validateCapability,
  validateLeasePath, createLease,
  createApproval, validateApproval,
  createReceipt, createPanicController
} from './ghostclaw-governance.mjs';

describe('Tier Classifier — fail-closed', () => {
  it('classifies forbidden action as Tier X', () => {
    expect(classifyAction({ action: 'cookie_export', dataClass: 'PUBLIC' })).toBe(Tier.X);
    expect(classifyAction({ action: 'mfa_bypass', dataClass: 'PUBLIC' })).toBe(Tier.X);
    expect(classifyAction({ action: 'credential_scraping', dataClass: 'PUBLIC' })).toBe(Tier.X);
  });

  it('classifies unknown data class as Tier X', () => {
    expect(classifyAction({ action: 'read', dataClass: 'UNKNOWN_TIER' })).toBe(Tier.X);
  });

  it('classifies RESTRICTED + external as Tier X', () => {
    expect(classifyAction({ action: 'send', dataClass: 'RESTRICTED', isExternal: true })).toBe(Tier.X);
  });

  it('classifies external mutation as Tier D', () => {
    expect(classifyAction({ action: 'publish', dataClass: 'INTERNAL', isExternal: true })).toBe(Tier.D);
  });

  it('classifies confidential read as Tier C', () => {
    expect(classifyAction({ action: 'read', dataClass: 'CONFIDENTIAL' })).toBe(Tier.C);
  });

  it('classifies public read as Tier A', () => {
    expect(classifyAction({ action: 'research', dataClass: 'PUBLIC' })).toBe(Tier.A);
  });
});

describe('Capability — replay/expiry/mismatch protection', () => {
  const baseCap = {
    taskId: 'task-1', workerId: 'worker-1',
    planHash: 'abc123', scopeHash: 'def456',
    allowedActions: ['read'], nonce: 'nonce-1',
    expiresAt: new Date(Date.now() + 60000).toISOString()
  };

  it('rejects consumed capability', () => {
    const cap = createCapability(baseCap);
    cap.consumed = true;  // simulate consumption
    const v = validateCapability(cap, { planHash: 'abc123', scopeHash: 'def456', workerId: 'worker-1' });
    expect(v.valid).toBe(false);
    expect(v.reason).toBe('consumed_or_missing');
  });

  it('rejects expired capability', () => {
    const cap = createCapability({ ...baseCap, expiresAt: new Date(Date.now() - 1000).toISOString() });
    const v = validateCapability(cap, {});
    expect(v.valid).toBe(false);
    expect(v.reason).toBe('expired');
  });

  it('rejects plan_hash mismatch', () => {
    const cap = createCapability(baseCap);
    const v = validateCapability(cap, { planHash: 'WRONG' });
    expect(v.valid).toBe(false);
    expect(v.reason).toBe('plan_hash_mismatch');
  });

  it('rejects scope_hash mismatch', () => {
    const cap = createCapability(baseCap);
    const v = validateCapability(cap, { scopeHash: 'WRONG' });
    expect(v.valid).toBe(false);
    expect(v.reason).toBe('scope_hash_mismatch');
  });

  it('rejects worker mismatch', () => {
    const cap = createCapability(baseCap);
    const v = validateCapability(cap, { workerId: 'WRONG' });
    expect(v.valid).toBe(false);
    expect(v.reason).toBe('worker_mismatch');
  });

  it('accepts valid capability', () => {
    const cap = createCapability(baseCap);
    const v = validateCapability(cap, { planHash: 'abc123', scopeHash: 'def456', workerId: 'worker-1' });
    expect(v.valid).toBe(true);
  });
});

describe('Lease — path traversal/wildcard protection', () => {
  it('rejects path traversal', () => {
    expect(validateLeasePath('../../etc/passwd').valid).toBe(false);
    expect(validateLeasePath('../../etc/passwd').reason).toBe('traversal');
  });

  it('rejects wildcard', () => {
    expect(validateLeasePath('/data/*').valid).toBe(false);
    expect(validateLeasePath('/data/*').reason).toBe('wildcard');
  });

  it('rejects empty path', () => {
    expect(validateLeasePath('').valid).toBe(false);
  });

  it('accepts exact path', () => {
    expect(validateLeasePath('/Users/sirinx/sirinx-os/data/report.md').valid).toBe(true);
  });

  it('createLease throws on invalid path', () => {
    expect(() => createLease({
      taskId: 't1', workerId: 'w1', resourceType: 'file',
      canonicalResource: '../../../etc/passwd', operation: 'read'
    })).toThrow();
  });
});

describe('Approval — replay/expiry/mismatch protection', () => {
  it('rejects already consumed approval', () => {
    const apr = createApproval({
      taskId: 't1', planHash: 'h1', scopeHash: 's1',
      decision: 'APPROVE', principal: 'owner-1',
      authenticatorRef: 'passkey-1', nonce: 'n1'
    });
    apr.consumedAt = new Date().toISOString();
    const v = validateApproval(apr, { planHash: 'h1', scopeHash: 's1', principal: 'owner-1' });
    expect(v.valid).toBe(false);
    expect(v.reason).toBe('already_consumed');
  });

  it('rejects wrong principal', () => {
    const apr = createApproval({
      taskId: 't1', planHash: 'h1', scopeHash: 's1',
      decision: 'APPROVE', principal: 'owner-1',
      authenticatorRef: 'passkey-1', nonce: 'n1'
    });
    const v = validateApproval(apr, { principal: 'WRONG' });
    expect(v.valid).toBe(false);
    expect(v.reason).toBe('principal_mismatch');
  });

  it('rejects REJECT decision', () => {
    const apr = createApproval({
      taskId: 't1', planHash: 'h1', scopeHash: 's1',
      decision: 'REJECT', principal: 'owner-1',
      authenticatorRef: 'passkey-1', nonce: 'n1'
    });
    const v = validateApproval(apr, { principal: 'owner-1' });
    expect(v.valid).toBe(false);
    expect(v.reason).toBe('not_approved');
  });

  it('rejects plan_hash mismatch', () => {
    const apr = createApproval({
      taskId: 't1', planHash: 'h1', scopeHash: 's1',
      decision: 'APPROVE', principal: 'owner-1',
      authenticatorRef: 'passkey-1', nonce: 'n1'
    });
    const v = validateApproval(apr, { planHash: 'WRONG', principal: 'owner-1' });
    expect(v.valid).toBe(false);
    expect(v.reason).toBe('plan_hash_mismatch');
  });
});

describe('Panic Controller', () => {
  it('stops dispatch when panicked', () => {
    const pc = createPanicController();
    expect(pc.isPanicked()).toBe(false);
    pc.panic('test_emergency');
    expect(pc.isPanicked()).toBe(true);
  });

  it('revokes capabilities', () => {
    const pc = createPanicController();
    pc.revoke('cap-1');
    expect(pc.isRevoked('cap-1')).toBe(true);
    expect(pc.isRevoked('cap-2')).toBe(false);
  });
});

describe('Receipt — chain integrity', () => {
  it('creates receipt with chain hash', () => {
    const r = createReceipt({
      sequence: 1, previousHash: '0'.repeat(64),
      taskId: 't1', planHash: 'h1', workerId: 'w1',
      result: 'SUCCESS', startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString()
    });
    expect(r.chainHash).toBeDefined();
    expect(r.chainHash.length).toBe(64);
    expect(r.sequence).toBe(1);
  });

  it('links receipts via previousHash', () => {
    const r1 = createReceipt({
      sequence: 1, previousHash: '0'.repeat(64),
      taskId: 't1', planHash: 'h1', workerId: 'w1',
      result: 'SUCCESS', startedAt: '2026-01-01T00:00:00Z',
      finishedAt: '2026-01-01T00:01:00Z'
    });
    const r2 = createReceipt({
      sequence: 2, previousHash: r1.chainHash,
      taskId: 't2', planHash: 'h2', workerId: 'w2',
      result: 'SUCCESS', startedAt: '2026-01-01T00:02:00Z',
      finishedAt: '2026-01-01T00:03:00Z'
    });
    expect(r2.previousHash).toBe(r1.chainHash);
  });
});