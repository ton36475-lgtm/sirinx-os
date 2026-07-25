# CLOUDFLARE_INTEGRATION.md
## Sirinx OS Cloudflare Integration Plan

### From awesome-cloudflare patterns:
1. **Workers.rs deployment** - WASM binary
2. **KV namespaces** - state storage
3. **Durable Objects** - agent orchestration
4. **Pages deployment** - dashboard hosting

### Implementation Steps

#### 1. Confirm Deployment Target
- [x] `wrangler.toml` exists in sirinx-os
- [ ] Routes need verification

#### 2. KV Integration
Need KV namespaces for:
- `HERMES_LEDGER` - evidence storage
- `IDEMPOTENCY_CACHE` - replay protection

#### 3. Deployment Commands
```bash
# Check current state
cd services/orchestrator
npx wrangler whoami

# Dry-run build (no real deploy yet)
cargo build --target wasm32-unknown-unknown
```

#### 4. Evidence Required
- Cloudflare account ID
- API token with Workers write scope
- KV namespace IDs