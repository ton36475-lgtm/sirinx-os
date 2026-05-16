---
type: codex-obsidian-memory-protocol
project: SIRINX OS
status: active-local
date: 2026-05-17
---

# Codex Obsidian Memory Protocol

## Purpose

Codex does not rely on vague chat memory for long SIRINX work. The working memory is file-based:

```text
Repo docs + Obsidian notes + Hermes board + verification logs
```

## Start Of Every Vibe-Coding Session

Codex must inspect:

```bash
cd /Users/sirinx/sirinx-os
cat AGENTS.md
pnpm stack:status
pnpm dashboard:status
hermes kanban --board sirinx-os list
```

Then inspect the task-specific Obsidian note under:

```text
/Users/sirinx/Documents/Obsidian Vault/SIRINX/SIRINX OS Knowledge Base/
```

## End Of Every Vibe-Coding Session

Codex must update Obsidian with:

- What was requested.
- What was changed.
- What was verified.
- What remains pending.
- Which actions require approval.
- Which command Hermes should run next.

## Do Not Store

- Raw chat logs.
- Secrets.
- `.env` values.
- Customer private data.
- Unmasked tokens.
- Unverified claims.

## Required Format

```markdown
## YYYY-MM-DD HH:mm Asia/Bangkok

### Request

### Actions Taken

### Verification

### Files Changed

### Risks / Approval Gates

### Next Exact Step
```

## Practical Rule

If the user says `vibe coding`, Codex should treat Obsidian as the project memory layer and update it before reporting final status.
