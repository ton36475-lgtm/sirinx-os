# Implementation Plan

## Phase 1: Contract Test
- Add `hermes-spec-first-swarm.test.mjs`.
- Verify it fails because the contract does not exist.

## Phase 2: API Contract
- Add local-only module.
- Add GET and POST dry-run routes.
- Keep all capability flags false.

## Phase 3: Live State And Docs
- Create `.hermes` live project files.
- Create `docs/00-06` workflow files.
- Add knowledge docs and gateway-agent index entry.

## Phase 4: Dashboard
- Add panel markup.
- Add fallback and renderer.
- Load `/api/hermes-spec-first-swarm`.
- Verify no executable buttons.

## Phase 5: Verification
- Wire scripts.
- Run targeted test, related API tests, dashboard e2e, check, workspace verification, secret scan, and diff check.
