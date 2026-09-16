# GODMODE V5 Cloudflare R3 Readiness

## Decision

The Hermes V5 Worker source and generated WebAssembly artifact pass the local
R3 checks, but the target is not ready for an R4 preview deploy. R3 records
local evidence only and does not authorize Wrangler, Cloudflare API,
credential, KV, R2, route, DNS, or deployment actions.

## Verified Local Evidence

- All seven Rust workspace crates compile natively and for
  `wasm32-unknown-unknown` in offline mode.
- Native Cargo tests pass across the workspace.
- The workspace reports 67 passing Rust tests across the seven crates.
- `cargo fmt` and Clippy pass.
- The deployment-contract tests validate preview isolation, authentication,
  owner allowlisting, observability, non-secret vars, bindings, and artifact
  requirements.
- The focused Cloudflare readiness, receipt-integrity, deployment-contract,
  R3 provenance, and approval-grant CLI suites pass 40/40 tests, including
  fourteen fail-closed prerequisite-runner tests. The separate Cloudflare API
  module and canonical-root route suite passes 4/4, and the Skills API
  compatibility smoke test passes 1/1.
- The checked-in preview config uses `workers.dev`, has no production route,
  enables `nodejs_compat`, and enables Workers observability.
- `worker-build` produced `build/index.js`, `build/index_bg.wasm`, and
  `build/worker/shim.mjs`. The artifact manifest records byte counts and
  SHA-256 checksums, and the readiness inventory verifies those files before
  removing the artifact blocker.
- Project-local Wrangler `4.100.0`, `worker-build`, and the required
  `wasm-bindgen 0.2.126` are available. The generated bundle reports one
  optional `setPanicHook` warning; build and validation still complete.

The reproducible receipt command is:

```bash
node scripts/ghostclaw-cloudflare-r3-readiness.mjs --store
```

Receipt:

`.ghostclaw_runtime/a2a2a/evidence/cloudflare-r3-readiness.json`

Receipt status: `R3_VERIFIED_R4_BLOCKED`

Receipt digest:

`d7c66e6b124b3b8d1abc429030c877fd55056446e513c4167c66fdaf4f62a24e`

Receipt id: `cloudflare-r3-cfa7518b94e68f5b`

The receipt binds exactly 22 current source files by SHA-256, including the
dev-control API route and its canonical-root regression test, and requires the
closed set of six named offline checks to pass with their canonical executable,
arguments, working directory, and clean exit codes. Receipt validation rejects
stale or missing source hashes, missing or unexpected checks, substituted
commands, forged results, duplicate evidence, and any declared external action.
The commands used offline flags, but no OS-level network sandbox was enforced;
the receipt records that limitation explicitly.

## R4 Blockers

The owner allowlist is no longer a placeholder. It is set to the canonical
`hermes_commander` role and is checked against
`configs/ghostclaw_agent_coordination.config.json`.

Local preview configuration blockers:

1. `HERMES_LEDGER` needs an exact preview namespace id.
2. `IDEMPOTENCY_CACHE` needs an exact preview namespace id.

Remote readiness blockers:

1. Cloudflare CLI authentication is not verified.
2. The authenticated account id has not been matched to the preview target.
3. `HERMES_LEDGER` has not been verified in the remote account.
4. `IDEMPOTENCY_CACHE` has not been verified in the remote account.
5. The `HERMES_API_TOKEN` secret binding has not been verified. Only the
   binding name is recorded; no secret value is read or stored.

Remote evidence is stored at
`.ghostclaw_runtime/a2a2a/evidence/cloudflare-r4-remote-readiness.json` and is
embedded into the R4 packet by digest. A read-only `wrangler whoami` probe
reported an unauthenticated CLI. It did not perform login or cloud mutation.

The non-executing prerequisite packet is stored at
`.ghostclaw_runtime/a2a2a/templates/cloudflare-r4-prerequisites-packet.json`.
It separates the remaining remote work into four exact gates:

1. `APPROVE_CLOUDFLARE_R4_OAUTH_LOGIN_PACKET_CF-R4-PREREQUISITES-20260715-001`
2. `APPROVE_CLOUDFLARE_R4_RESOURCE_DISCOVERY_PACKET_CF-R4-PREREQUISITES-20260715-001`
3. `APPROVE_CLOUDFLARE_R4_RESOURCE_CREATE_PACKET_CF-R4-PREREQUISITES-20260715-001`
4. `APPROVE_CLOUDFLARE_R4_SECRET_PROVISION_PACKET_CF-R4-PREREQUISITES-20260715-001`

Each step records its expected gate and keeps `execute=false`. Approval of one
step does not authorize any later step or the preview deployment.

The OAuth gate in item 1 was consumed for one real Wrangler login attempt on
2026-07-16. Cloudflare returned a managed browser challenge that did not
complete in Chrome before the callback timeout. The immutable failed receipt
is stored at
`.ghostclaw_runtime/a2a2a/evidence/cloudflare-r4-prerequisites/CF-R4-PREREQUISITES-20260715-001/oauth_login.json`.
It records `cloudMutation=false` and `deploy=false`; it is not authentication
proof and cannot satisfy the dependency for resource discovery.

