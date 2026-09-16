# ThaiMart System Automation Spec Quick Reference

## Adapter Default Config
```yaml
thaimart_adapter:
  status: disabled_pending_contract
  official_api: unknown
  auth_mode: unknown
  webhooks: unknown
  reads: []
  writes: []
  rate_limit: unknown
  own_store_only: true
  fail_closed: true
```

## Evidence Classification
- E01-E04: Seller Center screenshots (observation only)
- E02: Contains PII → confidential_evidence, use redacted derivative
- E05-E07: Local prototypes (not runtime evidence)
- E08: Proposed architecture (not production-ready)
- E09-E10: Concept/visual reference only

## Rollout Phases
- P0: Evidence + Contract Gate (adapter disabled)
- P1: Local Control Plane (no ThaiMart network)
- P2: Authorized Read-only
- P3: Human-gated Writes (one action at a time)
- P4: Operations
- P5: Controlled Automation (never 100% autonomous)

## Required Evidence Before Activation
1. Terms and written scope authorization
2. Base URL and API version
3. OAuth/API-key process
4. Category and attribute schema
5. Order/return/refund/shipment mappings
6. Rate-limit and retry policy
7. Webhook signature and replay policy
8. Idempotency behavior
9. Sandbox/test account
10. Brand/logo usage approval

## 16 Corrections Required (from spec section 13)
1. inventory_ledger duplicate org_id
2. citext/ltree extensions missing
3. reserved > on_hand allowed (negative available)
4. Account defaults to connected
5. 2 rps/burst 5 assumed
6. Adapter exposes writes while officialApi=false
7. Duplicate listCategories()
8. auth.uid() needs Supabase context
9. Raw PII in plaintext
10. Audit hash no immutability
11. Approval no version guard
12. Node crypto in Cloudflare needs Web Crypto
13. Delete cascade conflicts with retention
14. "Reads are safe" invalid for PII
15. Source-of-truth conflicts with marketplace authority
16. Analytics event mislabeling
