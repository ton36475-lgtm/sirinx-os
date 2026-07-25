# SIRINX OS - Master System Reference
**Source:** User-provided Master Prompt (2026-07-14)  
**Status:** ARCHIVED REFERENCE DOCUMENT  
**Tier:** C/D (Production Infrastructure)

---

## 7. Models Swarm Topology

| Model | Role | Parameters |
|-------|------|-----------|
| GPT-5.6 Sol | Master Systemic Orchestrator | Fast Mode=Off, Thinking Budget=Max, Temp=0.0 |
| Claude Fable 5 | Macro Architecture Designer | Temp=0.2 |
| DeepSeek V4 MoE | Heavy Logic Engine | Aggressive Throughput, 128K Tokens |
| ChatGPT Codex | Test Driver & Micro-Refactor | Coverage >=90% |
| GLM 5.2 | Context Sync & Docs Engine | Cointh Endpoint |
| Laguna M1 | Local Runtime Validator | Latency <50ms |

## 8. Repository Lifecycle State Machine

```
[REPO_DISCOVERY] → [BASELINE] → [REFACTOR] → [RUST_MIGRATION]
Status: BASELINE
Next Action: Map sirinx-os directory tree via MCP
```

## 9. System Execution Pipeline

1. **Edge Ingestion & Mutex Verification** - Cloudflare Worker acquires Durable Object lock
2. **Context Prefix Optimization** - Redis retrieves Layers 1&2
3. **Autonomous Task Decomposition** - GPT-5.6 Sol breaks down goals
4. **CMUX Sub-Agent Execution** - Dispatch to tmux sessions
5. **Zero-Gate Safety Review** - Tier 1-3 validation
6. **Knowledge Graph Ingestion** - Obsidian sync

---

**Reference Only - No deployment without operator approval**