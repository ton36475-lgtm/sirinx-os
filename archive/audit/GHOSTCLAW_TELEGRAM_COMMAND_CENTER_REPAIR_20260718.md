# GhostClaw Telegram Command Center Repair — 2026-07-18

Status: `LOCAL_REPAIR_VERIFIED / RUNTIME_AND_PRODUCTION_UNVERIFIED`  
Branch: `migration/v5-rebase`  
Baseline commit: `b55f81ecd372ff23a34fcf33c2744706447e14ca`  
External effects: none

## Task card

Goal:
Repair the local Telegram Command Center contracts, contain unsafe dispatch and
approval entrypoints, extend the end-to-end runtime schemas, preserve the
locked Grid Mermaid architecture, and audit the Cloudflare worker boundary.

Constraints:

- No install, provider call, live Telegram/customer send, commit, push, deploy,
  DNS, Cloudflare mutation, production database mutation, or secret access.
- Preserve unrelated dirty-worktree changes.
- Preserve the 18 locked Grid Mermaid plans.
- Treat local tests as checkout evidence only, never activation evidence.

File scope:

- Telegram registry/router and private dashboard lock specification.
- Local dispatcher and approval containment.
- Additive GhostClaw runtime and UI schemas.
- Read-only Cloudflare audit plus injected-mock tests.
- One local MIT-licensed unified operating skill.

Expected result:

- Unsafe or unknown work fails closed.
- Red actions remain proposals pending exact human approval.
- Secret access and unknown actions are not approvable.
- The private operator UI distinguishes observed, unverified, and blocked state.
- No production claim or external effect.

## Verified local outcomes

### P0 dispatcher containment

- `scripts/full-auto-approval-loop.py` no longer self-approves Tier C/D, lowers
  risk, implicitly completes packets, or runs Git checkpoint/push behavior.
- `scripts/cmux-agent-dispatcher.py` requires one closed structured action type,
  caps packets at 65,536 bytes, rounds risk upward, requires explicit allow for
  A/B, holds C/D, quarantines X, and leaves completed work pending independent
  read-back.
- `scripts/cmux-cli-dispatcher.py` is preview-only and contains no provider or
  shell execution path.
- `production_db_mutation` resolves to D; oversized, missing/unknown, secret,
  and hard-deny input resolves to X.

### Approval and receipt containment

- The checked-in YAML policy now loads successfully instead of silently falling
  back because list parsing failed.
- YAML and embedded fallback both use `fail_closed_guarded_execution`.
- Unknown action classes default to non-approvable X.
- Commit, push, deploy, install, production action, non-production push, and
  staging deploy resolve to D and remain blocked pending an exact human gate.
- Tier B requires a passing independent checker plus a SHA-256 checker receipt.
- Only `approved` A/B decisions with `receipt_written: true` may continue the
  original action.
- Receipt creation uses exclusive creation; replay or persistence failure
  returns X. The receipt filename is derived from the SHA-256 decision digest,
  so an untrusted decision ID cannot become a path.
- Secret access, secret-like unknown spellings, and force-push-like unknown
  spellings remain X, not human-approvable D.

### Telegram and private Command Center

- Registry version is `2.4.0` with `/ui lockspec` and callback
  `cmd:ui-lockspec`.
- The handler returns an immutable, read-only, dry-run UI contract and performs
  no provider or Telegram send.
- The private dashboard adds one dominant `Now / Needs Attention` evidence rail
  with text labels for Observed, Unverified, and Blocked state.
- Tablet and mobile layouts recompose at 860 px and 520 px.
- Operator copy distinguishes exact-approval actions from hard-denied secret
  access and avoids claiming runtime activation.
