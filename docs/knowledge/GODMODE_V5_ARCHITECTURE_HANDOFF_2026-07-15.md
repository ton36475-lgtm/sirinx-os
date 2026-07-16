# GODMODE V5 Architecture Handoff

## Current Gate

The canonical state is `Architecture`, owned by `ClaudeArchitect`. Codex remains the
only repository writer, but implementation is blocked until a final architecture
packet exists and Hermes records an acceptance decision.

Architecture request:

`configs/godmode_v5_architecture.request.json`

The request uses the enabled Hermes `unknowcoding-coding-team` bundle and its nine
canonical local source skills. It locks the ownership matrix, dependency order,
required packet sections, rollback requirements, state digest, and external-action
boundary.

Inspect without mutation:

```bash
node scripts/ghostclaw-godmode-v5-architecture-request.mjs
```

Store a local waiting-review packet:

```bash
node scripts/ghostclaw-godmode-v5-architecture-request.mjs --store
```

The stored packet does not enter an active provider queue. It records
`ProviderCallRequested=false`, `ProviderCallAuthorized=false`, and
`ExternalActionsAuthorized=false`.

## Required Separation of Duties

1. Hermes issues the request and later records the decision.
2. Claude/Opus produces the read-only architecture packet.
3. OpenCode/GLM may review the packet but cannot approve or mutate the repo.
4. KOB validates local evidence.
5. Codex receives a scoped implementation lease only after Hermes acceptance.

An existing Claude review for Telegram Command Center v2 is useful evidence but is
not the final GODMODE V5 architecture packet because its task and state binding differ.

## Provider Boundary

The request names one target-bound exact gate for a future Claude Code call. The gate
must be approved separately and bound to the request digest before execution. A broad
GODMODE or provider approval does not consume this gate. No provider call, secret read,
Telegram live send, install, Git staging or push, Cloudflare write, or deploy occurs in
this handoff lane.

## Provider Dispatch Control Surface

The local control surface now separates approval issuance from execution:

```bash
node scripts/ghostclaw-godmode-v5-architecture-provider-grant.mjs
node scripts/ghostclaw-godmode-v5-architecture-provider-runner.mjs --store
```

Both commands are non-executing by default. The plan binds the request/state/prompt,
Claude executable digest, repository scope, runtime-only output path, model, budget,
turn ceiling, and exact `Read,Glob,Grep` tool set. Claude Code is configured with safe
mode, plan permission, strict MCP isolation, no browser, no session persistence, a
six-turn ceiling, and a USD 2.00 budget ceiling.

The bound token estimate is approval metadata, not a Claude CLI token-limit claim.
The wrapper enforces a separate 32,768-character output cap after the call and records
that distinction in the target.

Execution additionally requires a short-lived signed receipt issued for the exact
architecture gate. The receipt is atomically consumed before one Claude CLI session.
The session can use up to six model turns; the wrapper does not claim visibility into
the provider's internal API-call count. There is no automatic retry.

The request ID and exact gate are production-pinned and validated. Plan, lock, grant,
and result artifacts use descriptor-pinned no-follow storage under fixed runtime
roots; request-controlled paths cannot escape those roots.

Provider output is stored only under:

`.ghostclaw_runtime/a2a2a/evidence/godmode-v5-provider-results/`

It is not promoted to `GODMODE_V5_ARCHITECTURE_PACKET.md`, accepted by Hermes, staged,
committed, pushed, sent to Telegram, or deployed automatically. Those remain separate
review and action gates.
