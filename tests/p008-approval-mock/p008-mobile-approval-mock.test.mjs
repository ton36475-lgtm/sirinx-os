// tests/p008-approval-mock/p008-mobile-approval-mock.test.mjs
// P008: Mobile Approval Mock
// Gate: wrong principal, replay, expired approval and changed plan all rejected 100%

import { describe, it, expect } from 'vitest';
import { createApproval, validateApproval } from '../../packages/types/src/ghostclaw-governance.mjs';

describe('P008 — Mobile Approval Mock', () => {
  const baseApproval = {
    taskId: 'task-p008', planHash: 'plan-001', scopeHash: 'scope-001',
    decision: 'APPROVE', principal: 'owner-sirinx',
    authenticatorRef: 'passkey-001', nonce: 'nonce-p008'
  };

  it('T-G01: wrong principal rejected 100%', () => {
    const apr = createApproval(baseApproval);
    const v = validateApproval(apr, { principal: 'WRONG_PERSON' });
    expect(v.valid).toBe(false);
    expect(v.reason).toBe('principal_mismatch');
  });

  it('T-G02: replay attack rejected (already consumed)', () => {
    const apr = createApproval(baseApproval);
    apr.consumedAt = new Date().toISOString();
    const v = validateApproval(apr, { principal: 'owner-sirinx' });
    expect(v.valid).toBe(false);
    expect(v.reason).toBe('already_consumed');
  });

  it('T-G03: expired approval rejected', () => {
    const apr = createApproval(baseApproval);
    apr.expiresAt = new Date(Date.now() - 60000).toISOString();
    const v = validateApproval(apr, { principal: 'owner-sirinx' });
    expect(v.valid).toBe(false);
    expect(v.reason).toBe('expired');
  });

  it('T-G03b: changed plan hash rejected', () => {
    const apr = createApproval(baseApproval);
    const v = validateApproval(apr, { planHash: 'DIFFERENT_PLAN', principal: 'owner-sirinx' });
    expect(v.valid).toBe(false);
    expect(v.reason).toBe('plan_hash_mismatch');
  });

  it('T-G03c: changed scope hash rejected', () => {
    const apr = createApproval(baseApproval);
    const v = validateApproval(apr, { scopeHash: 'DIFFERENT_SCOPE', principal: 'owner-sirinx' });
    expect(v.valid).toBe(false);
    expect(v.reason).toBe('scope_hash_mismatch');
  });

  it('REJECT decision blocks execution', () => {
    const apr = createApproval({ ...baseApproval, decision: 'REJECT' });
    const v = validateApproval(apr, { principal: 'owner-sirinx' });
    expect(v.valid).toBe(false);
    expect(v.reason).toBe('not_approved');
  });

  it('valid approval passes all checks', () => {
    const apr = createApproval(baseApproval);
    const v = validateApproval(apr, {
      planHash: 'plan-001', scopeHash: 'scope-001', principal: 'owner-sirinx'
    });
    expect(v.valid).toBe(true);
  });

  it('REDIRECT decision produces redirect status', () => {
    const apr = createApproval({ ...baseApproval, decision: 'REDIRECT' });
    expect(apr.decision).toBe('REDIRECT');
  });

  it('approval has expiry (not permanent)', () => {
    const apr = createApproval(baseApproval);
    expect(apr.expiresAt).toBeDefined();
    expect(new Date(apr.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('approval has one-time nonce', () => {
    const apr = createApproval(baseApproval);
    expect(apr.nonce).toBeDefined();
    expect(apr.nonce).toBe('nonce-p008');
  });
});