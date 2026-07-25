# GHOSTCLAW_OS_V5_COMPLETE_MIGRATION.md

## Spec-Driven Design: GhostClaw OS Complete Migration

### Goal
Migrate entire GhostClaw OS from JS workers → Rust core, full MCP wiring, Telegram commands, and local Cloudflare Workers simulation — ทั้งหมดใน local dry-run mode.

### Architecture Vision

```
┌─────────────────────────────────────────────────────────┐
│  COMPUTER USE (Background)                              │
└─────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│  HERMES COMMAND CENTER (Orchestrator)                   │
│  → /api/ghostclaw/routing                               │
│  → /api/telegram/commands                               │
│  → Gate Check (dry-run only)                            │
└─────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│  RUST WORKER LAYER                                      │
│  • ghostclaw-core: Governance, state, routing           │
│  • ghostclaw-providers: GLM/OpenRouter/Ollama adapters  │
│  • ghostclaw-hermes: MCP server, async messaging        │
│  • ghostclaw-telegram: Bot commands, webhook            │
│  • ghostclaw-mcp: Tool registry, allowlisting           │
└─────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│  SKILLS API GATEWAY (:3800)                             │
│  → /health, /api/skills/list, /api/skills/orchestrate   │
│  → /api/agents, /api/skills/status                      │
└─────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│  DEV CONTROL API (:8711)                                │
│  → /health, /api/gates, /api/actions, /api/switches     │
│  → /api/skills/status → proxies to Skills API            │
└─────────────────────────────────────────────────────────┘
```

### Phase 1: Rust Migration (Worker Ports)

#### 1A: agent-driver.mjs → Rust
```
Source: services/dev-control-api/src/agent-driver.mjs
Target: crates/ghostclaw-core/src/agent_driver.rs
Status: ✅ JS passes node --check, Rust needs migrate
Risk: medium (state machine logic)
```

#### 1B: agent-launch-gate.mjs → Rust
```
Source: services/dev-control-api/src/agent-launch-gate.mjs
Target: crates/ghostclaw-core/src/launch_gate.rs
Risk: high (kill switch integration)
```

#### 1C: centerbrain-hub.mjs → Rust
```
Source: services/dev-control-api/src/centerbrain-hub.mjs
Target: crates/ghostclaw-core/src/centerbrain.rs
Risk: medium (connector lanes)
```

### Phase 2: MCP Server Wiring

```
Main Integration Point:
ghostclaw-os/.mcp.json → loads MCP servers for all skills

Skills to wire:
- coding-model-router → OpenRouter/GLM-5.2
- sirinx-ai-hq → Knowledge curation
- ghostclaw-agent-ghostclaws-thai-jarvis → Telegram/Agent
- system-design-architect → Schema generator
```

### Phase 3: Telegram Commands

```
Commands to implement:
/ghostclaw status    → GET /api/ghostclaw/control-plane/status
/skills list       → GET /api/skills/list
/skills run <goal> → POST /api/skills/orchestrate (dry-run)
/deploy preview    → GET /api/cloudflare-deployment-readiness (dry-run)
/health check      → GET /health on all systems
```

### Phase 4: Cloudflare Local Simulation

```
Files:
- services/orchestrator/wrangler.toml → dry-run config
- services/orchestrator/wrangler.preview.jsonc → preview state
- infra/docker/cloudflare/ → local simulation

Simulation goals:
- No real deployment
- KV/R2 mocks in .ghostclaw_runtime/
- Worker routes tested locally
```

### Gate Requirements

| Action | Gate Level | Required For |
|--------|------------|--------------|
| Rust migration | L2 | Local only ✅ |
| MCP wiring | L3 | Local only ✅ |
| Telegram dry-run | L3 | Local only ✅ |
| Cloudflare local simulation | L2 | Local only ✅ |
| Live deploy | L4 | External write ❌ |
| Push to GitHub | L4 | Requires approval ❌ |

### Immediate Tasks (Dry-Run Safe)

```text
1. Create Rust stubs for 3 workers (agent_driver, launch_gate, centerbrain)
2. Wire MCP servers to .mcp.json
3. Create Telegram command router (local-only)
4. Create Cloudflare simulation script (no real deploy)
5. Run full integration test (tmux session)
```

---

## WORKING NOTES

- All work stays in local dry-run mode
- No .env mutation, no provider calls, no external writes
- Test first, migrate second
- MCP integration uses existing .mcp.json pattern