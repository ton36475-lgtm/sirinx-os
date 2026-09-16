# Model Router

**Date:** 2026-06-30
**Policy:** Model names are routing labels only — no live provider calls

---

## Routing Lanes

| Lane | Model | Purpose |
|---|---|---|
| code_patch | Kimi K2.7 Code | Code patches, file edits |
| repo_mapping | GLM 5.2 Max | Repo-wide analysis |
| architecture | DeepSeek V4 Pro | Architecture design |
| final_decision | GPT-5.5 | Final decision gate |
| critic_review | Claude Opus 4.8 | Code review, critic |

## Fallback Order

1. Codex_Builder
2. ZCode_GLM_Worker
3. ZAI_TUI_CLI_Worker
4. local_static_analysis

## Paid Provider Calls

- Auto-execute: false
- Behavior: create plan only, never execute

## Model Downloads

- Auto-execute: false
- Behavior: create manual gate packet only
