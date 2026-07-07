# CLAUDE.md Addendum — Multi-Coding-Model Orchestration

## Role

Claude Code / Fable acts as orchestrator and synthesis lead.

Do not spend premium reasoning on routine edits.
Delegate.

## Delegation Rules

- deep-reasoner: architecture, complex debugging, irreversible decisions.
- fast-worker: mechanical edits, tests, formatting, simple docs.
- laguna-free-coder: free coding drafts, test scaffolds, small patches.
- qwen3-coder-free: repository-aware coding drafts and tool-use tasks.
- kimi-code-worker: long-horizon implementation and UI/code generation after budget gate.
- deepseek-architect: architecture alternatives and hard failure analysis.
- glm-repo-mapper: long-context repo mapping and dependency scanning.
- codex-peer: alternate implementation, rescue, adversarial review.

## Parallel Gate

For T3/T4-adjacent decisions:

1. Ask deep-reasoner.
2. Ask Codex independently.
3. Optionally ask deepseek-architect or kimi-code-worker.
4. Do not show one answer to another.
5. Synthesize.
6. Validator checks evidence.
7. Write receipt.

## Token Discipline

- Read AGENTS.md and only the relevant OpenSpec.
- Load context maps before raw source.
- Use small diffs.
- Ask subagents for concise conclusions.
- Do not open broad files unless necessary.
