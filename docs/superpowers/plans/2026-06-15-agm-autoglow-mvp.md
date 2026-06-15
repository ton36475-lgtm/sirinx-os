# AGM AUTOGLOW MVP Implementation Plan

Status: APPROVED FOR LOCAL MVP  
Date: 2026-06-15  
Scope: local-only scaffolding, schema, prompt compiler, export pack, and safe Chrome side panel shell.

## Non-Goals

- No deploy.
- No push.
- No provider call.
- No live Telegram send.
- No Google Flow auto-clicking.
- No cookie, session, token, or private API access.
- No publish, auto-comment, or external mutation.

## Task 1: Lock Product Spec

Create the v0.2 design spec with product direction, allowed actions, blocked actions, MVP scope, state machine, extension permission rules, and verification commands.

Verification:

- Spec file exists under `docs/superpowers/specs/`.

## Task 2: Add TDD Coverage For Core Engine

Create tests for:

- Project validation.
- Safe policy constants.
- Prompt compilation.
- Markdown export pack.

Verification:

- Tests fail before implementation.
- Tests pass after implementation.

## Task 3: Implement `@sirinx/autoglow-core`

Implement:

- Shared TypeScript types.
- `createMockProject`.
- `validateProject`.
- `compileScenePrompt`.
- `buildMarkdownExport`.
- `buildCsvExport`.

Verification:

- `pnpm exec vitest run packages/autoglow-core/src/index.test.ts`

## Task 4: Add Chrome Side Panel Shell

Implement a loadable Manifest V3 extension:

- `manifest.json`
- `service-worker.js`
- `content-script.js`
- `sidepanel.html`
- `sidepanel.js`

The extension is assisted-only. It can show prompts, copy prompts, mark scene state, and detect safe Flow page state.

Verification:

- Manifest policy tests pass.
- JS syntax checks pass.

## Task 5: Final Local Verification

Run focused checks:

- Core tests.
- Manifest tests.
- JS syntax checks.
- Secret scan.
- Diff whitespace check.

Stop before commit, push, deploy, live Telegram, provider calls, or external publish unless separately approved.
