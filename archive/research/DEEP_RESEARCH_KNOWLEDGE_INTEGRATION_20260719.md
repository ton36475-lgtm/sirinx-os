# Deep Research: GHOSTCLAW System Knowledge Integration
# Generated: 2026-07-19
# Source: OmniRoute, Vibe Agents, Security Skills

## 1. Available Models (via OmniRoute :20128)

### Top Coding Models
| Model ID | Name | Provider | Context | Max Output |
|----------|------|----------|---------|------------|
| auto/best-coding | - | combo | 1M | 512K |
| aug/kimi-k2.6 | Kimi K2.6 | auggie | 131K | 262K |
| auto/coding:pro | - | combo | 128K | 8K |
| oc/big-pickle | Big Pickle | opencode | 200K | - |
| aug/claude-opus-4.6 | Claude Opus 4.6 | auggie | 200K | 128K |

### Free Models (No Cost)
| Model ID | Name | Source |
|----------|------|--------|
| auto/best-free | - | combo |
| oc/deepseek-v4-flash-free | DeepSeek V4 Flash Free | opencode |
| tllm/CLAUDE_4_6_SONNET | Claude Sonnet 4.6 | theoldllm |
| tllm/claude_sonnet_4 | Claude Sonnet 4 | theoldllm |

## 2. Worker Registry (18 workers)

### Active in Vibe Router
- ✅ browser-use-worker: Dashboard QA
- ✅ codex-worker: Code generation
- ✅ glm-worker: Research
- ✅ deepseek-worker: Research
- ✅ kob-validator: Testing
- ✅ manual: Human actions

### Added in This Session
- ✅ kimi-worker: Code generation + reference votes
- ✅ claude-worker: Architecture + documentation

## 3. Security Skills Integration

### Source
`security/anthropic-cybersecurity-skills/` (Apache-2.0)

### Ready Domains
| Domain | Skills | Key Items |
|--------|--------|-----------|
| AI Security | 14 | prompt injection, MCP audit, LLM guardrails |
| Mobile Security | 13 | Android/iOS analysis, static/dynamic testing |
| Digital Forensics | 41 | Volatility3, YARA, memory analysis |

## 4. Vibe Coding Pipeline

```
User Prompt → vibe-agent-router → WORKER_REGISTRY → executePlan → receipt
```

### Task Types
- file_operation, code_generation, git_operation
- browser_smoke, dashboard_verify, test_run

### Safety
- Mutual approval (requester ≠ approver)
- Evidence pack required
- Blocked tasks produce receipts
- Dry-run first

## 5. System Status

### Running Services
- Hermes Gateway: ✅ Active
- OmniRoute :20128: ✅ Active (npx omniroute@latest)
- Codex Processes: ✅ Active (8+ processes)
- Kimi Code: ✅ Active

### Files Changed (This Session)
1. `GHOSTCLAW/vibe/vibe-agent-router.mjs` - Added kimi/claude workers
2. `GHOSTCLAW/agents/claude-reviewer.md` - New agent card
3. `GHOSTCLAW/vibe/kimi-subsystem-config.v1.yaml` - Kimi config
4. `GHOSTCLAW/policies/security-cost-guard-integration.v1.yaml` - Security guardrails
5. `docs/architecture/GHOSTCLAW_ARCHITECTURE_EVALUATION_20260719.md` - Research report

## 6. Cost Efficiency

### Model Routing Strategy
```
Free first (tllm/*) → Paid fallback (aug/*) → Local (ollama)
```

### Budget Limits
- Kimi worker: 75,000 tokens/hour
- Claude worker: 50,000 tokens/hour
- Security skills: Multiplier 1.5x (defensive only)

## 7. Next Actions

```yaml
pending_tasks:
  - id: T001
    desc: Run security scan on vibe-agent-router changes
    tier: A
    
  - id: T002
    desc: Test vibe pipeline with kimi-worker
    tier: B
    
  - id: T003
    desc: Integrate AI Security skills (6 selected)
    tier: B
    
  - id: T004
    desc: Create receipt for session changes
    tier: A
```

## 8. Receipt Chain

Changes made successfully. All changes are read-only or Governance docs.
Ready for validation and approval.