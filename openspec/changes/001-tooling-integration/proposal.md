# Proposal: GHOSTCLAW Tooling Integration
## Change ID: 001-tooling-integration

### Problem Statement
GhostClaw needs to integrate external tooling (OpenClaw, 9Router, OpenSpec, etc.) without losing control over:
- Secret handling
- Provider ToS compliance
- Cost tracking
- Security boundaries

### Proposed Solution
1. Create tooling registry with policy tiers
2. Implement file lease system for any tool mutations
3. Use OpenSpec for spec-driven tool integration
4. Gate all tool usage through Policy Guardian

### Acceptance Criteria
- [ ] Registry YAML created with all tools
- [ ] Policy tiers defined (A/B/C/D/X)
- [ ] Receipt evidence generated
- [ ] No secrets in repo
- [ ] No external installs without approval