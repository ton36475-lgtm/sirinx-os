# GHOSTCLAW OS

Full-stack Rust governance OS for AI agent pipelines.

## Architecture

```
ghostclaw-os/
├── crates/
│   ├── core/           # Pure governance state machine (NO I/O)
│   │   └── Risk tiers: Green (auto) → Yellow (abort window) → Red (human gate)
│   ├── providers/      # LLM provider chain: Ollama → OpenRouter → GLM → MaxPlus
│   ├── worker/         # Process execution: cargo test, npm build (RAW evidence)
│   ├── hermes/         # Command center: axum HTTP API, task queue, approvals
│   ├── mcp-server/     # MCP stdio tools for agents (governance NEVER lives here)
│   ├── telegram/       # Telegram bot with inline-keyboard approvals
│   └── adapters/
│       └── thaimart/   # E-commerce adapter (product sync, order management)
├── deploy/
│   └── cloudflared/    # wrangler.toml for Cloudflare Workers deploy
├── Cargo.toml           # Workspace root
└── .env.example         # Safe template (no real secrets)
```

## Provider Chain (tiered routing)

| Tier | Provider | Model | Key Required |
|------|----------|-------|--------------|
| 1 | Ollama (local) | qwen2.5-coder | No |
| 2 | OpenRouter free | deepseek-v4-pro:free | OPENROUTER_API_KEY |
| 3a | GLM / Z.ai | glm-5.2 | GLM_API_KEY |
| 3b | MaxPlus | claude-fable-5 | MAXPLUS_API_KEY |

Routing falls through tiers: if Ollama fails → OpenRouter → GLM → MaxPlus.

## Quick Start

```bash
# 1. Copy env template
cp .env.example .env

# 2. Build
cargo build --release

# 3. Run Hermes command center
cargo run --release -p ghostclaw-hermes

# 4. (Optional) Run Telegram bot
cargo run --release -p ghostclaw-telegram

# 5. (Optional) Run MCP server for agent integration
cargo run --release -p ghostclaw-mcp
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| GET | /api/tasks | List all tasks |
| POST | /api/tasks | Submit new task |
| GET | /api/tasks/:id | Get task status |
| POST | /api/tasks/:id/approve | Human approval (Red gate) |
| POST | /api/tasks/:id/reject | Human rejection |
| GET | /api/providers | List provider chain |

## Governance Model

```
TRIAGE → MAKER → CHECKER → GUARD → DONE
                              ↓
                     Risk-tier decides:
                     Green  → auto-approve
                     Yellow → 15min abort window
                     Red    → human gate (NEVER auto)
```

Evidence = raw stdout/stderr + exit code. Never an LLM's self-report.

## Tests

```bash
cargo test
# 7 tests pass: 4 core governance + 3 thaimart adapter
```

## Safety

- No `git push` in any tool — push requires human gate via Hermes
- No deploy without explicit approval
- All external mutations are Red-tier
- MCP server exposes capabilities but governance lives in Hermes

## Deploy (Cloudflare Workers)

```bash
# Set secrets
npx wrangler secret put MAXPLUS_API_KEY
npx wrangler secret put GLM_API_KEY

# Deploy
npx wrangler deploy --config deploy/cloudflared/wrangler.toml
```
