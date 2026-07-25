# GhostClaw Rust Migration P115 + Agent Alignment Receipt

Date: 2026-07-23

Status: `PASS_VERIFIED_LOCAL`

Approval gate: `APPROVE_IMPLEMENTATION`

Repository: `/Users/sirinx/sirinx-os`

Branch: `migration/v5-rebase`

Frozen base commit: `b55f81ecd372ff23a34fcf33c2744706447e14ca`

## Delivered slices

### P115/P247 transition mutation-gate preview

- Adds a typed, deterministic preview after the P114/P246 no-mutation packet.
- Maps ready apply, reject, and hold paths into distinct operator-facing gates.
- Fails closed on top-level or nested live flags, mutation claims, invalid gate
  flags, non-ready packets, and approval/action inconsistencies.
- Keeps mutation, queue consumption, source mutation, state mutation, provider
  calls, and external actions disabled.
- Does not apply a transition or consume an approval.

### Deterministic agent alignment training model

- Defines Hermes as the exact sole manager authority outside the execution-agent
  count.
- Allows at most three execution agents and at most two makers.
- Requires at least one distinct read-only verifier.
- Requires unique identities and one exclusive role per execution agent.
- Rejects absolute, traversal, glob, broad-root, backslash, non-canonical, and
  overlapping writer scopes.
- Binds sorted per-agent roles, read-only status, exact paths, and effect flags
  into the deterministic report.
- Keeps live execution and external actions disabled globally and per agent.

“Training model” here means a local deterministic policy and evidence contract.
It does not fine-tune a foundation model, call a provider, or modify global
agent runtime configuration.

## Team and ownership

| Lane | Role | Owned paths |
|---|---|---|
| Hermes/root | manager and integration owner | final validation, receipt, Obsidian pulse |
| Maker A | P115/P247 Rust maker | `review_packet.rs`, its tests/fixture, two migration docs |
| Maker B | alignment Rust maker | `agent_alignment.rs`, module export, its tests/fixture/doc |
| Independent verifier | read-only reviewer | no writable paths |

No out-of-scope file was changed by either maker or the verifier.

## Changed implementation files

1. `docs/AGENT_ALIGNMENT_TRAINING_MODEL.md`
2. `docs/GHOSTCLAW_RUST_MIGRATION_OS_V1_INTEGRATION.md`
3. `docs/REFACTOR_PLAN.md`
4. `src/adapters/agent_alignment.rs`
5. `src/adapters/mod.rs`
6. `src/adapters/review_packet.rs`
7. `tests/agent_alignment.rs`
8. `tests/fixtures/agent_alignment/aligned_report.json`
9. `tests/fixtures/p115/transition_apply_mutation_gate_preview_apply.json`
10. `tests/review_packet.rs`

## Independent validation

Validation used a source-identical copy at
`/tmp/ghostclaw-migration-final.wl34Gv` because the repository root workspace
currently omits this crate.

| Check | Result |
|---|---|
| `cargo fmt --check` | PASS |
| `cargo test --test review_packet --locked --offline` | 125 passed |
| `cargo test --test agent_alignment --locked --offline` | 29 passed |
| strict Clippy, all targets/features, `-D warnings` | PASS |
| full locked offline suite, all targets/features | 237 passed |
| strict JSON parsing with duplicate-key rejection | 2 fixtures passed |
| scoped secret-like value scan | 0 matching files |
| scoped `git diff --check` | PASS |
| trailing-whitespace scan | PASS |
| independent verifier | `VERIFIED` |

## SHA-256 evidence

```text
4cd6acdf526952392f3fa2d6404db98fb9a424b10935cfd79b6a56633063bafa  docs/AGENT_ALIGNMENT_TRAINING_MODEL.md
4221a3c54a5fe2fc774b9ff70d7e5ba678f9fd70f1458ac3d7aef5e8b8657fa8  docs/GHOSTCLAW_RUST_MIGRATION_OS_V1_INTEGRATION.md
38fbab9c1de003cff36889dc8ad7d7bbd15695ff45b3d3a9424641bbf23c10bf  docs/REFACTOR_PLAN.md
99aca8a7b035da1bc5d6c0566ca2374f41e2cabac9afc11f5c96d290929059a2  src/adapters/agent_alignment.rs
86f52b332b3892425d57d628668fdd2ee4a58adc70e0c301d7cc198004cf50b1  src/adapters/mod.rs
cf3b210fdfbd94b50f26e71c323aead66d751ab12597c812ce85bc7d87ffec60  src/adapters/review_packet.rs
a32912a797bd6daa878b59d1790d2c2414146ef7de820639181068d3d11ddda8  tests/agent_alignment.rs
1aaf3cde3c6710fdc6547ba2d13d9e40c48e9d49776557f030db57b7d9acb28a  tests/fixtures/agent_alignment/aligned_report.json
637dc4c2b1af94764b3810da0f5013034770bca000b03391d3a77cd5c36454ad  tests/fixtures/p115/transition_apply_mutation_gate_preview_apply.json
db0562a585e7c57998ef88a5275d864c598ebc94e5e8a6f662d87ebeaae03739  tests/review_packet.rs
```

## Boundaries and residual risks

- Root-workspace integration is `BLOCKED/UNVERIFIED`: the unchanged root
  `Cargo.toml` does not list `crates/ghostclaw_migration_core`.
- Writer-scope isolation is lexical and does not resolve filesystem symlinks.
- P115/P247 trusts the upstream P113/P114 gate chain for its previously
  validated gate-id and exact-text bindings.
- The contract is not yet wired into every live Hermes, Claude, Codex, or
  OpenCode runtime. This receipt verifies the Rust contract and this run's
  governed agent topology only.
- No commit, push, merge, deployment, provider call, Telegram/LINE send, secret
  read, database mutation, or other external action occurred.

## Next safe action

Under a separate scoped approval, decide whether to add the crate to the root
Cargo workspace and validate workspace-wide integration. Keep the following
transition-apply mutation step separately gated; this receipt grants no live or
state mutation authority.
