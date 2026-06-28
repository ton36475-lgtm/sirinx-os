# NEXT_ACTIONS

Date: 2026-06-28
Mode: strict ordered queue
Source of truth: `AGENTS.md` plus `PROJECT_STATE.md`

## Completed This Session

- [x] Integrate GhostClaws GodMode Mission Control UI + CenterBrain hub runtime bridge.
- [x] Push GodMode changes to `staging/godmode-master-os-v2`.
- [x] Integrate Pocket Hatchery Agent Factory v4 scaffold.
- [x] Add creature catalog schema, sample creatures, metadata manifest, hatch state machine.
- [x] Add contract actions, wallet flow, release gate evidence, rollback plan.
- [x] Add `_A2A_QUEUE/` packets and `WORKSPACE_SCAFFOLD/` tests/scripts.
- [x] Add missing state files (`AUTONOMOUS_RUN_LOG.md`, `SECURITY_GUARDRAILS.md`, `TASK_ROUTER.md`, `INBOX_OUTBOX_PROTOCOL.md`, `LOOP_ENGINEERING.md`).
- [x] Update `PROJECT_STATE.md` with Pocket Hatchery as flagship MVP.
- [x] Run `pnpm verify`, `pnpm centerbrain-shell:check`, and Python tests (16 passing).

## Immediate

- [ ] Task 2.1: Implement pause/unpause acceptance tests for Pocket Hatchery.
  - Goal: verify contract action table documents pause/unpause and rollback plan triggers it.
  - File scope: `WORKSPACE_SCAFFOLD/tests/test_pause_unpause.py`.
  - Verification: `python3 -m unittest discover -s WORKSPACE_SCAFFOLD/tests -v`.

- [ ] Task 2.2: Build read-only creature viewer scaffold.
  - Goal: static markdown/HTML viewer for `sample_creatures.json`.
  - File scope: `apps/pocket-hatchery/web/viewer.md`.
  - Verification: manual review, no external calls.

- [ ] Task 2.3: Run Security Sentinel for waxwing exposure.
  - Goal: scan public-facing docs for `waxwing` leakage.
  - File scope: `WORKSPACE_SCAFFOLD/tests/test_public_signer_exposure.py`.
  - Verification: test passes.

## Approval-Gated

- [ ] R0-01: Approve testnet deploy of Pocket Hatchery.
- [ ] R0-02: Approve real wallet connector implementation.
- [ ] R0-03: Approve merge of `staging/godmode-master-os-v2` to main.

## Backlog

- [ ] LatentMAS transport research (docs-only until benchmark proof).
- [ ] Oracle Memory ψ Vault schema design.
- [ ] 21-agent identity routing wire-up.
- [ ] KOB CLI P1 kobdemy launch.
