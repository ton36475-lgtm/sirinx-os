# DEEP_RESEARCH_AGENTIC_TEAM.md
## Research Sub-Agent Team Structure

### Core Research Agents (Activated)
1. **Cloudflare Worker Agent** - WASM optimization, KV patterns
2. **Linear Task Agent** - Issue tracking, CI/CD gating flows  
3. **Figma UI Agent** - Component integration, Dev Dashboard
4. **Notion Knowledge Agent** - Vault sync, documentation extraction
5. **GitHub Actions Agent** - Workflow patterns, webhook handling
6. **Superbase (Supabase) Agent** - Table design, realtime sync
7. **Sports/Pets Agent** - Unknown - awaiting clarification

### Dispatch Protocol
Each agent reads from `agent-sdk/` and writes evidence to `evidence_drop/`
Format: `research/{agent_name}/{task}/artifact.json`

### Shared Memory
- `docs/scaffolds/SYSTEM_WIRING.md` - Cross-system mapping
- `packages/types/` - Shared TypeScript types
- `_A2A_QUEUE/outbox/` - Inter-agent messaging