# Security Skills Vibe Integration Workflow
# Connects cybersecurity skills → vibe pipeline → kimi-worker

workflow_schema: ghostclaw.security_vibe_integration.v1

## Integration Points

### 1. Skill Parser Extension
```javascript
// GHOSTCLAW/vibe/vibe-task-parser-extension.mjs
const SECURITY_SKILL_PATTERNS = [
  { pattern: /detect.*prompt.*injection/i, task_type: 'code_generation', worker: 'kimi-worker' },
  { pattern: /audit.*mcp.*server/i, task_type: 'research', worker: 'kimi-worker' },
  { pattern: /security.*review/i, task_type: 'code_review', worker: 'claude-worker' },
  { pattern: /guardrail.*implementation/i, task_type: 'code_generation', worker: 'kimi-worker' }
];
```

### 2. Worker Task Types Extension
```javascript
// In vibe-agent-router.mjs WORKER_REGISTRY
'kimi-worker': {
  task_types: [
    'code_generation',
    'patch_planning', 
    'test_planning',
    'moa_reference_vote',
    'security_analysis'  // NEW
  ]
}
```

### 3. Security Skills Bridge
```bash
# Command to analyze security
node GHOSTCLAW/vibe/vibe-agent-router.mjs "Analyze prompt injection risks in MCP servers using kimi-worker security_analysis"
```

## Live Connection Status

✅ **Source:** security/anthropic-cybersecurity-skills/
✅ **Target:** vibe-agent-router.mjs
✅ **Worker:** kimi_coding_worker (registered)
✅ **Policy:** security-cost-guard-integration.v1.yaml
✅ **Receipt:** generated

## Integration Flow

```
Cybersecurity Skill Request
        ↓
Vibe Task Parser (security pattern)
        ↓
Kimi Worker (A2 autonomy)
        ↓
Security Guardrails Applied
        ↓
Receipt Generated → A2A Queue
```

## Next Steps

1. Extend vibe-task-parser.mjs with security patterns
2. Test live pipeline: `node vibe-agent-router.mjs "Detect prompt injection in codebase"`
3. Validate evidence pack creation
4. Archive to Obsidian Brain