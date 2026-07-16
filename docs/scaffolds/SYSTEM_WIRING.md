# SYSTEM_WIRING.md - Agent Coordination Protocol
## GODMODE V5 Full Agentic Integration

---

## Agent Wiring Matrix

### 1. Input Flow
```
Telegram Command → Hermes Worker → State Machine → Dispatch Engine
                ↓
           Figma / ClickUp / GitHub API
                ↓
         Notion / Linear / Sites
```

### 2. Knowledge Flow
```
Workers KV (Layer 2/3) → LangGraph Context → Agent Input
                          ↓
                   Evidence Hash Chain ← D1
                          ↓
                    Obsidian Sync ← GLM-5.2
```

### 3. Safety Flow
```
Codex (DeepSeek V4) → AST Check → Cargo Check → Tier Classification
                      ↓         ↑
                 LLM Safety (Free Models)
                      ↓
              Cloudflare Access Gate
                      ↓
                   Approval/HIGH
```

---

## MCP Integration Points

| MCP | Endpoint | Access Pattern | Safety |
|-----|----------|----------------|--------|
| SIRINX Files | mcp__sirinx_files__ | Read/Write workspace | Tier B |
| Slayer Demo | mcp__slayer_demo__ | SQL queries | Admin only |
| Telegram Bot | Built-in | Message bridge | Owner only |
| Ollama | Local 11434 | LLM inference | Private |

---

## Open Models Router (Free)

| Command | Model | Token Limit |
|---------|-------|-------------|
| /task (TRIAGE) | DeepSeek V4 Flash | 128K |
| Architecture | Mimo V2.5 | 64K |
| Refactor | North Mini Code | 32K |
| Optimize | Hy3 | 16K |

---

## Worker Endpoints (Cargo Crates)

| Endpoint | Crate | Method |
|----------|-------|--------|
| /api/status | hermes-worker | GET |
| /api/queue | hermes-worker | GET |
| /api/cost | hermes-worker | GET |
| /api/tasks | hermes-governance | POST/GET |
| /telegram | hermes-worker | POST |

---

*Ready for opencode auto review*