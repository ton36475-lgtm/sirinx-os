# AI CLI/TUI Operator Runbook — Codex + Claude Code on Mac mini M2

**Version:** 1.0  
**Date:** 2026-07-02  
**Scope:** Local-safe operation of Codex CLI/TUI and Claude Code CLI/TUI inside GhostClaw/SIRINX workflows  
**Policy Tier:** B_LOCAL_DOC_CONFIG  

---

## 1. Tool Roles

| Tool | Primary Role | Mutation Rights | Review Rights |
|---|---|---|---|
| **Codex CLI/TUI** | Primary mutating builder | Yes, within leased scope | No formal review lane |
| **Claude Code CLI/TUI** | Planner / reviewer / architecture critic | No, unless explicitly leased | Yes |
| **OpenCode** | QA / review only | No | Yes |
| **Hermes** | Control plane / routing / final report | No | No |
| **Validator** | Local validation / schema check | No | Yes |
| **Policy Guardian** | Final safety gate | No | Yes |

---

## 2. Daily Startup Sequence

```bash
# 1. Ensure PATH
export PATH="$HOME/.local/bin:$PATH"

# 2. Verify tools
which codex && codex --version
which claude && claude --version

# 3. Enter target repo
cd /Users/sirinx/sirinx-os

# 4. Check repo state
git status --short

# 5. Open tool of choice
codex    # or: claude
```

---

## 3. Codex TUI Quick Reference

| Command | Purpose |
|---|---|
| `codex` | Start TUI in current repo |
| `/mcp` | List MCP servers and config |
| `/help` | Show available commands |
| `exit` or `quit` | Leave TUI |

Codex reads config from:

- `~/.codex/config.toml` (global)
- `.codex/config.toml` (project-local)
- `~/.codex/AGENTS.md` (global instructions)
- repo `AGENTS.md` (project instructions)

---

## 4. Claude Code CLI Quick Reference

| Command | Purpose |
|---|---|
| `claude` | Start interactive session |
| `claude -p "prompt"` | Single-turn prompt mode |
| `claude -c "command"` | Command mode |
| `/memory` | Show loaded memory/CLAUDE.md files |
| `/init` | Initialize project memory |
| `/help` | Show commands |

Claude Code reads config from:

- `~/.claude/CLAUDE.md` (global)
- repo `CLAUDE.md` (project-local)

---

## 5. Safety Rules

### Forbidden Commands (do not run)

```bash
git push
git add .
rm -rf <anything outside /tmp or explicit target>
vercel deploy
netlify deploy
firebase deploy
supabase db push
railway up
fly deploy
aws *
gcloud *
az *
kubectl apply
terraform apply
pulumi up
npm publish
pnpm publish
```

### Allowed Commands (no approval needed)

```bash
git status
git diff
git diff --stat
git log --oneline -10
python3 scripts/ghostclaw_registry_validate.py
find . -type f
```

### Commands Requiring Explicit Gate

- install / update CLI
- npm/pnpm install
- database migration
- cloud deploy
- customer send
- provider API call

---

## 6. Workflow for a New Task

1. **Hermes receives task** via Telegram or manual input.
2. **Identify project_id** from route matrix.
3. **Identify action_tier** (A/B/C/D/X).
4. **Retrieve context** using knowledge vault index.
5. **Create mission envelope** and lease.
6. **Assign primary agent:**
   - Build task → Codex
   - Review/Architecture → Claude Code or Opus
   - QA → OpenCode
   - Validation → Validator
7. **Execute** local-safe action.
8. **Validate** with available validators.
9. **Write receipt** to `.ghostclaw_runtime/a2a2a/receipts/`.
10. **Hermes reports** final status.

---

## 7. File Lease Convention

Before any mutation, create or check lease:

```json
{
  "mission_id": "...",
  "file": "path/to/file",
  "leased_by": "codex",
  "leased_at": "2026-07-02T00:00:00+07:00",
  "expires_at": "2026-07-02T04:00:00+07:00"
}
```

Store in `.ghostclaw_runtime/a2a2a/locks/` or project queue.

---

## 8. Receipt Convention

Every completed task must have a receipt:

```json
{
  "mission_id": "...",
  "agent": "codex",
  "requester_agent": "hermes",
  "approver_agent": "policy-guardian",
  "policy_tier": "B",
  "files_changed": [...],
  "validation_status": "PASS",
  "blocked_items": [],
  "timestamp": "..."
}
```

---

## 9. Troubleshooting

| Symptom | Fix |
|---|---|
| `codex: command not found` | `export PATH="$HOME/.local/bin:$PATH"` |
| `claude: command not found` | check standalone install path or reinstall |
| Auth failure | run `codex` or `claude` and follow browser/API-key login |
| MCP not loading | check `~/.codex/config.toml` and `/mcp` output |
| CLAUDE.md not loaded | run `/memory` and verify file path |

---

## 10. References

- `docs/MAC_M2_AI_CLI_INSTALL_UPDATE_RECEIPT.md` — install gate packet
- `docs/CODEX_CLAUDE_CODE_LOCAL_WORKFLOW.md` — detailed workflow
- `.ghostclaw/registry/agent-registry.v1.yaml` — agent roles
- `.ghostclaw/registry/route-matrix.v1.yaml` — task routing
- `AGENTS.md` — project operating law
- `CLAUDE.md` — Claude Code instructions
