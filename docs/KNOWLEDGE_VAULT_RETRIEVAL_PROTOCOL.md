# Knowledge Vault Retrieval Protocol

## Task Context Steps

When assigned a task, execute these steps in order:

1. **Identify project_id** — extract from task description, queue item, or mission envelope.
2. **Identify action_tier** — classify the action as A (read), B (doc/config), C (code/script), D (high impact), or X (forbidden).
3. **Read project registry** — open `.ghostclaw/registry/project-registry.v1.yaml` and find the entry for your project_id. Extract constraints, routes, build order, and retrieval keys.
4. **Read domain pack** — open `.ghostclaw/registry/domain-pack-index.v1.yaml`, find the domain pack for your project. Also read the full domain pack file from the referenced path.
5. **Read route matrix** — open `.ghostclaw/registry/route-matrix.v1.yaml`. Find the row matching your task_type. Note the primary, reviewer, architect, and validator agents.
6. **Read knowledge vault index** — open `.ghostclaw/registry/knowledge-vault-index.v1.yaml`. Identify which knowledge artifacts are relevant (paying attention to the `retrieval_keys` field).
7. **Retrieve only needed files** — read only the artifacts identified in step 6. Do not read the entire vault.
8. **Create mission envelope** — compact YAML frontmatter (see template below).
9. **Create lease** — write a lease file to `.ghostclaw_runtime/leases/{mission_id}.lease.json`.
10. **Execute action** — within tier constraints only.
11. **Validate** — run any validators specified in the route matrix.
12. **Write receipt** — write receipt to `.ghostclaw_runtime/receipts/{mission_id}.receipt.json`.

## Forbidden Context Behavior

- Do NOT paste all memories into prompt context.
- Do NOT create a giant master file aggregating all knowledge.
- Do NOT read every file in the knowledge vault — read only what the index says is relevant.
- Do NOT skip the registry read phase, even if you think you know the project.
- Do NOT mutate files without a lease in place.
- Do NOT write a receipt for work you did not fully complete.

## How to Read the Knowledge Vault Index

The index at `.ghostclaw/registry/knowledge-vault-index.v1.yaml` contains entries like:

```yaml
- id: "kv-arch-003"
  title: "SIRINX Solar Carport Architecture"
  type: architecture
  path: "docs/solar-energy-intelligence-phase-1.md"
  retrieval_keys: ["sirinx-solar-carport", "architecture", "phase-1"]
  summary: "System architecture for the solar carport monitoring dashboard"
```

To retrieve: match your project_id and task_type against `retrieval_keys`, then read only the files at the matching `path` values.

## Local Worker CLI

Use the stdlib-only local worker for bounded retrieval packs:

```bash
python3 scripts/ghostclaw_knowledge_vault_retrieval_worker.py \
  --project-id ghostclaw-os \
  --tier C \
  --task-type repo_or_architecture \
  --max-entries 12 \
  --output .ghostclaw_runtime/a2a2a/evidence/knowledge-context-pack.json
```

The worker emits JSON with project metadata, route metadata, domain-pack
metadata, and ranked `source_pointers`. It does not read target knowledge files,
does not load the full vault, does not use network calls, and filters unsafe
secret-like paths.

## Determine Retrieval Scope by Action Tier

| Tier | Retrieval Scope |
|------|----------------|
| **A** | Read project registry + route matrix only. No vault retrieval needed unless specifically asked. |
| **B** | Read project registry, domain pack, route matrix, and any knowledge artifacts tagged `doc` or `policy`. |
| **C** | Read everything relevant — registry, domain pack, route matrix, and all knowledge artifacts matching retrieval_keys. |
| **D** | Full retrieval plus policy guardian review. Must be explicitly approved. |
| **X** | No retrieval — action is forbidden. |

## Compact Mission Envelope Template

```yaml
---
mission_id: "mis-20260703-001"
parent_mission_id: null
project_id: "sirinx-solar-carport"
task_type: "public_site_ui"
tier: "B"
primary_agent: "codex"
reviewer_agent: "opencode"
architect_agent: "opus"
validator_agent: "validator"
constraints:
  - "No cross-file overwrite"
  - "Must use existing Tailwind theme"
retrieval_keys:
  - "sirinx-solar-carport"
  - "public_site_ui"
lease_path: ".ghostclaw_runtime/leases/mis-20260703-001.lease.json"
---
```

## Lease Creation and Management

Leases are written to `.ghostclaw_runtime/leases/{mission_id}.lease.json`:

```json
{
  "mission_id": "mis-20260703-001",
  "project_id": "sirinx-solar-carport",
  "agent": "codex",
  "tier": "B",
  "files": ["src/pages/index.tsx", "src/components/Hero.tsx"],
  "issued_at": "2026-07-03T10:00:00Z",
  "expires_at": "2026-07-03T12:00:00Z",
  "status": "active"
}
```

Leases expire automatically. Do not extend your own lease. If you need more time, submit a new mission.

## Receipt Writing Requirements

Receipts are written to `.ghostclaw_runtime/receipts/{mission_id}.receipt.json`:

```json
{
  "mission_id": "mis-20260703-001",
  "project_id": "sirinx-solar-carport",
  "agent": "codex",
  "actions_taken": ["Edited src/pages/index.tsx", "Updated Hero component"],
  "files_changed": ["src/pages/index.tsx", "src/components/Hero.tsx"],
  "validated": true,
  "lease_closed": true,
  "completed_at": "2026-07-03T11:30:00Z"
}
```

A receipt is not valid unless `validated` is true and `lease_closed` is true.

## Example Session

**Scenario**: You are working on the SIRINX Solar Carport Website. Task is to update the hero section copy.

1. **Identify project_id**: `sirinx-solar-carport`
2. **Identify action_tier**: B (doc/config change — copy update)
3. **Read project registry**: Find entry for `sirinx-solar-carport` — notes Tailwind theme, Next.js app, routes to `public_site_ui`
4. **Read domain pack**: Find `sirinx-solar-carport` domain pack — contains brand copy, design tokens, color palette
5. **Read route matrix**: Find `public_site_ui` route — primary: codex, review: opencode, arch: opus, val: validator
6. **Read knowledge vault index**: Match keys `sirinx-solar-carport` + `public_site_ui` — retrieves `kv-site-001` (brand guide)
7. **Retrieve only** the brand guide file
8. **Create mission envelope** with project_id, tier, agent assignments
9. **Create lease** scoped to `src/components/Hero.tsx`
10. **Execute**: Update hero copy per brand guide
11. **Validate**: Check copy matches brand guide, check no lint errors
12. **Write receipt**: Confirm changes, mark validated and lease_closed
