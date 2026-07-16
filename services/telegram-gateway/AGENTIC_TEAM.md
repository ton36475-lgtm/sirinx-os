# SIRINX Agentic Coding Team

## Ownership

| Role | Responsibility | May write repository files |
|---|---|---|
| Hermes Command Center | Prioritize, approve, pause, and report | No |
| Claude Code | Architecture and hard-code review | No |
| Codex | Implementation, tests, integration, and Git state | Yes |
| OpenCode + GLM-5.2 | Optional bounded review or subagent analysis | No |
| Telegram | Authenticated command ingress and status delivery | No |
| MCP servers | Connector capabilities under the task policy | No by default |
| Cloudflare deployment lane | R3 inventory and R4 packet preview | No |

Codex is the only repository writer. A worker must not start until its task
envelope names an owner, allowed paths, dependencies, validation, and an
active path lease. Review agents return artifacts to Hermes; they do not
commit or dispatch another writer.

## Canonical Control Path

```text
Telegram command
  -> telegram-command-router.mjs
  -> Hermes policy and gate check
  -> A2A2A task envelope
  -> Codex implementation
  -> Claude/OpenCode review artifacts
  -> Codex integration and validation
  -> Hermes status and receipt
```

The first Cloudflare topology keeps the Pages frontend separate from the public
router and the future agent control plane. Worker-to-Worker calls should use a
service binding; Telegram never runs Wrangler directly.

Canonical files:

- `configs/ghostclaw_agent_coordination.config.json`
- `services/dev-control-api/src/telegram-command-router.mjs`
- `services/dev-control-api/src/agent-coordination-contract.mjs`

The Python files in this directory are fail-closed compatibility shims. They
must not open a listener, write approval packets, or dispatch OpenCode.
