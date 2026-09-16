# ZCode / Z.ai Worker Lane

**Date:** 2026-06-30

---

## ZCode_GLM_Worker

- Lane: ZCode Desktop / GLM
- Auto-spawn: true
- Permissions: long-context analysis, architecture review, refactor proposal, local-safe patch
- Must not: bypass prompts, push, deploy, read secrets

## ZAI_TUI_CLI_Worker

- Lane: local CLI (detection: crush → opencode → z-ai-cli → no_cli)
- Auto-spawn: conditional
- Permissions: review files, suggest patches, static analysis
- Must not: install globally, paste secrets, run provider calls without gate
