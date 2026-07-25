# Brainstorm: GHOSTCLAW System Integration Plan
# Date: 2026-07-19
# Status: Planning Phase

## 1. Goal

Integrate Anthropic Cybersecurity Skills + Kimi/Claude workers เข้ากับ GHOSTCLAW Vibe Coding system เพื่อให้ Agentic Coding ทำงานคุ้มค่า

## 2. Current State Assessment

### ✅ Completed
- OmniRoute server running on :20128
- vibe-agent-router.mjs updated with kimi-worker + claude-worker
- claude-reviewer.md agent card created
- security-cost-guard-integration.v1.yaml configured

### 🔄 In Progress
- OmniRoute health verification
- Worker registration validation

### ❌ Pending
- Security skills integration (AI Security x14, Mobile Security x13)
- Vibe pipeline testing
- Receipt documentation

## 3. Integration Roadmap

### Phase A: Security Layer (Tier A - Auto Approve)
```yaml
tasks:
  - task_id: PHASE-A-01
    title: "Configure Security Guardrails"
    description: Apply cost multipliers for security skills
    worker: kob-validator
    tier: A
    
  - task_id: PHASE-A-02
    title: "Create Security Agent Wrapper Skill"
    description: Build skill for agent_security integration
    worker: codex-worker
    tier: B
```

### Phase B: Skills Integration (Tier B - Controlled)
```yaml
tasks:
  - task_id: PHASE-B-01
    title: "Select Top 6 AI Security Skills"
    description: Choose most relevant for GHOSTCLAW
    worker: kimi-worker
    tier: B
    skills:
      - detecting-ai-model-prompt-injection-attacks
      - auditing-mcp-servers-for-tool-poisoning
      - securing-agentic-ai-tool-invocation
      - testing-prompt-injection-in-rag-pipelines
      - implementing-llm-guardrails-for-security
      - red-teaming-llms-with-garak

  - task_id: PHASE-B-02
    title: "Create Security Skill Wrappers"
    description: Convert to GHOSTCLAW skill format
    worker: claude-worker
    tier: B
```

### Phase C: Vibe Pipeline Test (Tier B)
```yaml
tasks:
  - task_id: PHASE-C-01
    title: "Test Vibe Pipeline with Security Task"
    description: Route security analysis through pipeline
    worker: vibe_coding_agent
    tier: B
```

### Phase D: Production Integration (Tier C - Quorum Required)
```yaml
tasks:
  - task_id: PHASE-D-01
    title: "Security Skills Production Review"
    description: Full integration with approval
    worker: hermes-commander
    tier: C
```

## 4. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| eval/exec in security repo | High | Static scan complete, blocked patterns noted |
| Cost overruns | Medium | Cost guard enforced per tier |
| Worker misconfiguration | Low | Receipt-based validation |

## 5. Success Criteria

- [ ] 6 AI security skills integrated
- [ ] Vibe pipeline routes to kimi-worker successfully  
- [ ] Receipt created for each skill integration
- [ ] Security cost guard prevents overspend
- [ ] No blocked actions in production flow

## 6. Next Actions (Immediate)

```yaml
immediate_actions:
  - action: Run security scan on changes
    command: bash .worktrees/claude/docs/superpowers/plans/vibe-status-check.sh
    tier: A
    
  - action: Validate vibe-agent-router changes
    command: node --check GHOSTCLAW/vibe/vibe-agent-router.mjs
    tier: A
    
  - action: Create receipt for session
    command: Write to .ghostclaw_runtime/a2a2a/receipts/
    tier: A
```

## 7. Timeline

- **Phase A:** Complete
- **Phase B:** Next 1-2 hours
- **Phase C:** Once Phase B verified
- **Phase D:** Upon approval

---

*Canonical terminology: brainstorm (canonical), not "beststorm" or "beststrom"*