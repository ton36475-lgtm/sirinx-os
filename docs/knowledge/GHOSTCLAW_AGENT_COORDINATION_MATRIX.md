# GhostClaw Agent Coordination Matrix

## Canonical Ownership

GhostClaw uses one command chain and one main-worktree writer. Runtime snapshots,
dashboard rosters, and the 47-role display are views only; they do not grant
ownership.

| Stage | Owner | May write source? | Required output |
| --- | --- | --- | --- |
| Intake | Telegram Controller | No | Authenticated command receipt |
| Command | Hermes | No | Ordered task envelope and stop conditions |
| Architecture | Claude Code | No | Architecture packet and invariants |
| Implementation | Codex Build Captain | Yes, with path lease | Patch and focused test evidence |
| Review | OpenCode GLM-5.2 | No | Review receipt or patch candidate in outbox |
| Validation | KOB | No | Fail-closed validation verdict |
| Policy | Policy Guardian | No | Independent veto/approval verdict |
| Report | Hermes | No | Final handoff receipt |
| Observe | Mission Control | No | Read-only status |
| Memory | Obsidian Brain | No source writes | Concise append-only pulse |

## Non-Overlap Rules

1. Codex is the only main-worktree writer and scoped Git owner.
2. Every implementation requires `task_id`, `lane_id`, `owner`, `allowed_paths`,
   `lease_id`, `base_sha`, and `expected_outputs`.
3. Two active leases may not include the same file or parent directory.
4. Claude Code and OpenCode emit architecture/review artifacts; Codex decides
   whether to apply them.
5. KOB validates but never patches. Telegram approves/routes but never executes
   arbitrary shell. Mission Control never mutates state.
6. A process is active only with a current heartbeat and lease. An old tmux pane,
   mailbox file, or UI roster is not execution proof.
7. Workers may not self-approve, commit, push, deploy, or start MCP servers.

## Model Routing

- Architecture: Claude Code with custom provider `glm`, gated by
  `GLM_SHARED_KEY` and a successful smoke test.
- Implementation: current local Codex session.
- Review: OpenCode `glm/glm-5.2` when the shared credential passes a smoke test.
  Until then use verified fallback `opencode/deepseek-v4-flash-free` in
  read-only review mode.
- Failed provider health blocks only that lane, not the entire mission.

## MCP Wiring

MCP is a connector layer owned by `mcp_connector`. Inventory and health checks
are allowed by default. Starting a server, enabling an unpinned `npx` command,
or permitting a remote write requires an explicit task packet. Secrets stay in
the runtime credential store and must not appear in config, receipts, Telegram,
or Obsidian.

## Audit

```bash
node scripts/ghostclaw-agent-coordination-audit.mjs --store
```

The command validates ownership, registry aliases, mission freshness, locks,
provider routes, and active lease conflicts. It writes a sanitized receipt to
`.ghostclaw_runtime/a2a2a/evidence/agent-coordination-audit-latest.json`.
