# A2A2A GhostClaw Control Plane Implementation

Packet: `A2A2A-P032-GHOSTCLAW-CONTROL-PLANE-IMPL-20260703`

Timestamp: `2026-07-03T05:07:26+0700`

## Scope

Implemented the local-safe GhostClaw OS TASK-001 control-plane surface without executing workers or opening external gates.

## Added

- `services/dev-control-api/src/ghostclaw-control-plane.mjs`
- `services/dev-control-api/src/ghostclaw-control-plane.test.mjs`
- `GET /api/ghostclaw/control-plane`
- `POST /api/ghostclaw/control-plane/dispatch/dry-run`
- `pnpm ghostclaw-control-plane:test`

## Capabilities

- Loads existing GhostClaw agent and route registries.
- Summarizes control-plane status from local registry data.
- Classifies D/X actions before dispatch.
- Blocks deploy, push, cloud mutation, install, provider calls, customer sends, destructive actions, and secret/key access.
- Creates local file-lease previews with allowed path, forbidden path, and active-collision checks.
- Validates required receipt fields.
- Routes review dispatch to OpenCode in read-only mode.
- Keeps all worker execution, provider calls, push, deploy, install, cloud mutation, secret reads, and key printing closed.

## Real Registry Smoke

The real repo registry loaded successfully:

- Agents: `15`
- Routes: `10`
- SIRINX Site public-guardian preview: `ready-ghostclaw-dispatch-preview`
- Lease granted for `apps/sirinx-site/src/app.js`: `true`
- Reviewer: `opencode`
- Deploy/push preview: `blocked-ghostclaw-dispatch-preview`
- Block reasons: `deploy_or_publish`, `git_push`

## HTTP Route Smoke

A temporary local server was started through the exported `handleRequest` function and closed in the same process.

- `GET /api/ghostclaw/control-plane` returned HTTP `200`.
- Control-plane status: `ghostclaw-control-plane-registry-ready`.
- `POST /api/ghostclaw/control-plane/dispatch/dry-run` for SIRINX Site returned HTTP `200`.
- Dispatch preview status: `ready-ghostclaw-dispatch-preview`.
- Lease granted: `true`.
- Reviewer: `opencode`.
- Deploy/push dry-run returned `blocked-ghostclaw-dispatch-preview`.
- Key/token value printed: `false`.

## Validation

```bash
node --check services/dev-control-api/src/ghostclaw-control-plane.mjs
node --check services/dev-control-api/src/ghostclaw-control-plane.test.mjs
node --check services/dev-control-api/server.mjs
pnpm ghostclaw-control-plane:test
git diff --check -- package.json services/dev-control-api/server.mjs services/dev-control-api/src/ghostclaw-control-plane.mjs services/dev-control-api/src/ghostclaw-control-plane.test.mjs
pnpm verify
temporary local HTTP route smoke
```

Results:

- Focused control-plane tests passed: 1 file, 8 tests.
- Scoped diff check passed.
- Scoped secret-pattern scan returned no matches.
- `pnpm verify` passed.

## Not Performed

- No worker runtime execution.
- No OpenCode provider call.
- No Telegram live send.
- No install.
- No commit.
- No push.
- No deploy.
- No Cloudflare/R2 mutation.
- No customer-data routing.
- No secret or key value printing.

## Next Safe Action

Use the dispatch dry-run endpoint to evaluate each queued project task before any mutation, then promote only validated local-safe packets to scoped commit review.