- The design follows the public MIT-licensed
  [Gridgeist workflow](https://github.com/ohmiler/gridgeist) as an influence:
  product thesis first, evidence/inference separation, responsive composition,
  and accessibility checks. No locked SIRINX Grid Mermaid plan was changed.

### Runtime contract extension

`schemas/ghostclaw/unified-runtime-contracts.v1.schema.json` now exposes closed
root contracts for:

- `CommandEnvelopeV1`
- `ActionManifestV2`
- `WorkMessageV1`
- `StageLeaseV1`
- `StageResultV1`
- `ModelCatalogEntryV1`
- `RouteReceiptV1`
- `EvidenceManifestV1`
- `ApprovalGrantV2`
- `TransitionReceiptV2`
- `RedriveRequestV1`
- `NodeManifestV1`

The schema prevents secret access in manifests, leases, approval grants, and
node capabilities. Only a `mac_control` node may claim control-plane write
authority; a `public_edge` node is limited to public-data read/validation.
These are design contracts and structural tests, not proof of a deployed
runtime.

### Cloudflare boundary

- Worker syntax passes.
- Four built-in Node tests pass, including missing-D1 fail-closed behavior and
  a valid synthetic lead written only to an injected mock binding.
- No Wrangler deploy, DNS change, D1 production write, or cloud mutation ran.
- Cloudflare Queues use at-least-once delivery, so any future adapter must add
  application idempotency and read-back rather than claim exactly-once effects.
  See Cloudflare's
  [delivery guarantees](https://developers.cloudflare.com/queues/reference/delivery-guarantees/)
  and [dead-letter queue](https://developers.cloudflare.com/queues/configuration/dead-letter-queues/)
  documentation.

## Verification receipts

| Check | Result |
|---|---|
| Python dispatcher safety suite | PASS — 18/18 |
| Built-in Node focused suites | PASS — 22/22 |
| JavaScript syntax checks | PASS |
| JSON parse for Telegram and both schemas | PASS |
| Scoped `git diff --check` | PASS |
| Credential-shaped scan of task-owned files | PASS — no matches |
| Absolute local-path/localhost scan in UI lock surface | PASS — no matches |
| Local dashboard HTTP read-back | PASS — HTTP 200, new evidence rail observed |
| Locked Grid Mermaid diff | PASS — zero diffs |
| Independent checker | PASS after repair iterations; earlier findings retained in audit history |

The Python dispatcher log shown during tests came from isolated temporary
fixtures, not the real `_A2A_QUEUE`.

## Blocked or unverified

1. The Vitest registry/router and legacy GhostClaw suites are blocked because
   `vitest` is absent. No package installation was attempted.
2. The skill creator's full validator is blocked because Python `yaml` is
   absent. Static frontmatter, pipeline, and MIT license checks pass. No package
   installation was attempted.
3. Draft 2020-12 instance validation is blocked because no JSON Schema engine is
   installed. Structural schema regression tests pass.
4. Browser screenshot proof is blocked. The available Chrome attempt produced
   no screenshot and started updater/crash helper activity; the isolated test
   profile was moved to Trash and Chrome was not retried. HTML HTTP read-back is
   the current evidence.
5. Live Telegram delivery, gateway reload, scheduler activation, cmux socket
   control, OmniRoute health, and provider/model execution remain unverified.
6. The canonical durable queue is not implemented end to end. Existing queue
   planes still need consolidation into the Rust orchestrator with persistent
   claim, delayed retry, DLQ, one-use redrive, independent read-back, and a
   durable receipt chain.
7. The current Cloudflare worker creates DDL in the request handler and has no
   proven application idempotency, rate limiter/Turnstile, or explicit CORS
   contract. Treat these as P1 hardening before any deploy gate.
8. `GHOSTCLAW/vibe/vibe-agent-router.mjs` remains a separate legacy mutual-
   approval execution plane. It must be adapted to the exact approval/receipt
   contract or disabled before runtime activation.
9. The approval engine verifies the Tier B checker flag and SHA-256 digest
   format, but does not yet prove that the referenced checker receipt exists,
   is authentic, and binds the same action. The canonical runtime must perform
   that lookup before execution.
10. The data volume has about 12 GiB free and is 95% used. Capacity cleanup is a
   separate scoped maintenance task.
11. A credential-shaped value appeared in user-supplied conversation text. It
    was not used, stored, copied, tested, or written by this repair. If it is
    real, the owner should revoke/rotate it outside this session.

## Exact next gates

1. Restore the existing test toolchain under a separate install approval, then
   run the Vitest suites and a Draft 2020-12 validator.
2. Implement the persistent Rust queue/DLQ packet locally with mock adapters.
3. Connect the Telegram and legacy vibe surfaces to that one authority and add
   negative security tests.
4. Add Cloudflare application idempotency, request validation, abuse controls,
   and explicit CORS in a separate worker hardening packet.
5. Run browser QA with a verified isolated browser binary and store a local
   screenshot receipt.
6. Request separate exact approval for each later install, gateway reload,
   provider smoke test, Git publication, Cloudflare staging operation, or live
   Telegram delivery.

## Safety attestation

No dependency install, provider call, live Telegram/customer message, commit,
push, deployment, DNS change, Cloudflare mutation, production database write,
or secret access was performed.
