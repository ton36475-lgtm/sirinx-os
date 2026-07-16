# INTEGRATION_MANIFEST.md - Full Agentic Integration Points

## Service Integrations (Reversed Engineered)

### 1. Cloudflare Workers Integration
```toml
# wrangler.toml
name = "hermes-v5-worker"
main = "dist/worker.js"
compatibility_date = "2024-01-01"
```

### 2. Linear Task Tracker Integration
- Webhook endpoint: `/api/linear/webhook`
- Task sync: `evidence_drop/verification_report.json`

### 3. Figma UI Integration
- Components: `apps/dev-dashboard/components/`
- Styles: Tailwind CSS via Vite

### 4. Notion Knowledge Sync
- API endpoint: `/api/notion/sync`
- KV namespace: `NOTION_VAULT`

### 5. GitHub Repository Hooks
- Webhook: `/api/github/webhook`
- Token validation: HMAC-SHA256

### 6. Superbase (Supabase) Integration
- Tables: `tasks`, `ledger`, `outbox`
- Realtime: WebSocket subscription

## Full Integration Pattern
Hermes → A2A Queue → Service Adapter → Evidence Ledger → Opencode Review