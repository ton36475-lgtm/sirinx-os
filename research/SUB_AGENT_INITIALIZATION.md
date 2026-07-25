# SUB_AGENT_INITIALIZATION.md

## QuickStart Research Agent Activation

### For Each Agent:
```bash
mkdir -p research/{agent_name}/{task}/evidence
```

### Agent Entry Point:
Each agent reads: `docs/scaffolds/CODING_PROMPT_PACK.md`

### Output Format:
```json
{
  "agent": "name",
  "task": "description",
  "evidence": [...],
  "findings": "...",
  "next_step": "ACTION_REQUIRED"
}
```

### Ready Agents:
- [x] cloudflare
- [x] linear  
- [x] figma
- [x] notion
- [x] github
- [x] superbase
- [?] sports-pets (needs clarification)

*** Initialized research infrastructure ready for agent dispatch