# SIRINX Godmode Agent Lab v3.0

## Status
Local audit completed on 2026-05-28. The system is ready for the next approval-gated phase, not for uncontrolled installs or cloning.

## Source Of Truth
- Local project: `/Users/sirinx/sirinx-os`
- Live state: `.hermes/`
- Reports: `.hermes/reports/`
- Obsidian operations log: `/Users/sirinx/Documents/Obsidian Vault/SIRINX/06_OPERATIONS/Hermes Night Watch Log.md`

## Confirmed Building Blocks
- Hermes TUI / skills as the primary orchestrator.
- Spec-first approval gate with `APPROVE_IMPLEMENTATION`.
- OpenRouter Qwen adapter exists locally and remains dry-run/status-only until routing approval.
- Team Runtime Bridge remains local-only.
- Night Watch now returns `WARN` with exit code `0`, which should be treated as non-blocking.
- n8n service is reachable on `127.0.0.1:5678`, but `n8n` CLI is not on PATH.
- `n8n-mcp` exists at `/opt/homebrew/bin/n8n-mcp`, but is not registered.

## Research-Backed External Standards
- A2A: agent interoperability, agent discovery, JSON-RPC/HTTP/SSE style coordination.
- MCP: schema-defined tools/resources/prompts with human-in-the-loop control.
- llama.cpp: local OpenAI-compatible `llama-server` endpoint.
- OpenRouter: `qwen/qwen3.7-max` model page and chat completions endpoint.
- WebMCP: Chrome local-development/preview browser tool exposure; not a hard dependency yet.
- UCP/AP2: agentic commerce and payment standards; useful for future SIRINX commerce but gated until a concrete use case is approved.
- Antigravity CLI: useful as a worker lane only after workspace/permission settings are reviewed.

## Gated Actions
- Clone external agent repos: `APPROVE_AGENT_REPO_LAB_CLONE`.
- Install n8n locally: `APPROVE_N8N_LOCAL_INSTALL`.
- Register n8n MCP with Hermes: `APPROVE_HERMES_N8N_MCP_REGISTER`.
- Implement source changes: `APPROVE_IMPLEMENTATION`.

## Recommended Execution Order
1. Fix callback semantics for Night Watch `WARN`.
2. Run `pnpm audit:secrets`.
3. Run `pnpm verify:workspace`.
4. Produce `GITHUB_REPO_INDEX.md` only after an approved GitHub root or clone approval exists.
5. Build a read-only n8n MCP manifest.
6. Start Agent Repo Lab clone only after explicit approval.

## Verification
- `pnpm audit:secrets`: passed.
- `git diff --check`: passed.
- `pnpm check`: passed.
- `pnpm verify:workspace`: passed.

## Stop Point
SIRINX GODMODE AGENT LAB READY - LOCAL AUDIT COMPLETE - WAITING FOR NEXT APPROVAL
