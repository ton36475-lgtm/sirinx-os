# Agent Lessons

Status: Level 1 memory candidate
Scope: Reviewed summaries only
Runtime impact: none

## Rules

- Store lessons as concise summaries, not raw chat logs.
- Do not include secrets, `.env` values, credentials, tokens, private keys, cookies, or passwords.
- Do not include customer private data.
- Prefer evidence from file paths, test names, command names, commit hashes, and approved summaries.
- Treat every lesson as advisory until reviewed by the operator.

## Lesson Format

Each lesson should use this structure:

```text
ID:
Date:
Context:
What worked:
What failed:
Reusable pattern:
Prevention rule:
Evidence:
Reviewer:
Status:
```

## Current Lessons

### L1-001: Start with repository protocol

Date: 2026-05-16
Context: Level 1 self-learning artifact setup.
What worked: Reading `AGENTS.md` first established the repository safety rules, workflow order, and forbidden actions.
What failed: No failure recorded.
Reusable pattern: Begin every SIRINX OS task with protocol inspection before file edits.
Prevention rule: Do not create learning artifacts until allowed paths and forbidden paths are explicit.
Evidence: `AGENTS.md`; Level 1 artifact file list.
Reviewer: operator required
Status: pending review

### L1-002: Keep learning separate from runtime behavior

Date: 2026-05-16
Context: Level 1 documentation and policy artifact creation.
What worked: Restricting writes to `docs/knowledge/`, `brain/self-learning/`, `councils/`, and `policies/` keeps self-learning separate from production behavior.
What failed: No failure recorded.
Reusable pattern: Use a narrow file scope for memory, policy, and evaluation artifacts.
Prevention rule: Stop if a learning task requires changes under `apps/`, `services/`, `packages/`, migrations, or runtime configuration.
Evidence: Level 1 allowed path list.
Reviewer: operator required
Status: pending review
