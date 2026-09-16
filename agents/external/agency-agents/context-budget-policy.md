# Agency Context Budget Policy

Mission: `GHOSTCLAW_AGENCY_IMPORT_COMPACT_V1`

## Default Budget

```yaml
agency_context_budget:
  full_roster_loaded: false
  max_agents_installed_opencode: 80
  max_agents_registered_total_initial: 48
  max_agents_loaded_per_task: 3
  max_divisions_per_task: 1
  default_mode: reference_only
  install_requires_C_gate: true
```

## Context Rules

1. Never paste the full upstream roster into an agent prompt.
2. Never load all divisions for a single packet.
3. Load at most one division manifest and three agent profiles for a task.
4. Prefer role summaries and routing maps over raw prompt files.
5. Treat upstream stats and social claims as drift-prone unless freshly
   verified from primary sources.
6. Keep GhostClaw receipts as the durable audit trail, not model memory.

## Packet Loading Pattern

For each packet, load only:

- mission id and packet id
- selected GhostClaw role
- selected division
- up to three selected agents
- current file lease
- latest validation receipt

## Stop Conditions

Mark `BLOCKED` if a task requires loading full upstream prompts, installing all
agents, calling a paid provider, reading secrets, mutating cloud resources, or
writing outside the file lease.
