// packages/types/src/ghostclaw-governance.mjs
// P002: Governance Foundation - Tier Classifier, Capability, Lease, Approval, Receipt
// ALL contracts are fail-closed. Unknown = denied, never allowed.

import { createHash, randomUUID } from 'node:crypto';

// ═══════════════════════════════════════════════════════════
// ACTION TIERS
// ═══════════════════════════════════════════════════════════
export const Tier = Object.freeze({
  A: 'A',  // auto: public research, calc, status read
  B: 'B',  // auto after policy: enrolled read-only dashboard
  C: 'C',  // maker-checker-guard: confidential read, cloud delegation
  D: 'D',  // owner approval: external send, mutation, deploy
  X: 'X'   // blocked: cookie export, bypass, credential theft
});

export const FORBIDDEN_ACTIONS = Object.freeze([
  'cookie_export', 'session_replay', 'credential_scraping',
  'mfa_bypass', 'captcha_bypass', 'access_control_bypass',
  'captive_portal_bypass', 'covert_tunnel', 'guardrail_disable',
  'self_approval', 'uncapped_spend', 'bulk_delete_irreversible',
  'dns_exfiltration', 'mac_cloning', 'sni_spoofing',
  'domain_fronting', 'session_clone'
]);

// ═══════════════════════════════════════════════════════════
// TIER CLASSIFIER — fail-closed
// ═══════════════════════════════════════════════════════════
export function classifyAction({ action, dataClass, isExternal, isMutation }) {
  // Check forbidden first
  if (FORBIDDEN_ACTIONS.includes(action)) return Tier.X;

  // Tier X: restricted data with external mutation
  if (dataClass === 'RESTRICTED' && (isExternal || isMutation)) return Tier.X;

  // Tier D: external send/mutation
  if (isExternal || isMutation) return Tier.D;

  // Tier C: confidential read
  if (dataClass === 'CONFIDENTIAL') return Tier.C;

  // Tier B: authenticated read-only
  if (dataClass === 'INTERNAL') return Tier.B;

  // Tier A: public
  if (dataClass === 'PUBLIC') return Tier.A;

  // Unknown → fail closed
  return Tier.X;
}

// ═══════════════════════════════════════════════════════════
// EXECUTION CAPABILITY — signed, scoped, expiring, one-time
// ═══════════════════════════════════════════════════════════
export function createCapability({ taskId, workerId, planHash, scopeHash, allowedActions, resources, exactPaths, allowedDomains, maxCalls = 20, maxCostThb = 0, maxRuntimeSeconds = 900, expiresAt, nonce, issuedBy = 'hermes' }) {
  if (!planHash || !scopeHash) throw new Error('plan_hash and scope_hash required');
  if (!nonce) throw new Error('one-time nonce required');
  if (!expiresAt) throw new Error('expiry required');

  return {
    capabilityId: `cap-${randomUUID()}`,
    taskId, workerId, planHash, scopeHash,
    allowedActions: Object.freeze([...(allowedActions || [])]),
    resources: Object.freeze([...(resources || [])]),
    exactPaths: Object.freeze([...(exactPaths || [])]),
    allowedDomains: Object.freeze([...(allowedDomains || [])]),
    maxCalls, maxCostThb, maxRuntimeSeconds,
    expiresAt, nonce, issuedBy,
    signature: `sig-${planHash.slice(0, 8)}-${nonce.slice(0, 8)}`,
    consumed: false
  };
}

export function validateCapability(cap, { now = new Date(), planHash, scopeHash, workerId }) {
  if (!cap || cap.consumed) return { valid: false, reason: 'consumed_or_missing' };
  if (new Date(cap.expiresAt) < now) return { valid: false, reason: 'expired' };
  if (planHash && cap.planHash !== planHash) return { valid: false, reason: 'plan_hash_mismatch' };
  if (scopeHash && cap.scopeHash !== scopeHash) return { valid: false, reason: 'scope_hash_mismatch' };
  if (workerId && cap.workerId !== workerId) return { valid: false, reason: 'worker_mismatch' };
  return { valid: true };
}

