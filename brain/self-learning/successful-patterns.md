# Successful Patterns

Status: Level 1 memory candidate
Scope: Reusable work patterns
Runtime impact: none

## Pattern Rules

- A pattern must be short enough to review quickly.
- A pattern must identify the context where it applies.
- A pattern must include at least one verification step.
- A pattern must not contain raw chat logs, secrets, or private data.

## Patterns

### SP-001: Inspect, plan, implement, verify, report

Applies when: Any SIRINX OS task changes files or repository state.

Pattern:

1. Inspect `AGENTS.md`, repository state, and relevant files.
2. Plan exact file scope and safety constraints.
3. Implement only inside the approved scope.
4. Verify syntax, diff, and risk boundaries.
5. Report changed files, checks, risks, and commit readiness.

Verification:

- `git status` reviewed.
- Diff limited to approved paths.
- No forbidden path changes.

### SP-002: Documentation-only learning level

Applies when: Creating or updating Level 1 self-learning artifacts.

Pattern:

1. Keep learning artifacts outside source code and runtime configuration.
2. Write summaries, policies, and review gates instead of executable behavior.
3. Require human review before treating lessons as durable operating rules.

Verification:

- Source code changes: no.
- Runtime configuration changes: no.
- Secrets included: no.
