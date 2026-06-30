# GHOSTCLAW Vibe Coding Agent

**Phase:** 5 — Vibe Coding Agent
**Status:** Active (local, safe-worker-tasks only)
**Autonomy Level:** A3-A4 (LLM-assisted parsing + bounded routing)
**Owner:** Hermes Commander
**Parent Policy:** `GHOSTCLAW/policies/autonomous-safe-execution-v3.yaml`

---

## 1. Overview

The Vibe Coding Agent converts natural language commands into structured task graphs, routes them to appropriate GHOSTCLAW workers, and executes safe tasks with full audit trails. It follows the brainstorm-first, mutual-approval-gated workflow defined in the A2A2A protocol.

### Pipeline

```
Natural Language Command
    │
    ▼
┌──────────────────────────┐
│  vibe-task-parser.mjs    │  Parse → VibeTaskGraph
│  (Rule-based + LLM hook) │  Terminology normalization
└──────────┬───────────────┘
           │ VibeTaskGraph
           ▼
┌──────────────────────────┐
│  vibe-agent-router.mjs   │  Select worker per task
│  Create execution plan   │  Request mutual approval
│  Validate vs policy      │  Create decision + evidence pack
└──────────┬───────────────┘
           │ Execution Plan
           ▼
┌──────────────────────────┐
│  Mutual Approval Gate     │  decision_id required
│  (A2A2A protocol)         │  Self-approval blocked
└──────────┬───────────────┘
           │ approved
           ▼
┌──────────────────────────┐
│  Execute Safe Tasks       │  Browser Use Worker
│  via Worker Modules       │  Codex Worker (if available)
│                           │  KOB Validator (if available)
└──────────┬───────────────┘
           │ results + receipts
           ▼
┌──────────────────────────┐
│  Write Receipt            │  JSON receipt per task
│  Archive Plan + Receipt   │  GHOSTCLAW/vibe/archive/
└──────────────────────────┘
```

### Canonical Terminology

| Term | Status |
|---|---|
| brainstorm | **Canonical** — used in all outputs |
| beststorm | Legacy alias — accepted inbound, normalized to `brainstorm` |
| beststrom | **Invalid typo** — rejected on inbound |

---

## 2. Files

| File | Purpose |
|---|---|
| `GHOSTCLAW/vibe/vibe-task-parser.mjs` | Parse natural language into VibeTaskGraph |
| `GHOSTCLAW/vibe/vibe-agent-router.mjs` | Route tasks to workers, create plan, execute |
| `GHOSTCLAW/vibe/vibe-task-graph.schema.json` | JSON schema for task graph validation |
| `GHOSTCLAW/vibe/vibe-execution-plan.template.json` | Template/example for execution plans |

---

## 3. Task Types

| Task Type | Worker | Autonomy | Description |
|---|---|---|---|
| `browser_smoke` | browser-use-worker | A4 | Dashboard smoke test via Playwright |
| `dashboard_verify` | browser-use-worker | A4 | Verify dashboard is running |
| `file_operation` | codex-worker | B | Create/modify files in allowed paths |
| `code_generation` | codex-worker | B | Generate code patches |
| `test_run` | kob-validator | A | Run existing test suite (no install) |
| `git_operation` | codex-worker | B | Git status, diff, branch |
| `docs_update` | codex-worker | B | Write documentation |
| `research` | glm-worker / deepseek-worker | B | Research and analysis |
| `policy_check` | kob-validator | A | Validate against policies |
| `setup` | manual | A0 | Manual setup/configuration |
| `unknown` | manual | A0 | Unknown — human review required |

---

## 4. Blocked Patterns

The parser rejects commands containing:

- `deploy`, `push`, `production`
- `send message`, `telegram`
- `payment`, `login`, `credential`, `secret`, `token`, `password`, `api key`
- `cloud mutation`
- `delete database`, `drop table`
- `install dependency`, `pip install`, `npm install`, `pnpm install`

Blocked tasks produce:
- `status: "blocked"`
- `blocked_reason` matching the pattern
- `safe_replacement` recommendation
- Receipt filed in archive

---

## 5. Mutual Approval

Per the A2A2A protocol and `autonomous-safe-execution-v3.yaml`:

```
mutual_approval:
  requester_not_equal_approver: true
  self_approval_allowed: false
```

The router enforces:
- `requester` must be specified
- `approver` must be specified
- `requester !== approver`
- Self-approval is rejected with `status: "rejected"`
- Safe local plans receive `approval_status: "approved"` only after the mutual approval decision is created
- Execution is refused if `decision_id`, `evidence_pack.required`, or `receipt_required` is missing

### Example Approval Pairs

| Requester | Approver | Valid |
|---|---|---|
| vibe-agent | hermes-commander | ✅ |
| codex-worker | hermes-commander | ✅ |
| hermes-commander | hermes-commander | ❌ Self-approval |
| vibe-agent | vibe-agent | ❌ Self-approval |

