---
## GODMODE V5 Integration (Addendum)

### Worker Crates Reference
```
services/orchestrator/crates/
├── hermes-core/         → domain types, state machine
├── hermes-worker/       → Cloudflare Workers endpoints
├── hermes-governance/   → D1 schema, hash chain
├── hermes-lock/         → StateLocker DO (V5 uses Workflows v2)
├── hermes-router/       → AI Gateway P098-C
├── hermes-dispatch/     → Tier policy engine
└── hermes-feed/         → WebSocket feed hub (dashboard)
```

### Phase P1-P11 Mapping
| Phase | Target Crate | Status |
|-------|--------------|--------|
| P1 | All crates | ✅ COMPLETE |
| P2 | hermes-core | ✅ COMPLETE |
| P3 | hermes-worker | ✅ Scaffold complete |
| P4 | hermes-dispatch | ✅ Scaffold complete |
| P5 | hermes-router | ✅ Scaffold complete |
| P6 | Hardening | ⏸ Pending clippy |
| P7 | Telegram UX | ⏸ Pending inline keyboards |
| P8 | Idempotency | ⏸ Pending outbox |
| P9 | Dashboard | ⏸ Pending Cloudflare Access |
| P10 | Sandboxes | ⏸ Pending R2 artifacts |
| P11 | Preview tag | ⏸ Pending test green |

### Open Models Integration (Free)
| Model | Purpose | Tier |
|-------|---------|------|
| DeepSeek V4 Flash | MAKER heavy logic | P098-B |
| Mimo V2.5 | Architecture patterns | Any |
| North Mini Code | Refactoring | Any |
| Hy3 | Performance optimization | Any |

### Safety Posture
- All models used through Workers AI Gateway
- No direct API calls from code
- Cost tracked in D1 cost_ledger
- Daily caps enforced
- No secrets in code

---
*EOF - GODMODE V5 Addendum*