# AGENTS.md Addendum — Coding Model Router V2.1

## Scope

This addendum applies to model selection, coding worker routing, OpenRouter integration, local model integration, Claude Code subagents, Codex peer review, OpenCode review lanes, and Hermes orchestration.

## Default Router Philosophy

Use the cheapest safe model that can complete the job.

- Local model first for classification, summarization, repo-map drafts, and lightweight edits.
- Free OpenRouter model for first-draft coding and tests.
- Paid/OpenAI/Claude/Codex models only for high-value reasoning, final synthesis, or review gates.
- Fable/Hermes should orchestrate, not brute-force implementation.
- Codex is a peer engineer and implementation specialist, not a blind reviewer.
- Validator decides evidence quality, not model confidence.

## Hard Blocks

Never use any model lane for:

- provider limit bypass
- account rotation for evasion
- credential sharing
- secret read/print
- proxy evasion
- production deploy
- DNS mutation
- customer data mutation
- Telegram live send
- LINE webhook activation
- paid high-volume calls without budget approval
- broad repo rewrite without OpenSpec and file lease
- modifying unrelated files

## Task Tiers

### T0 — Trivial / Mechanical

Use:
- local_qwen_worker
- sonnet_fast_worker
- laguna_free_coder

Allowed:
- small docs update
- formatting
- narrow test generation
- typo/copy correction
- schema stub

### T1 — Small Patch

Use:
- laguna_free_coder
- qwen3_coder_free
- sonnet_fast_worker

Require:
- diff review
- narrow validation
- receipt

### T2 — Feature Slice

Use:
- qwen3_coder_free or kimi_code_worker for draft
- Codex peer review
- Validator receipt

Require:
- OpenSpec task ID
- layer ownership
- no cross-lane mutation

### T3 — Architecture / Debugging Heavy

Use:
- deepseek_architect
- opus_deep_reasoner
- Codex peer engineer
- Fable/Hermes synthesis

Require:
- parallel decision gate
- risk/rollback analysis
- receipt

### T4 — Production / Secrets / Customer / Deploy

Use:
- human gate only

Model output may prepare a plan, but cannot execute.

## Model Output Contract

Every worker must return:

1. summary
2. files inspected
3. proposed files touched
4. risk
5. tests to run
6. confidence
7. next action

No worker may claim completion without command output or a receipt.