---

## 6. Evidence Pack

Every execution plan requires an evidence pack containing:

| Artifact | Format | Description |
|---|---|---|
| Execution Plan | JSON | Full validated plan before execution |
| Decision Artifact | JSON | Mutual approval metadata with `decision_id` |
| Receipt | JSON | Per-task receipt with status, timestamps, errors |
| Screenshot | PNG | Browser worker screenshots (if applicable) |
| Plan | JSON | Full execution plan archived |
| Receipt | JSON | Overall plan receipt with summary |

Artifacts are stored in:
- `GHOSTCLAW/vibe/receipts/` — Active receipts
- `GHOSTCLAW/vibe/archive/<plan-id>/` — Archived plans and receipts

---

## 7. Usage

### Via Import

```javascript
import { runVibePipeline } from './vibe-agent-router.mjs';

// Full pipeline
const result = await runVibePipeline('open dashboard and check if it is running', {
  requester: 'vibe-agent',
  approver: 'hermes-commander',
  brainstormId: 'brainstorm-001',
});

// Dry run
const dryRun = await runVibePipeline('check dashboard', { dryRun: true });
```

### Via Parser Only

```javascript
import { parseMultiStepCommand } from './vibe-task-parser.mjs';

const graph = parseMultiStepCommand('open dashboard then check console errors', {
  requester: 'vibe-agent',
});
console.log(JSON.stringify(graph, null, 2));
```

### Via CLI

```bash
# Parse a command
node GHOSTCLAW/vibe/vibe-task-parser.mjs "open dashboard and check if running"

# Run full pipeline
node GHOSTCLAW/vibe/vibe-agent-router.mjs "open dashboard smoke test"

# Dry run
node GHOSTCLAW/vibe/vibe-agent-router.mjs "check dashboard" --dry-run
```

---

## 8. Schema Validation

The VibeTaskGraph conforms to `vibe-task-graph.schema.json`:

```bash
# Validate a generated task graph
npx ajv validate -s GHOSTCLAW/vibe/vibe-task-graph.schema.json -d task-graph.json
```

Key schema constraints:
- `task_graph_id` must match `^vibe-[a-z0-9]+-[a-z0-9]+$`
- `status` must be one of the defined enum values
- Each task requires `task_id`, `task_type`, and `status`
- `task_type` must be one of the defined enum values
- `worker` must be one of the registered worker IDs
- `autonomy_level` must be one of A0-A6 or X

---

## 9. Worker Integration

### Browser Use Worker (Phase 4)

The Vibe Agent Router integrates with the Browser Use Worker by:

1. Detecting `browser_smoke` or `dashboard_verify` task types
2. Routing to `browser-use-worker` via its module path
3. Calling `worker.main({ url: 'http://127.0.0.1:8721', action: 'smoke' })`
4. Collecting the receipt and adding it to the evidence pack

If the Browser Use Worker is `setup_required`, the router:
- Does NOT attempt installation
- Records the setup requirement in the receipt
- Marks the task as `manual_required`
- Continues with remaining tasks

### Future Workers

The router architecture supports adding new workers by registering them in `WORKER_REGISTRY`:

```javascript
WORKER_REGISTRY['new-worker'] = {
  id: 'new-worker',
  module_path: '/path/to/worker.mjs',
  policy_path: '/path/to/policy.yaml',
  autonomy_level: 'A4',
  task_types: ['new_task_type'],
  description: 'New worker description',
};
```

---

## 10. Safety Inheritance

The Vibe Coding Agent inherits all safety rules from:

- `AGENTS.md` (root) — no deploy, no push, no secrets
- `GHOSTCLAW/AGENTS.md` — no cross-lane writes, hierarchical authority
- `GHOSTCLAW/policies/autonomous-safe-execution-v3.yaml` — Tier A/B auto-execute, Tier X hard-block

Additional agent-specific rules:
- Natural language commands are sanitized and checked for blocked patterns
- Terminology normalization rejects invalid typos (`beststrom` → rejected)
- Mutual approval enforced (requester ≠ approver)
- `decision_id`, `receipt_required: true`, and evidence pack are required before execution
- No task executes without evidence pack creation
- All results archived with receipts

---

## 11. Audit Trail

Every vibe pipeline run produces:

1. **VibeTaskGraph** — parsed command with task nodes
2. **Execution Plan** — validated plan with worker assignments
3. **Per-Task Receipts** — individual task results
4. **Plan Receipt** — overall execution summary
5. **Archive Directory** — `GHOSTCLAW/vibe/archive/<plan-id>/` containing:
   - `plan.json` — full execution plan
   - `receipt.json` — overall receipt

All artifacts are JSON and follow the schema definitions in:
- `vibe-task-graph.schema.json`
- `vibe-execution-plan.template.json`
