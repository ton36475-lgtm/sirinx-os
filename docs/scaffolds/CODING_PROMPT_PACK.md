# CODING_PROMPT_PACK.md
## Agentic Development Prompts (Deep Research)

### Prompt Templates by Agent Type

#### 1. Cloudflare Worker Agent
```
Goal: Optimize WASM build size under 1MB
Constraints: workers-rs 0.5, wasm32 target
File Scope: crates/hermes-worker/**
Expected Result: Deploy ready worker
Verification: wrangler deploy dry-run
```

#### 2. Linear Task Agent
```
Goal: Track task state with webhook automation
Constraints: Public webhooks disabled, use KV
File Scope: services/orchestrator/crates/hermes-governance/**
Expected Result: task_sync.rs implemented
Verification: POST /api/linear/webhook returns 200
```

#### 3. Figma UI Agent
```
Goal: Build status dashboard component
Constraints: React + Tailwind, read-only by default
File Scope: apps/dev-dashboard/components/**
Expected Result: /status shows live telemetry
Verification: browser_navigate to localhost:3000/status
```

#### 4. Notion Knowledge Agent
```
Goal: Sync Obsidian vault to Notion
Constraints: Read-only access, no secrets
File Scope: scripts/a2a/**, packages/types/**
Expected Result: notion_sync.ts implemented
Verification: sync test with sample pages
```

#### 5. GitHub Actions Agent
```
Goal: Build CI pipeline for Rust+WASM
Constraints: cargo check, clippy -D warnings
File Scope: .github/workflows/**
Expected Result: ci.yml passes all jobs
Verification: Actions tab shows green check
```

#### 6. Superbase Agent
```
Goal: Design task ledger schema
Constraints: Supabase tables, row-level security
File Scope: packages/database/**, services/**/schema.sql
Expected Result: Tables created in migration
Verification: supabase db push succeeds
```

### Multi-Agent Coordination
Use `delegate_task` for parallel execution
Use `_A2A_QUEUE/outbox/` for async messaging