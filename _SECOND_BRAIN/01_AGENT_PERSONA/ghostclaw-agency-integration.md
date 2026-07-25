# GhostClaw Agency Integration Notes

## Agent Division Structure (from agency-agents)
Divisions: Engineering, Design, Marketing, Product, QA, Support, Spatial Computing

## GhostClaw Model Router Update

| Role | Model | Usage |
|------|-------|-------|
| Primary Commander / Final Decision | GPT-5.5 | Strategic decisions, final approval |
| Coding Worker / Patch Builder | Kimi K2.7 Code | Code generation, patch creation |
| Reasoning / Architecture | DeepSeek V4 Pro | Architecture design |
| Repo-wide Mapping / Long-context | GLM 5.2 Max | Large codebase analysis |
| Critic / Validator / Honesty Review | Claude Opus 4.8 | Quality review |

## Security Integration Rules

### Auto-block
- D/X actions (Delete/Execute dangerous)
- Secret reads
- .env access
- Provider API key print

### Gate Required (Explicit Approval)
- Deploy
- LINE webhook
- Production analytics
- CRM/customer data storage

### Local Allowed (No Approval)
- Repo read
- Diff analysis
- Task decomposition
- Local patch plan
- Receipt write

## Implementation Path
1. เพิ่ม GhostClaw Model Router config
2. สร้าง agency persona templates
3. สร้าง division-based worker dispatch
4. เพิ่ม policy validator สำหรับ agent outputs