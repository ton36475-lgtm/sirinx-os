# SOP_LIBRARY — SIRINX Operator OS

> Standard Operating Procedures. Each SOP is self-contained: trigger → steps → verification.
> Written to be executed by any capable AI model or a human engineer.

---

## SOP-01 — Start any task (Task Card)

**Trigger:** any non-trivial request.

```text
Goal:
Constraints:            (no deploy, no push, no secrets, dry-run only, …)
File Scope:             Allowed: …  Forbidden: infra/cloudflare/**, .env, deploy scripts
Expected Result:
Verification:           (tests, manual flow, no external calls)
Report Format:          Summary / Files changed / Tests / Risks / Next task
```

No task card → write one first. Ambiguous "auto everything" → reject, offer A/B/C/D gates.

## SOP-02 — New feature dry-run pipeline

1. Build against **mock adapter** only (`EXTERNAL_SEND_ENABLED=false` family).
2. Unit tests pass locally.
3. Manual mock flow passes end-to-end.
4. Log evidence path into VALIDATION_MATRIX.md.
5. Only then propose staged adapter with real credentials (SRL-5, still no send).

## SOP-03 — Pre-commit safety scan

1. `git diff --staged` — review every hunk.
2. Grep staged files for: `api_key|secret|token|password|BEGIN.*PRIVATE`.
3. Confirm no `.env*` staged (only `.env.example` allowed).
4. Confirm target branch is `staging/*`, never `main` directly.
5. Push requires explicit human approval per hard rules.

## SOP-04 — Incident / runaway agent

1. Kill switch first (`*_ENABLED=false`), questions later.
2. Freeze the queue; do not let retries continue.
3. Capture: correlation_id, agent card, tool calls, cost events.
4. Write incident note in KNOWN_ISSUES.md with timeline.
5. Root cause via systematic-debugging (4 phases) before any fix lands.

## SOP-05 — Adding a new agent

1. Write **Agent Card** (role, tools allowed/forbidden, budget, stop conditions, escalation).
2. Assign autonomy level (A-scale) and tool tiers (T-scale).
3. Add to agent registry + dev dashboard queue view.
4. Golden dataset cases for its verdict layer.
5. Dry-run week before any A5 privilege.

## SOP-06 — Post-work memory pulse (Obsidian Brain Sync)

After meaningful architecture/runtime/automation work:

1. Append ONE concise pulse to `SIRINX/AI HQ Knowledge Digest.md`:
   what changed · evidence path · next safe action.
2. No secrets, no raw logs, no frontmatter rewrites.
3. Detailed artifacts stay in repo; digest links to paths.

## SOP-07 — Model routing for a coding task

1. Cheapest safe model first (local → cheap API → frontier).
2. Frontier model only when: architecture design, multi-file refactor, or 2 failed attempts.
3. Paid calls behind budget gate; log provider + cost estimate per run.
4. T4+ actions (deploy/secret/customer) never delegated to a model — human gate.

## SOP-08 — Weekly asset maintenance (this library)

1. Re-read PROJECT_STATE.md; update any SOP that drifted.
2. Move dead SOPs to archive with a deprecation note, never silent-delete.
3. Version bump in MASTER_INDEX.md changelog.
