# SIRINX OS - Sovereign Distributed Multi-Agent Orchestration System
## Technical Architecture and System Engineering Blueprint

**Source:** Master System Specification (2026-07-14)
**Status:** Reference Only - Awaiting Operator Approval
**Tier:** C/D+ (Production Infrastructure)

---

## 1. Macro Architecture & Distributed Topology

### 1.1 Network & Transport Infrastructure

```
                    CLOUDFLARE EDGE LAYER
    ┌─────────────────────────────────────────────────────────────┐
    │  Cloudflare Edge Worker (Global Ingestion / Telegram)        │
    └──────────────────────┬────────────────────────────────────┘
                           │
            ┌──────────────┴──────────────┐
            ▼                             ▼
    ┌──────────────────┐       ┌──────────────────┐
    │   Workers KV     │       │ Durable Objects  │
    │ (Layer 1/2 Cache)│       │ (StateLockerDo)  │
    └──────────────────┘       └──────────────────┘
            │
    Cloudflare Secure Tunnel (cloudflared)
            │
┌───────────────────────────────────────────────────────────────────────────────┐
│                           LOCAL HARDWARE CLUSTER                              │
├───────────────────────────────────────────────────────────────────────────────┤
│  MAC MINI M2 (Laguna M1 Engine)       ||  PC X86 (Sovereign Compute)        │
│  cmux cluster:                          ||  cmux cluster:                     │
│  ├─ [claude-worker] (zsh)             ||  ├─ [opencode-worker] (pwsh)       │
│  └─ [codex-worker] (zsh)              ||  └─ [hermes-master] (pwsh)         │
│  Local AST & Cross-Compiler Harness     ||  Local DeepSeek Heavy Ingestion      │
└───────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 State Persistence Architecture

| Layer | Description | Storage | Cache Hit Rate |
|-------|-------------|---------|---------------|
| **Layer 1** | Global Invariant System Core | Workers KV + Local Redis | 99% |
| **Layer 2** | Domain/Project Invariant Spec | Workers KV | 90% |
| **Layer 2.5** | Compressed Rolling Summary | Memory Compaction | 85% |
| **Layer 3** | Active Conversation Window | 4-6 message frames | 70% |
| **Layer 4** | Ephemeral Execution Packet | Runtime metadata | Variable |

---

## 2. Source Code References

### 2.1 wrangler.toml (Template Ready)
**File:** `legacy/cloudflare/wrangler.toml.edge-orchestrator.template`
Status: Archived compatibility evidence

### 2.2 index.ts (Cloud Edge)
**File:** `legacy/cloudflare/index.ts`
Status: Archived compatibility evidence

### 2.3 StateLockerDo.ts (Archived Durable Object Prototype)
**File:** `legacy/StateLockerDo.ts`
Status: Archived compatibility evidence; not an active deploy target

---

## Safety Constraints

```
no_deploy: true          - No production deployment without approval
no_push: true            - No git push without approval
no_cloud_mutation: true  - No cloud resource changes without approval
dry_run_only: true       - Reference/documentation only
allowed_tier: B         - Local infrastructure work only
```

---

**Next Action:** Operator review required before Phase 5B/5C activation
