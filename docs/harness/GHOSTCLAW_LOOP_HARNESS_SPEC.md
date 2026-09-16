# GhostClaw Loop-Engineered Harness Spec

## Status

Addendum: `GHOSTCLAW_LOOP_ENGINEERED_HARNESS_ADDENDUM_V1.9`

Decision: adopt partial. The primary plan remains Hermes Command Center, Agent Orchestrator, OpenCode review-only, deterministic validation, receipts, and human gates. The loop harness is an inner quality loop inside one lane or worktree.

## Position

```text
Hermes
  -> Risk / Scope / Receipt Gate
  -> Agent Orchestrator
  -> Worktree Lane
  -> Loop Harness
  -> Worker Model
  -> Guard
  -> Validate
  -> Reviewer
  -> Receipt
  -> Human Gate
```

Layer name: `LAYER_12B_LOOP_ENGINEERED_HARNESS`.

## Purpose

Use this harness when a bounded lane needs tighter execution quality before review:

- debug failing tests
- fix broken local logic
- bounded refactor inside one scope
- regression work
- validation failure repair

Do not use it for push, deploy, live Telegram send, Cloudflare/R2 mutation, provider calls, secret work, broad dirty-tree cleanup, or unbounded multi-agent work.

## Required Loop

Each loop run must execute this sequence:

1. Plan
2. Clarify or stop if requirements are ambiguous
3. Write task list and explicit stop tests
4. Run bounded worker action
5. Guard changed paths and forbidden actions
6. Run deterministic validation before reviewer judgment
7. Prepare review packet for OpenCode or reviewer lane
8. Write iteration receipt
9. Stop when pass criteria are met or iteration cap is reached

## Hard Caps

- default max iterations: 3
- absolute max iterations: 5
- one lane/worktree per loop
- reviewer must not be the same mutating worker for critical gates
- every iteration must record changed paths and validation evidence

## Scope Lock

Active focus:

- `sirinx.co`
- `AGM AutoFlow`

Paused/out of scope:

- `Kusala`
- `กุศลา`
- `Final Farewell`
- `Phitsanulok News`
- `Phitsanulok United News`

Any active candidate path matching paused scope fails the loop.

## Mutation Boundary

Default mode is `local_safe_no_commit`.

Blocked unless a separate exact gate exists:

- stage or commit
- push or deploy
- live Telegram, LINE, email, or customer send
- provider/model call
- Cloudflare/R2 mutation
- secret read or print
- queue payload execution
- worker start/restart

## Required Stop Tests

At minimum:

- packet JSON parses
- receipt JSON parses
- declared input paths exist
- changed paths match allowed paths
- paused projects excluded
- secret scan clean
- diff check clean
- no skipped validation claim

## Pass Criteria

The loop can report ready for review only when:

- all stop tests pass
- iteration receipt exists
- reviewer packet exists or is explicitly not required for docs-only work
- no forbidden action is recorded
- next human gate is explicit and narrow

## Local Validator

Use the local validator before routing a harness packet to OpenCode:

```bash
python3 scripts/ghostclaw_loop_harness_validate.py --write
```

The validator is dependency-free and writes only local evidence, receipt, and
read-only review-packet artifacts. It does not execute worker loops, consume A2A
queue gates, call providers, read secrets, commit, push, deploy, or mutate cloud
systems.

## Orchestrator Status Surface

After validator artifacts exist, expose them to Hermes/Codex/OpenCode through
the orchestrator status surface:

```bash
python3 scripts/ghostclaw_a2a_agent_orchestrator.py --loop-harness-status --write
```

For sidebar/compact status, use:

```bash
python3 scripts/ghostclaw_a2a_agent_orchestrator.py --compact
```

When the validator evidence, validator receipt, and OpenCode review packet all
pass, compact mode adds `quality_loop_plane` and routes the reviewer lane to
`review_loop_harness_packet_read_only`. This is a review signal only. It does
not open queue replenish, worker-envelope, ack, commit, push, deploy, provider,
Telegram, or Cloudflare/R2 gates.
