# Level 1 Self-Teaching Loop

Status: Level 1 documentation artifact
Scope: Documentation-only learning workflow
Runtime impact: none

## Goal

Create a repeatable loop for turning completed SIRINX OS work into safe, reviewed learning artifacts.

## Constraints

- Follow `AGENTS.md`.
- Do not change source code.
- Do not change runtime configuration.
- Do not read or print secret values.
- Do not install dependencies.
- Do not run migrations.
- Do not deploy or push.
- Do not store raw chat logs as memory.

## Allowed File Scope

Level 1 self-teaching writes are limited to:

- `docs/knowledge/`
- `brain/self-learning/`
- `councils/`
- `policies/`

## Loop

1. Inspect
   - Confirm repository root.
   - Read `AGENTS.md`.
   - Confirm allowed folders and target files.
   - Check current Git state.

2. Plan
   - List exact files to create or update.
   - State forbidden paths.
   - Identify safety risks.
   - Wait for operator approval when scope is unclear.

3. Write
   - Create concise documentation, patterns, and policy entries.
   - Keep each artifact human-reviewable.
   - Avoid raw logs, private data, and operational secrets.

4. Review
   - Review Markdown for structure, clarity, timeline completeness, and forbidden content.
   - Review YAML for syntax, required identifiers, strict forbidden actions, and reviewer verification.

5. Verify
   - Run syntax checks using existing local tools only.
   - Run diff checks limited to allowed paths.
   - Confirm no source code, runtime configuration, migrations, or secret material changed.

6. Report
   - Summarize changed files.
   - Summarize validation.
   - State risks and remaining manual checks.
   - State whether the change is safe to commit.

7. Commit Ready
   - Commit only the approved documentation and policy files.
   - Do not stage unrelated files.

## Required Output

Each Level 1 run must report:

- Repository root.
- Changed files.
- Source code changes: yes or no.
- Runtime configuration changes: yes or no.
- Secrets included: yes or no.
- Checks run.
- Commit readiness.

## Stop Conditions

Stop and ask for operator review if:

- A requested change touches source code, services, apps, packages, migrations, or runtime configuration.
- A file appears to contain secrets or private data.
- YAML cannot be validated with existing tools.
- Git status shows unexpected changes inside the allowed paths.
- The task requires external systems, cloud mutation, deployment, paid APIs, or customer-facing actions.
