# Production System Architecture
# Generated: Reverse Engineering Analysis
# Source: ton36475-lgtm GitHub org + Local Mac Mini M2

```mermaid
graph TB
    subgraph "GitHub Repositories (ton36475-lgtm)"
        OS1[sirinx-os<br/>Private<br/>Migration/v5-rebase]
        OS2[sirinx-co<br/>Public]
        SK1[unknowcoding-newbie-dev-skill<br/>Public]
        SK2[sirinx-skills-kit<br/>Public]
        SOLAR[sirinx-solar-energy<br/>Public<br/>42 agents]
        GC[ghost-claw-os<br/>Public]
        HOS[hermes-os<br/>Private]
    end

    subgraph "Mac Mini Environment"
        subgraph "Hermes Profile (solis)"
            H[Hermes Agent<br/>Commander]
            C[Codex Worker<br/>Build Captain A3]
            K[Kimi K2/Code Worker<br/>A2]
            CLA[Claude Worker<br/>Reviewer]
            B[Browser QA Worker<br/>A3]
            KOB[KOB Validator<br/>A]
        end

        subgraph "GHOSTCLAW Stack"
            GC1[GHOSTCLAW/AGENTS.md<br/>Authority Chain]
            GC2[GHOSTCLAW/vibe/<br/>vibe-agent-router.mjs]
            GC3[GHOSTCLAW/workers/registry/<br/>worker-registry.json - 18 workers]
            GC4[GHOSTCLAW/policies/<br/>action-tier-cap.yaml]
        end

        subgraph "Services & Adapters"
            OR[OmniRoute :20128<br/>Running ✓]
            AR[anthropic-cybersecurity-skills<br/>817 skills/29 domains]
            OC[openclaw<br/>:18789]
            MCP[MCP Services<br/>Multiple servers]
        end

        subgraph "A2A Queue System"
            Q1[_A2A_QUEUE/inbox/]
            Q2[_A2A_QUEUE/outbox/]
            Q3[_A2A_QUEUE/working/]
            Q4[_A2A_QUEUE/done/ - 15+ packets]
        end
    end

    subgraph "Skills Ecosystem"
        SP[superpowers/ 64 skills<br/>TDD, Debugging, Planning]
        GCW[GHOSTCLAW/skills/ 6 skills<br/>governance, integration]
        CR[CodexSkills<br/>Private mirror]
        UK[unknowcoding-skills<br/>Full-stack dev]
    end

    subgraph "Mobile/Termux (Planned)"
        RM[R36MAX Mobile Node v0.2.0<br/>Not deployed]
        RS[r36ctl CLI<br/>Pending]
    end

    %% Connections
    OS1 <--> H
    GC <--> H
    H --> C
    H --> K
    H --> CLA
    H --> KOB
    
    OR --> H
    AR --> K
    MCP --> B
    
    Q1 --> H
    H --> Q2
    Q2 <--> C
    Q3 <--> K
    Q4 --> KOB
    
    SP --> H
    GCW --> H
    UK --> H
    
    style OR fill:#90EE90
    style H fill:#87CEEB
    style K fill:#FFD700
    style AR fill:#FFA500
```

## Kimi K3 Swarm System Analysis

### Agent Hierarchy (From AGENTS.md Chain)
```
Human Operator
    ↓
Hermes Mission Commander (Router)
    ↓
Opus Chief Architect (Design)
    ↓
Codex Build Captain (Code execution)
    ↓
GLM/DeepSeek/Kimi Workers (Module execution)
    ↓
KOB Validator (Testing)
    ↓
Command Broker (Final gate)
```

### Worker Capabilities Matrix
| Worker | Model | Lane | Task Types | Tier |
|--------|-------|------|------------|------|
| codex-worker | Local/OmniRoute | build | code_gen, git_op, docs | A3/B |
| kimi-worker | kimi_k2_7_code | code_patch | code_gen, moa_vote, reference | A2 |
| claude-worker | claude-sonnet-4 | review | arch_design, docs, code_review | A2 |
| glm-worker | glm_5_2_max | research | research, analysis | B |
| deepseek-worker | deepseek-v4 | research | research, analysis | B |
| browser-use-worker | playwright | browser_qa | smoke_test, verify | A3 |

### System Files Integration Map
```
Primary AGENTS.md: /Users/sirinx/sirinx-os/AGENTS.md (422KB)
GHOSTCLAW AGENTS.md: /Users/sirinx/sirinx-os/GHOSTCLAW/AGENTS.md (5KB)
Worker Registry: GHOSTCLAW/workers/registry/worker-registry.json (1086 lines)
Vibe Router: GHOSTCLAW/vibe/vibe-agent-router.mjs (628 lines)
Action Tier: GHOSTCLAW/policies/action-tier-cap.yaml
Security Guard: GHOSTCLAW/policies/security-cost-guard-integration.v1.yaml
```

### Live Sync Status
- OmniRoute :20128 ✓ Running
- A2A Queue : 15+ completed packets
- Kimi Code process : Active (PID 41274)
- Codex processes : 8+ processes active

## Upgrade Path

1. ✓ Kimi & Claude workers added to vibe router
2. ✓ Security skills cloned (Apache-2.0)
3. ✓ Policies integrated
4. 🔄 Testing vib pipeline
5. ⏳ Production deployment (approval required)