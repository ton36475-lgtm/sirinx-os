# HANDOFF_PROTOCOL

Date: 2026-06-28
Mode: local handoff protocol
External writes: blocked by default

## Pocket Hatchery Handoff Addendum

- `waxwing` signer is office-internal only; do not expose in public docs.
- Pocket Hatchery release readiness score is `34/100`; do not deploy to testnet without R0 approval.
- All R0 gates require explicit per-gate approval from Pitoon.
- State files to update on every handoff: `PROJECT_STATE.md`, `NEXT_ACTIONS.md`, `AUTONOMOUS_RUN_LOG.md`.

## Purpose

This protocol tells Codex, Hermes, and future agent profiles how to hand off work without losing state, leaking secrets, or skipping approval gates.

## Handoff Packet

Every handoff must include:

- Current task and exact next task.
- Repo path and branch.
- Changed files and commit hash if committed.
- Tests/checks run and pass/fail state.
- External gates touched or still blocked.
- Obsidian note path if memory was updated.
- Explicit stop rules for the next worker.

## Memory Rules

- Record decisions, test results, blockers, commands, and commit IDs.
- Do not store raw chat logs, hidden chain-of-thought, `.env`, tokens, keys, cookies, customer private data, Solis credentials, or signing material.
- Use Obsidian as summary memory, not as a secret store.

## Agent Transfer Rules

- `shogun`: owns approval routing and risk class.
- `planner`: owns ordered backlog and prevents task hopping.
- `backend`: owns local API contracts and no-write previews.
- `frontend`: owns Command Center UI, not public homepage unless explicitly assigned.
- `devops`: owns deploy/push/DNS packets, not execution without approval.
- `qa`: owns validation matrix and regression checks.
- `scribe`: owns Obsidian digest and summary-only memory.
