# SIRINX Atomic Grid Workboard

Status: LOCAL-ONLY GRID CHECKPOINTS

This folder splits the large MCP / Hermes / Video AI grid pack into small Codex-friendly goals. Use one file per conversation or one file per implementation checkpoint.

## Workboards

- [MCP / Hermes / Video AI Atomic Grid](#phase-order)
- [SIRINXDev Unified Agent-Native OS Atomic Grid](./sirinxdev/README.md)

## Phase Order

1. [01-master-grid.md](./01-master-grid.md) - Master architecture.
2. [02-mcp-migration.md](./02-mcp-migration.md) - MCP 2025-11-25 to 2026 draft migration.
3. [03-agentic-parallel.md](./03-agentic-parallel.md) - Agentic fan-out and parallel tools.
4. [04-mcp-tasks-lifecycle.md](./04-mcp-tasks-lifecycle.md) - MCP Tasks lifecycle.
5. [05-mcp-apps.md](./05-mcp-apps.md) - MCP Apps iframe model.
6. [06-hermes-wsl.md](./06-hermes-wsl.md) - Hermes WSL normal vs TUI.
7. [07-ai-video-pipeline.md](./07-ai-video-pipeline.md) - AI video editing pipeline.
8. [08-ai-apps-taxonomy.md](./08-ai-apps-taxonomy.md) - AI apps taxonomy.
9. [09-full-stack-implementation.md](./09-full-stack-implementation.md) - SIRINX implementation grid.
10. [10-risk-verification.md](./10-risk-verification.md) - Truth, risk, and approval grid.
11. [11-gateway-agent-a2a2loopsync.md](./11-gateway-agent-a2a2loopsync.md) - Gateway Agent runtime lanes and A2A2LoopSync.
12. [12-ai-team-pairing.md](./12-ai-team-pairing.md) - 47 Ronin AI team pairing and messaging boundary.
13. [13-connector-registry.md](./13-connector-registry.md) - Local-only plugin capability registry.
14. [14-local-rag-turbovec.md](./14-local-rag-turbovec.md) - Local RAG prototype with optional turbovec runtime.
15. [15-hermes-image-edit.md](./15-hermes-image-edit.md) - Caption-bound Hermes image-to-image edit route and acceptance packet.
16. [16-godmode-continuation-grid.md](./16-godmode-continuation-grid.md) - Godmode continuation grid, secret containment, gates, and node topology.
17. [17-agent-repo-lab-install-grid.md](./17-agent-repo-lab-install-grid.md) - Agent Repo Lab deep-research install grid, gated repo intake, and fullstack node topology.
18. [18-upstream-godmode-v4-triage-grid.md](./18-upstream-godmode-v4-triage-grid.md) - Upstream Godmode v4 transcript verification, local evidence check, and install block.
19. [19-repo-analysis-superpowers-freedomain.md](./19-repo-analysis-superpowers-freedomain.md) - Repository-analysis framework applied to Superpowers and FreeDomain.
20. [20-context-engineering-grill-with-docs.md](./20-context-engineering-grill-with-docs.md) - Context-first Grill with Docs gate for SIRINX planning and approval.
21. [21-cloudflare-edge-agent-team-v8-2.md](./21-cloudflare-edge-agent-team-v8-2.md) - SIRINXDev v8.2 M2-first control node with approved Cloudflare Edge Agent Team.

## Maintainers

| File | Maintainer role | Review focus |
| --- | --- | --- |
| [01-master-grid.md](./01-master-grid.md) | Architecture owner | Continuity with SIRINX OS, governance, and product lanes |
| [02-mcp-migration.md](./02-mcp-migration.md) | Backend / protocol owner | MCP draft alignment, stateless transport, explicit handles |
| [03-agentic-parallel.md](./03-agentic-parallel.md) | Agent runtime owner | Fan-out, task handles, merge verification |
| [04-mcp-tasks-lifecycle.md](./04-mcp-tasks-lifecycle.md) | Backend / queue owner | Task state, cancellation, durable result lookup |
| [05-mcp-apps.md](./05-mcp-apps.md) | Frontend / security owner | Sandboxed iframe, postMessage, UI resource boundary |
| [06-hermes-wsl.md](./06-hermes-wsl.md) | CLI runtime owner | WSL detection, TUI fallback, terminal performance |
| [07-ai-video-pipeline.md](./07-ai-video-pipeline.md) | Media workflow owner | Transcript, subtitle, cut, style-memory artifacts |
| [08-ai-apps-taxonomy.md](./08-ai-apps-taxonomy.md) | Research owner | Tool taxonomy, unverified ranking guardrails |
| [09-full-stack-implementation.md](./09-full-stack-implementation.md) | Full-stack owner | API/UI/data/ops wiring and legacy path continuity |
| [10-risk-verification.md](./10-risk-verification.md) | Governance owner | Truth labels, approval gate, blocked actions |
| [11-gateway-agent-a2a2loopsync.md](./11-gateway-agent-a2a2loopsync.md) | Gateway owner | Codex/Hermes/Gemini runtime lanes, A2A2LoopSync, approval stop |
| [12-ai-team-pairing.md](./12-ai-team-pairing.md) | Shogun / scribe | 47-role pairing, A2A channels, Telegram/LINE block |
| [13-connector-registry.md](./13-connector-registry.md) | Security / planner | Plugin capability map, owner packets, connector activation block |
| [14-local-rag-turbovec.md](./14-local-rag-turbovec.md) | Scribe / backend | Safe corpus scan, optional turbovec dependency, local retrieval boundary |
| [15-hermes-image-edit.md](./15-hermes-image-edit.md) | Hermes / media owner | Image_ref passthrough, caption binding, acceptance packet, text-to-image fallback block |
| [16-godmode-continuation-grid.md](./16-godmode-continuation-grid.md) | Hermes / governance owner | Secret containment, continuation gates, node topology, approval stop |
| [17-agent-repo-lab-install-grid.md](./17-agent-repo-lab-install-grid.md) | Repo intake / security owner | Third-party repo research, shallow clone gate, install block, supply-chain review |
| [18-upstream-godmode-v4-triage-grid.md](./18-upstream-godmode-v4-triage-grid.md) | Repo intake / governance owner | Upstream transcript verification, missing local evidence, install/start/restart block |
| [19-repo-analysis-superpowers-freedomain.md](./19-repo-analysis-superpowers-freedomain.md) | Repo analyst / infrastructure owner | Repository learning prompt, Superpowers methodology mapping, FreeDomain staging boundary |
| [20-context-engineering-grill-with-docs.md](./20-context-engineering-grill-with-docs.md) | Hermes / governance / developer worker | Context interview, non-goal lock, implementation plan, approval gate, verification evidence |
| [21-cloudflare-edge-agent-team-v8-2.md](./21-cloudflare-edge-agent-team-v8-2.md) | Hermes / Cloudflare edge planner / security owner | M2-first control node, Cloudflare edge-agent boundary, private dev approval packet, no deploy |

## Migration Notes

- Master pointer: [../knowledge/SIRINX_MCP_HERMES_VIDEO_AI_GRID_MERMAID_2026-05-26.md](../knowledge/SIRINX_MCP_HERMES_VIDEO_AI_GRID_MERMAID_2026-05-26.md).
- Godmode syntax pointer: [../knowledge/SIRINX_GODMODE_GRID_MERMAID_SYNTAX_2026-05-28.md](../knowledge/SIRINX_GODMODE_GRID_MERMAID_SYNTAX_2026-05-28.md).
- Agent Repo Lab install matrix: [../knowledge/SIRINX_DEEP_RESEARCH_AGENT_REPO_INSTALL_MATRIX_2026-05-28.md](../knowledge/SIRINX_DEEP_RESEARCH_AGENT_REPO_INSTALL_MATRIX_2026-05-28.md).
- Upstream Godmode v4 triage: [../knowledge/SIRINX_AI_COMPANY_GODMODE_V4_REPORT_TRIAGE_2026-05-28.md](../knowledge/SIRINX_AI_COMPANY_GODMODE_V4_REPORT_TRIAGE_2026-05-28.md).
- Superpowers + FreeDomain repo analysis: [../knowledge/SIRINX_REPO_ANALYSIS_SUPERPOWERS_FREEDOMAIN_2026-05-28.md](../knowledge/SIRINX_REPO_ANALYSIS_SUPERPOWERS_FREEDOMAIN_2026-05-28.md).
- Context Engineering / Grill with Docs gate: [../knowledge/SIRINX_CONTEXT_ENGINEERING_GRILL_WITH_DOCS_2026-05-28.md](../knowledge/SIRINX_CONTEXT_ENGINEERING_GRILL_WITH_DOCS_2026-05-28.md).
- SIRINXDev v8.2 Cloudflare edge plan: [../knowledge/SIRINXDEV_UNIFIED_AGENT_NATIVE_OS_V8_2_CLOUDFLARE_EDGE_PLAN_2026-05-30.md](../knowledge/SIRINXDEV_UNIFIED_AGENT_NATIVE_OS_V8_2_CLOUDFLARE_EDGE_PLAN_2026-05-30.md).
- Review priority from the checkpoint note: `01-master-grid.md`, `03-agentic-parallel.md`, and `09-full-stack-implementation.md`.
- Merge, CI, and publishing are not local documentation actions. They require the normal external gate workflow before any push, PR, or public publication.
- Legacy path references must stay explicit. If a grid points outside `/Users/sirinx/sirinx-os`, mark it as `external_reference` and do not mutate it from this folder.

## Atomic Codex Prompt

```text
Use only docs/grid/06-hermes-wsl.md.
Goal: improve this one grid only.
Definition of Done:
- Keep one focused Mermaid block.
- Add any missing implementation notes below it.
- Run secret scan.
- Stop after reporting the exact changed file.
Do not modify any other grid.
```

## Definition Of Done Per Grid

- One topic only.
- One Mermaid diagram unless the file explicitly needs a table.
- Clear source boundary: observed, verified, unverified, or template.
- No secret values.
- No deploy, push, publish, connector activation, real MCP, paid API, customer send, or production write.

## Stop Rule

If the task needs more than one grid file, stop and create a new phase plan first.
