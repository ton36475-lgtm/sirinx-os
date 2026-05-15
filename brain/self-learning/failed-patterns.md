# Failed Patterns

Status: Level 1 memory candidate
Scope: Failure summaries and prevention rules
Runtime impact: none

## Failure Rules

- Record failures as sanitized summaries only.
- Do not paste raw terminal logs if they contain private data.
- Do not include secrets, `.env` values, credentials, tokens, private keys, cookies, or passwords.
- Every failed pattern must include a prevention rule.

## Failed Patterns

### FP-001: Broad scope before safety boundaries

Context: A task asks for self-learning or automation without explicit allowed paths.

Failure mode:

- The agent may inspect or modify files outside the intended documentation scope.
- The task may accidentally include source code, runtime configuration, migrations, or external systems.

Impact:

- Increased review burden.
- Higher risk of unintended behavior changes.

Prevention rule:

- Require an explicit allowed path list and forbidden action list before editing files.

Verification:

- Changed files are limited to approved paths.
- `git status` and diff summary are reviewed before commit.

### FP-002: Treating raw conversation as memory

Context: A task asks for daily learning or work memory.

Failure mode:

- Raw chat text may include private instructions, credentials, customer details, or irrelevant noise.

Impact:

- Memory becomes hard to review.
- Private or sensitive data may be retained incorrectly.

Prevention rule:

- Convert work into concise, sanitized lessons with evidence references instead of raw chat logs.

Verification:

- Learning files contain structured summaries only.
- No secret-like values appear in the diff.
