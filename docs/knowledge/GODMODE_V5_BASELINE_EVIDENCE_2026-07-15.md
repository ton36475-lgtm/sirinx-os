# GODMODE V5 Baseline Evidence Gate

## Contract

The Baseline phase can advance only when one fresh local packet proves all four criteria:

1. `ScopeLocked`: task identity, lane, owners, allowed paths, and external-action exclusions are explicit.
2. `SourceOfTruthMapped`: canonical control-plane files exist and every declared service mirror is byte-identical.
3. `DirtyLanesRecorded`: Git branch, HEAD, path/status entries, lane counts, and a status digest are recorded without reading dirty file contents.
4. `RiskClassified`: coordination, Telegram, and Cloudflare configs validate; external actions remain closed and assigned to explicit risk classes.

Canonical scope:

`configs/godmode_v5_baseline.scope.json`

Preview evidence without mutation:

```bash
node scripts/ghostclaw-godmode-v5-baseline.mjs
```

Store the local evidence packet without advancing:

```bash
node scripts/ghostclaw-godmode-v5-baseline.mjs --store
```

Guarded transition:

```bash
node scripts/ghostclaw-godmode-v5-baseline.mjs --advance
```

`--advance` rebuilds fresh evidence, verifies its digest and state binding, writes the local evidence receipt, marks all four criteria, advances through the canonical state function, and updates the canonical state plus its service mirror. It does not call a provider, send Telegram messages, install packages, stage Git, push, or deploy.

## Risk Classes

- `GreenLocalReadOnly`: inspection, status, docs, tests, receipt preview.
- `YellowLocalMutation`: leased source edits, local state transitions, local receipt writes.
- `RedExternalBounded`: provider calls, live sends, installs, pushes, cloud writes, deploys. Each needs one target-bound exact gate and receipt.
- `BlackProhibited`: secret exfiltration, self-approval, policy bypass, and audit concealment.

Evidence is stored under `.ghostclaw_runtime/a2a2a/evidence/`, which remains outside Git.

## Verified Transition

The real local packet passed on 2026-07-15 and advanced the state from `Baseline` to
`Architecture` with `ClaudeArchitect` as phase owner. The transition receipt proves:

- all four Baseline criteria passed;
- canonical and service-mirror state files are byte-identical;
- the evidence and transition SHA-256 digests validate;
- the Architecture state's previous receipt equals the completed Baseline-state digest;
- all four Architecture exit criteria remain `false` until separately evidenced; and
- `ExternalActionsAuthorized` remained `false`.

Receipts:

- `.ghostclaw_runtime/a2a2a/evidence/godmode-v5-baseline-evidence.json`
- `.ghostclaw_runtime/a2a2a/evidence/godmode-v5-baseline-transition.json`

The transition digest begins with `74f945d7eba19b4b`. Focused validation passed 8/8.
No provider call, Telegram live send, install, Git staging or push, cloud write, or deploy occurred.