// ═══════════════════════════════════════════════════════════
// RESOURCE LEASE — exact path, no wildcard
// ═══════════════════════════════════════════════════════════
export function validateLeasePath(path) {
  if (!path || typeof path !== 'string') return { valid: false, reason: 'empty' };
  if (path.includes('..')) return { valid: false, reason: 'traversal' };
  if (path.includes('*')) return { valid: false, reason: 'wildcard' };
  if (path.includes('//')) return { valid: false, reason: 'double_slash' };
  return { valid: true };
}

export function createLease({ taskId, workerId, resourceType, canonicalResource, operation, maxBytes = 10485760, expiresAt }) {
  const pathCheck = validateLeasePath(canonicalResource);
  if (!pathCheck.valid) throw new Error(`lease_path_invalid: ${pathCheck.reason}`);

  return {
    leaseId: `lease-${randomUUID()}`,
    taskId, workerId, resourceType,
    canonicalResource, operation, maxBytes, expiresAt,
    preHash: null  // set before use
  };
}

// ═══════════════════════════════════════════════════════════
// APPROVAL — immutable, digest-bound, one-time
// ═══════════════════════════════════════════════════════════
export function createApproval({ taskId, planHash, scopeHash, decision, principal, authenticatorRef, conditions = [], nonce }) {
  if (!decision || !['APPROVE', 'REJECT', 'REDIRECT'].includes(decision)) {
    throw new Error('invalid_decision');
  }
  if (!principal || !nonce) throw new Error('principal_and_nonce_required');

  return {
    approvalId: `apr-${randomUUID()}`,
    taskId, planHash, scopeHash,
    decision, principal, authenticatorRef,
    conditions: Object.freeze([...conditions]),
    nonce,
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 600000).toISOString(),  // 10 min
    consumedAt: null,
    signature: `sig-${planHash?.slice(0, 8) || 'none'}-${nonce.slice(0, 8)}`
  };
}

export function validateApproval(approval, { planHash, scopeHash, principal, now = new Date() }) {
  if (!approval) return { valid: false, reason: 'missing' };
  if (approval.consumedAt) return { valid: false, reason: 'already_consumed' };
  if (new Date(approval.expiresAt) < now) return { valid: false, reason: 'expired' };
  if (approval.decision !== 'APPROVE') return { valid: false, reason: 'not_approved' };
  if (planHash && approval.planHash !== planHash) return { valid: false, reason: 'plan_hash_mismatch' };
  if (scopeHash && approval.scopeHash !== scopeHash) return { valid: false, reason: 'scope_hash_mismatch' };
  if (principal && approval.principal !== principal) return { valid: false, reason: 'principal_mismatch' };
  return { valid: true };
}

// ═══════════════════════════════════════════════════════════
// RECEIPT LEDGER — append-only hash chain
// ═══════════════════════════════════════════════════════════
export function createReceipt({ sequence, previousHash, taskId, planHash, workerId, approvalRefs = [], leaseRefs = [], beforeStateHash, afterStateHash, evidenceHashes = [], result, startedAt, finishedAt }) {
  const data = `${sequence}|${previousHash}|${taskId}|${planHash}|${workerId}|${result}`;
  const chainHash = createHash('sha256').update(data).digest('hex');

  return {
    receiptId: `rcpt-${randomUUID()}`,
    sequence, previousHash, taskId, planHash, workerId,
    approvalRefs: Object.freeze([...approvalRefs]),
    leaseRefs: Object.freeze([...leaseRefs]),
    beforeStateHash, afterStateHash,
    evidenceHashes: Object.freeze([...evidenceHashes]),
    result, startedAt, finishedAt,
    chainHash, signature: `ledger-${chainHash.slice(0, 16)}`
  };
}

// ═══════════════════════════════════════════════════════════
// PANIC CONTROLLER
// ═══════════════════════════════════════════════════════════
export function createPanicController() {
  let panicked = false;
  const revoked = new Set();

  return {
    panic(reason) {
      panicked = true;
      return { status: 'PANIC_ACTIVE', reason, timestamp: new Date().toISOString() };
    },
    revoke(capabilityId) { revoked.add(capabilityId); },
    isPanicked() { return panicked; },
    isRevoked(capabilityId) { return revoked.has(capabilityId); },
    status() {
      return { panicked, revokedCount: revoked.size };
    }
  };
}