The fixed-command runner is
`scripts/ghostclaw-cloudflare-r4-prerequisites-runner.mjs`. It defaults to a
non-executing plan, accepts exactly one step, ignores command text from the
packet, and uses an internal argv allowlist without a shell. Real execution
requires both `--execute` and `--store`, a separate approval-grant file bound
to the packet digest and exact step gate, and a verified receipt for every
preceding step. Grants expire after at most 15 minutes, are single-use, and
are protected by an exclusive execution lock. The core rejects concurrent
reuse in-process, while the CLI creates a persistent claim record before the
first external command so a crash or receipt-write failure cannot silently
reopen that grant. The grant proves a local audit record only; it is not
cryptographic human identity proof. The dependency chain is a closed set:
missing, duplicate, or unexpected prerequisite receipts block before grant
claiming or command invocation. Receipts bind the fixed argv, working
directory, executable hashes, and exit code. Captured commands bind a discarded
output hash; interactive commands use `inherited-unobserved`, so their digest
does not represent terminal output. The wrapper does not store raw stdout or
stderr and does not capture a secret value, but it does not claim that
child-process output is automatically redacted.

Persistent grant claims are stored under
`.ghostclaw_runtime/a2a2a/evidence/cloudflare-r4-prerequisite-grant-claims/`.
They are audit artifacts and are never treated as provider identity proof.

The local grant issuer is
`scripts/ghostclaw-cloudflare-r4-approval-grant.mjs`. It validates one exact
packet step and gate, defaults to a five-minute lifetime, rejects lifetimes
over 15 minutes, and performs no external request. Its default mode is a
non-writing dry-run. Only `--store` creates a mode `0600`, exclusive local
record under
`.ghostclaw_runtime/a2a2a/approvals/cloudflare-r4-prerequisites/pending/`;
an existing grant id is never overwritten. The issuer and its CLI tests are
both included in the R3 source-hash closed set. Packet parse failures use a
generic error that does not echo file contents. Storage uses the standard-library
safe-store helper to walk from the repository root with pinned directory
descriptors. Every directory open rejects symbolic links, and the final file
uses `O_EXCL|O_NOFOLLOW`, mode `0600`, and `fsync`. The regression suite swaps
a checked parent directory for a symlink while the write is paused and proves
that the grant remains anchored to the original directory inode.

The original OAuth grant is consumed and cannot be replayed. A separate retry
packet preserves that receipt and passed JSON, runner-plan, and grant dry-run
validation without storing a new grant:

`.ghostclaw_runtime/a2a2a/templates/cloudflare-r4-oauth-retry-packet-20260716-002.json`

Its only currently intended action is a fresh OAuth attempt. The exact retry
gate is
`APPROVE_CLOUDFLARE_R4_OAUTH_LOGIN_PACKET_CF-R4-PREREQUISITES-20260716-002`.
The fresh Wrangler authorization URL should be opened in Safari to avoid the
Chrome challenge stall. This gate still does not authorize discovery,
resource creation, secret provisioning, or deployment.

The dry-run form is:

```bash
node scripts/ghostclaw-cloudflare-r4-prerequisites-runner.mjs --step oauth_login
```

This command does not invoke Wrangler. The runner also keeps resource
discovery read-only, prevents Wrangler from auto-editing the preview config
during KV creation, and requires interactive stdin for secret provisioning.

After those values are supplied through the approved configuration path, R4
still requires a target-specific approval id. The current packet deliberately
keeps `approvalGateId` null and does not count that future gate as local build
evidence.

The exact future gate pattern is:

`APPROVE_CLOUDFLARE_PREVIEW_DEPLOY_PACKET_<packet_id>`

That gate is valid only after the packet contains exact non-placeholder target
metadata, build proof, smoke plan, and rollback plan. It does not authorize R5
production deployment.

The current non-executing R4 draft is stored at:

`.ghostclaw_runtime/a2a2a/templates/cloudflare-preview-deploy-packet.json`

Task id: `CF-R4-HERMES-V5-PREVIEW-20260715-001`. It links the verified artifact
manifest and the R3 receipt. Its `execute`, `externalRequests`, and `deploy`
fields are all `false`.

## Official Basis

- Cloudflare Workers best practices:
  <https://developers.cloudflare.com/workers/best-practices/workers-best-practices/>
- Wrangler deploy and dry-run commands:
  <https://developers.cloudflare.com/workers/wrangler/commands/workers/>
- Workers Logs and observability:
  <https://developers.cloudflare.com/workers/observability/logs/workers-logs/>

The receipt refresh did not perform a provider call, Telegram live send,
secret read, dependency install, Git stage/commit/push, Cloudflare login,
resource mutation, or deploy. The only Wrangler action was the read-only,
sanitized authentication probe described above.
