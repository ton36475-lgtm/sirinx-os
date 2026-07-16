---
name: ghostclaw-governance-contracts
description: Governance contracts (Tier, Capability, Lease, Approval, Receipt, Panic) for GhostClaw OS — fail-closed security model with 25 negative tests.
version: 1.0.0
---

# GhostClaw Governance Contracts

## Overview

Immutable, fail-closed security contracts that govern all worker actions. Every action must pass tier classification, capability validation, and receipt creation.

## Core Module

```
packages/types/src/ghostclaw-governance.mjs
```

## Exports

### Tier Classification

```javascript
import { classifyAction, Tier } from './ghostclaw-governance.mjs';

// classifyAction returns Tier.A|B|C|D|X
// Unknown data classes → Tier.X (fail closed)
// Forbidden actions (cookie_export, mfa_bypass, etc.) → Tier.X
```

| Tier | Criteria | Auto? |
|------|----------|-------|
| A | PUBLIC dataClass, no external, no mutation | ✅ |
| B | INTERNAL dataClass, no external | ✅ |
| C | CONFIDENTIAL dataClass | Maker-checker |
| D | isExternal or isMutation | Human approval |
| X | RESTRICTED+external, or forbidden action | Blocked forever |

### Capability

```javascript
createCapability({
  taskId, workerId, planHash, scopeHash,
  allowedActions: ['dashboard.read'],
  allowedDomains: ['seller.example'],
  maxCalls: 20, maxCostThb: 0,
  maxRuntimeSeconds: 900,
  expiresAt: 'RFC3339',
  nonce: 'unique-one-time',
  issuedBy: 'hermes'
});
```

Validation rejects: consumed, expired, plan_hash mismatch, scope_hash mismatch, worker mismatch.

### Resource Lease

Exact path only — no wildcard, no traversal:

```javascript
validateLeasePath('/data/report.md');  // ✅ valid
validateLeasePath('../../etc/passwd'); // ❌ traversal
validateLeasePath('/data/*');          // ❌ wildcard
```

### Approval

Immutable, one-time, digest-bound:

```javascript
createApproval({
  taskId, planHash, scopeHash,
  decision: 'APPROVE',  // or REJECT, REDIRECT
  principal, authenticatorRef, nonce
});
```

Validation rejects: consumed, expired, wrong principal, hash mismatch, REJECT decision.

### Receipt Ledger

Append-only hash chain:

```javascript
createReceipt({
  sequence, previousHash,
  taskId, planHash, workerId,
  result: 'SUCCESS|FAILED|ROLLED_BACK',
  startedAt, finishedAt
});
```

Chain verification: `r[i].previousHash === r[i-1].chainHash`

### Panic Controller

```javascript
const pc = createPanicController();
pc.panic('reason');           // Stops all dispatch
pc.revoke('capabilityId');    // Revoke specific capability
pc.isPanicked();              // true after panic()
```

## FORBIDDEN_ACTIONS

```javascript
['cookie_export', 'session_replay', 'credential_scraping',
 'mfa_bypass', 'captcha_bypass', 'access_control_bypass',
 'captive_portal_bypass', 'covert_tunnel', 'guardrail_disable',
 'self_approval', 'uncapped_spend', 'bulk_delete_irreversible',
 'dns_exfiltration', 'mac_cloning', 'sni_spoofing',
 'domain_fronting', 'session_clone']
```

## Tests

```bash
npx vitest run packages/types/src/ghostclaw-governance.test.mjs
# → 25/25 tests pass
```

## Pitfalls

- Do NOT use `Object.freeze()` on top-level return objects — tests need to mutate `consumed` and `consumedAt`
- Use `import { createHash, randomUUID } from 'node:crypto'` — bare `crypto.randomUUID()` fails in vitest
- Regex replacements on `Object.freeze` can break brackets — always run `node --check` after patching
