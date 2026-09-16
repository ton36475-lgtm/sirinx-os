# Codebase Cartography Schema

Use only sections relevant to the scoped repository, but mark omitted critical
sections `not_applicable` rather than silently dropping them.

## Snapshot

- canonical root, repository identity, revision, branch, dirty state, timestamp;
- first-party/third-party/mirror/generated/runtime classification;
- included and excluded paths with reasons;
- tracked-file, language, asset, manifest, test, and documentation counts.

## Structure

- workspaces, applications, services, packages, crates/modules;
- entrypoints and registrations;
- command, API, event, queue, schedule, webhook, and UI boundaries;
- domain modules and ownership seams;
- schemas, migrations, durable stores, caches, ledgers, and files;
- infrastructure, release, observability, policy, and security surfaces.

## Critical Paths

For each path capture:

`trigger -> validation/auth -> domain/service -> storage/external adapter -> response/receipt`

Add idempotency, ordering, timeout, retry, concurrency, cancellation, recovery,
and kill-switch behavior.

## Claim Ledger

| Claim | Status | Evidence | Observed at | Limitation |
|---|---|---|---|---|
|  | `CONFIRMED_CURRENT` / `CONFIRMED_SNAPSHOT` / `INFERRED` / `STALE_OR_CONTRADICTED` / `UNKNOWN` |  |  |  |

## Cross-Repo Edges

Record source repo/component, target repo/component, protocol/artifact, contract
owner, compatibility rule, evidence, and whether the edge is actually wired.

## Build Frontier

Name the smallest bounded context that can move next, its exact source-of-truth
artifacts, missing decisions, validation surface, and affected owners. Mapping
does not open the implementation lease.
