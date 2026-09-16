# Security Skills Wrapper Skill
# Integrates Anthropic Cybersecurity Skills into GHOSTCLAW Vibe Coding

schema: ghostclaw.skill.security_wrapper.v1
name: security-skills-wrapper
display_name: Security Skills Wrapper
version: "1.0.0"
category: security

## Purpose
Bridge between Anthropic Cybersecurity Skills and GHOSTCLAW vibe coding system

## Task Mapping

### From Cybersecurity Skills
| Skill ID | Task Type | Worker Assignment |
|----------|-----------|-------------------|
| detecting-ai-model-prompt-injection-attacks | code_generation | kimi-worker |
| auditing-mcp-servers-for-tool-poisoning | research | kimi-worker |
| securing-agentic-ai-tool-invocation | research | claude-worker |
| testing-prompt-injection-in-rag-pipelines | code_review | claude-worker |

## Vibe Task Parser Extensions

### Security Task Patterns
- "analyze security of {target}" → research
- "detect prompt injection in {file}" → code_generation  
- "audit mcp server {name}" → research
- "security review" → code_review

## Usage

### Natural Language Commands
```bash
# Vibe commands for security analysis
"Detect prompt injection vulnerabilities in this codebase"
"Audit MCP tools for security issues"
"Security review of agentic tool calls"
```

### Programmatic Usage
```javascript
// In vibe pipeline
{
  task_type: "code_generation",
  worker: "kimi-worker",
  description: "Create prompt injection detection wrapper",
  autonomy_level: "A2",
  evidence_required: true
}
```

## Security Guardrails
- No model download
- No GPU inference
- No secret access
- No deploy/push
- Dry-run first for analysis tasks
- Receipt required for all actions

## Evidence Pack
- decision_id required
- requester_agent ≠ approver_agent
- blocked_actions logged