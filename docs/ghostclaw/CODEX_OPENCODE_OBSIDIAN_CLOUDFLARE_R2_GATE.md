# Codex / OpenCode / Obsidian / Cloudflare R2 Gate

Packet: `A2A2A-P018-CODEX-OPENCODE-OBSIDIAN-CLOUDFLARE-R2-GATE-20260703`
Mode: local-safe handoff and gate planning

## Current Boundary

This packet does not approve commit, push, deploy, provider calls, Cloudflare
mutation, R2 writes, or live Telegram sends. It converts the operator request
into separate reviewable lanes.

## Model Budget Rule

- Default: DeepSeek / GLM / Kimi class routes.
- Fable5: only for explicit founder-level architecture, strategy, or complex
  cross-system reasoning.
- Never use fable5 for polling, repeated status checks, formatting, bulk docs,
  or routine receipts.

## Codex Handoff

Codex owns local repo mutation only after file scope is clear.

Allowed:

- inspect changed files
- run local syntax/tests already available
- create reports, receipts, and Obsidian pulses
- stage a local commit only after a fresh scoped commit gate

Blocked:

- push
- deploy
- install
- provider calls
- secret reads
- Cloudflare R2 writes
- live Telegram sends

Inbox packet:

```text
.ghostclaw_runtime/a2a2a/inbox/codex/A2A2A-P018-CODEX-HANDOFF-20260703.json
```

## OpenCode Handoff

OpenCode is reviewer-only for this lane.

Allowed:

- read current diff
- review `hermes/config_gate_run.sh`
- review agency persona files
- review Cloudflare R2 gate plan
- produce review notes only

Blocked:

- source mutation
- install scripts
- provider batch calls
- commit/push/deploy
- secret reads

Inbox packet:

```text
.ghostclaw_runtime/a2a2a/inbox/opencode/A2A2A-P018-OPENCODE-REVIEW-20260703.json
```

## Obsidian Brain Link

Write only concise memory pulses to:

```text
/Users/sirinx/Documents/Obsidian Vault/SIRINX/AI HQ Knowledge Digest.md
```

Do not copy raw logs, secret-like lines, `.env` values, browser cookies, tokens,
or provider outputs into Obsidian.

## Commit Gate

Local commit is separate from push/deploy.

Required before local commit:

- exact path list
- focused validation pass
- secret-pattern scan no matches
- receipt path
- explicit local commit approval

Suggested gate phrase:

```text
APPROVE_LOCAL_COMMIT_A2A2A_CONFIG_GATE_A019E53EE
```

## Cloudflare R2 Deploy Gate

Cloudflare R2 is an external mutation lane. Use Cloudflare knowledge only for a
review plan until a fresh exact deploy gate is opened.

Required before any R2 write:

- exact account/project/bucket target
- artifact path and checksum manifest
- Wrangler/auth readiness check without printing secrets
- dry-run upload manifest
- rollback/delete plan
- explicit R2 gate approval

Suggested gate phrase:

```text
APPROVE_CLOUDFLARE_R2_WRITE_A2A2A_A019E53EE
```

Blocked until that gate:

- `wrangler r2 bucket create`
- `wrangler r2 object put`
- bucket domain changes
- public bucket changes
- R2 CORS/lifecycle mutation
- production deploy

## Next Safe Action

Keep this lane in review-only mode. Let Codex validate locally and let OpenCode
review read-only. Open exactly one later gate for local commit, R2 write, push,
or deploy; do not combine them.

