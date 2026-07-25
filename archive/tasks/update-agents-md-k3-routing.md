# Claude Code AGENTS.md Update Task
# Vibe Task for claude-worker to update governance files

## Task: Update AGENTS.md for K3-era Routing

### Source Files to Integrate
From agents-md-update-pack.md (from Kimi_Agent_QA archive):

#### 1. Block: MODEL-ROUTING
```markdown
## Model Routing (added 2026-07-19)
- Agents MUST request models by capability tag, never by hardcoded model name:
  orchestrate|verify|audit|root-cause → routed to Kimi K3 (api.moonshot.ai)
  worker|research|draft|transform → routed to GLM-5.2 (z.ai)
  mechanical → routed to DeepSeek V4 Pro
  offline-fallback → local Ollama
- Unknown tag ⇒ escalate to orchestrator route with escalate-cost: true in receipt.
- Cache-first rule: constitution + AGENTS.md + repo map MUST form stable prefix.
- K3 specifics: OpenAI-compatible; always-on thinking; no temperature/top_p.
- Dynamic tool loading (kimi-k3 only): skills with load: dynamic injected on demand.
```

#### 2. Block: RECEIPTS & EVIDENCE
```markdown
## Receipts & Evidence Chain (canonical: QA Swarm Pattern v1.2)
- Every agent action closes with receipt per schema...
- ONLY orchestrator appends to evidence log (assigns seq, hash-chains).
- Status semantics: OK | DONE | BLOCKED | ESCALATE | FIX-REQUEST...
- Cycle bounds: MAX_CYCLES=5, MAX_REDISPATCH=2, RUN_TIMEOUT=15m.
```

#### 3. Block: LIVESYNC & CHANGE TRACKING
```markdown
## LiveSync Change Tracking (schema-only sync)
- Sync target = files listed in .ghostclaw/manifest.json ONLY.
- Approval evaluated AT EXECUTE TIME, not import time.
```

### Integration Instructions for Claude Worker

1. Read all source files from /tmp/kimi-qa-extract/
2. Merge Model Routing block into AGENTS.md (after Section 6)
3. Merge Receipts block into AGENTS.md (after Section 3.3)
4. Merge LiveSync block into AGENTS.md (after Section 3.4)
5. Generate diff report (no direct file modifications without approval)

### Constraint
- Dry-run mode: generate report only
- No file writes without explicit approval
- Use security-cost-guard for cost-aware suggestions