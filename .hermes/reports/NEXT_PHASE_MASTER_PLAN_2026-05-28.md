# Next Phase Master Plan

Generated: 2026-05-28 02:38 +0700
Mode: local-only plan and evidence

## Summary

The next phase is not safe to start with provider usage because raw tokens were pasted into chat. P0 is token rotation and evidence containment. After that, the first local implementation slice remains the n8n MCP permission policy display.

## Phase Order

| Phase | Name | Status | Action |
| --- | --- | --- | --- |
| P0 | Secret exposure containment | human required | revoke/rotate exposed provider tokens, record non-secret evidence |
| P1 | Local n8n MCP policy display | blocked by implementation approval | local API/dashboard only |
| P2 | External evidence gates | blocked by incomplete evidence | fill one non-secret evidence gate |
| P3 | Agent repo lab intake | blocked by clone approval | metadata first, shallow clone only after approval |
| P4 | Monorepo Phase 0 scaffold | blocked by implementation approval | security-freeze docs and scaffold |
| P5 | Mission Control vertical slice | future | command to approval to evidence to vault |
| P6 | Product lanes | future | Solar, GhostClaws, AGM, ADS Queen after control plane stability |

## Grid Outputs

- `docs/grid/16-godmode-continuation-grid.md`
- `docs/knowledge/SIRINX_GODMODE_GRID_MERMAID_SYNTAX_2026-05-28.md`
- `docs/grid/17-agent-repo-lab-install-grid.md`
- `docs/knowledge/SIRINX_DEEP_RESEARCH_AGENT_REPO_INSTALL_MATRIX_2026-05-28.md`
- `docs/agents/SIRINX_FULLSTACK_AGENTIC_TEAM_NODE_DIAGRAM_2026-05-28.md`

These files provide the advanced Mermaid grid, node topology, state machine, execution sequence, and permission grid for the next phase.

## Agent Repo Lab Update

The repo-lab phase now has a gated install matrix and fullstack agentic team diagram. It covers MCP, n8n official MCP, n8n-mcp, OpenHands, Software Agent SDK, CrewAI, LangGraph, Dify, Agent-S, and llama.cpp.

No repo was cloned or installed. The next repo-lab unlock is:

```text
APPROVE_AGENT_REPO_LAB_CLONE for vendor/agent-lab metadata-only shallow clone
```

This unlock only permits shallow clone plus manifest/security review. It does not permit install, Docker, MCP registration, provider calls, n8n workflow access, GUI control, deploy, push, publish, or external send.

## P0 Required Human Work

Revoke or rotate tokens for:

- xAI
- OpenAI
- Anthropic
- Cloudflare
- Hugging Face
- GitHub
- other provider-style tokens pasted in the same chat

Do not paste replacements into chat.

## Current Local Verification

Before this plan:

- `pnpm audit:secrets`: passed, no local findings in configured roots.

Final verification after this plan:

- JSON parse of `.hermes/state.json`: passed.
- `git diff --check`: passed.
- `pnpm audit:secrets`: passed, no findings in configured scanned roots.
- `pnpm external-gates:evidence-check`: passed as local evidence check; status remains `blocked-evidence-incomplete`.

Grid implementation verification after Mermaid upgrade:

- `docs/grid/16-godmode-continuation-grid.md`: created.
- `docs/knowledge/SIRINX_GODMODE_GRID_MERMAID_SYNTAX_2026-05-28.md`: created.
- `docs/grid/README.md`: updated with grid 16 and syntax pointer.
- JSON parse of `.hermes/state.json`: passed.
- `git diff --check`: passed.
- `pnpm audit:secrets`: passed, no findings in configured scanned roots.
- `pnpm check`: passed.
- `pnpm external-gates:evidence-check`: passed as local evidence check; status remains `blocked-evidence-incomplete`.

Agent Repo Lab deep-research pass:

- `docs/knowledge/SIRINX_DEEP_RESEARCH_AGENT_REPO_INSTALL_MATRIX_2026-05-28.md`: created.
- `docs/grid/17-agent-repo-lab-install-grid.md`: created.
- `docs/agents/SIRINX_FULLSTACK_AGENTIC_TEAM_NODE_DIAGRAM_2026-05-28.md`: created.
- `docs/superpowers/plans/2026-05-28-agent-repo-lab-install-plan.md`: created.
- `.hermes/reports/AGENT_REPO_DEEP_RESEARCH_STATUS_2026-05-28.md`: created.
- JSON parse of `.hermes/state.json`: passed.
- `git diff --check`: passed.
- `pnpm audit:secrets`: passed, no findings in configured roots.
- `pnpm check`: passed.
- `pnpm validator-shield:test`: passed.
- `pnpm external-gates:evidence-check`: passed as local evidence check; status remains `blocked-evidence-incomplete`.

## Next Exact Approval For Source Work

```text
APPROVE_IMPLEMENTATION for n8n permission policy display
```

This approval only unlocks local API/dashboard display of the n8n MCP policy. It does not approve MCP registration, n8n workflow access, provider calls, deploy, push, external send, or secret use.
