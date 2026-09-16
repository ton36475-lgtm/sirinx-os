# Codex + Claude Code Local Workflow

**Version:** 1.0  
**Date:** 2026-07-02  
**Scope:** How Codex CLI/TUI and Claude Code CLI/TUI integrate into GhostClaw/SIRINX local-safe workflows  
**Policy Tier:** B_LOCAL_DOC_CONFIG  

---

## 1. Role Split

### Codex CLI/TUI

- **Primary mutating builder**
- Owns: repo inspection, local docs, schemas, scripts, tests, receipts
- Allowed tiers: A, B, C
- Forbidden: D/X without separate gate

### Claude Code CLI/TUI

- **Planner / reviewer / architecture critic**
- Owns: diff review, design proposals, QA checklist, risk findings
- Allowed tiers: A, B
- Mutation: only if explicitly leased and policy-approved

### OpenCode

- **QA / review only**
- Must not mutate source files

---

## 2. Context Retrieval Order

When starting any task, read in this order:

1. `AGENTS.md` (project root)
2. `CLAUDE.md` (project root, if exists)
3. `PROJECT_STATE.md`
4. `NEXT_ACTIONS.md`
5. `.ghostclaw/registry/project-registry.v1.yaml`
6. `.ghostclaw/registry/domain-pack-index.v1.yaml`
7. `.ghostclaw/registry/route-matrix.v1.yaml`
8. `.ghostclaw/registry/knowledge-vault-index.v1.yaml`
9. Relevant source files only

**Never load all memories into one prompt.**

---

## 3. Task Routing

Use `.ghostclaw/registry/route-matrix.v1.yaml` to assign lanes:

| Task Type | Primary | Reviewer | Architect | Validator | Smoke |
|---|---|---|---|---|---|
| Repo / Architecture | Codex | OpenCode | Opus/Architect | Validator | — |
| Public Site UI | Codex | OpenCode | — | — | Browser Smoke |
| Creative Asset | Creative Prompt | Thai Text QA | — | — | — |
| Business Automation | Codex | Policy Guardian | — | Validator | — |
| Research / Reverse Eng | Repo Mapper/Research | — | Opus/Architect | — | — |
| Security / OSINT | Defensive Report | Policy Guardian | — | — | — |
| Model Router | Model Router | Policy Guardian | — | — | — |

---

## 4. Mission Envelope Template

Every task should begin with a compact mission envelope:

```yaml
mission_id: "GHOSTCLAW-..."
project_id: "ghostclaw-os"
task_type: "repo_or_architecture"
tier: "B"
primary_agent: "codex"
reviewer_agent: "opencode"
files_allowed:
  - "docs/**"
  - ".ghostclaw/registry/**"
files_forbidden:
  - ".env"
  - "infra/cloudflare/**"
  - "secrets/**"
receipt_path: ".ghostclaw_runtime/a2a2a/receipts/..."
```

---

## 5. Mutation Rules

- No file mutation without lease.
- No cross-file overwrite.
- No blind replacement.
- Append only to `PROJECT_STATE.md`, `NEXT_ACTIONS.md`, `AUTONOMOUS_RUN_LOG.md`.
- Backup before modifying existing instruction files.
- Write receipt after every mutation.

---

## 6. Validation Sequence

After changes:

1. `git status --short`
2. `git diff --stat`
3. `python3 scripts/ghostclaw_registry_validate.py --root /Users/sirinx/sirinx-os`
4. Any project-specific validator
5. Write receipt

---

## 7. Example Session

```bash
# Terminal
cd /Users/sirinx/sirinx-os
export PATH="$HOME/.local/bin:$PATH"
codex
```

Inside Codex TUI:

```text
/ghostclaw-run
MISSION_NAME: GHOSTCLAW_EXAMPLE_LOCAL_TASK
MISSION_ID: GHOSTCLAW-EXAMPLE-20260702-001
REPO: /Users/sirinx/sirinx-os
TIER: B
PRIMARY: codex
REVIEWER: opencode
TASK: Update domain-pack-index.v1.yaml with new design tokens for sirinx-solar-carport.
```

Codex will:

1. Read `AGENTS.md`
2. Read project registry
3. Read domain pack
4. Create lease
5. Edit file
6. Validate
7. Write receipt

---

## 8. Hard Blocks

These remain blocked regardless of which CLI/TUI is used:

- git push
- deploy
- cloud mutation
- secret read/print
- customer send
- Telegram live send
- paid/provider call
- migration
- merge
- destructive delete
- `git add .`
- blind overwrite

---

## 9. Receipts

Receipts are the source of truth. The sidebar/TUI is only a convenience.

Receipt location:

```text
.ghostclaw_runtime/a2a2a/receipts/{MISSION_ID}.receipt.json
```

Required fields:

- `mission_id`
- `agent`
- `requester_agent`
- `approver_agent`
- `policy_tier`
- `files_changed`
- `validation_status`
- `blocked_items`
- `timestamp`

---

## 10. References

- `docs/AI_CLI_TUI_OPERATOR_RUNBOOK.md`
- `docs/MAC_M2_AI_CLI_INSTALL_UPDATE_RECEIPT.md`
- `.ghostclaw/registry/agent-registry.v1.yaml`
- `.ghostclaw/registry/route-matrix.v1.yaml`
- `.ghostclaw/registry/knowledge-vault-index.v1.yaml`
