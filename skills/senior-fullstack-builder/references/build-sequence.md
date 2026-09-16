# Contract-First Full-Stack Build Sequence

## Before Editing

- bind task ID, spec/build-packet revision, acceptance criteria, and file lease;
- record current revision and dirty paths;
- map each requirement to artifact and proof;
- identify external actions and keep them outside the implementation gate.

## Layer Order

1. Domain types, invariants, and state transitions.
2. Storage schema/repository interface and migration plan (migration execution is separate).
3. Service/application logic with deterministic errors.
4. API/event contract, versioning, and compatibility fixtures.
5. Route, handler, consumer, worker, or scheduled entrypoint.
6. Provider/external adapter behind a mockable boundary.
7. Client and transport error mapping.
8. Frontend/store state and hooks.
9. Components, pages, accessibility, loading/empty/error/success states.
10. Observability, receipts, kill switch, and operator repair path.

Build a vertical tracer slice through real entrypoints before expanding breadth.

## Job/Worker Requirements

- durable task ID and immutable input version;
- explicit state machine and legal transitions;
- idempotency/deduplication at effect boundaries;
- lease, heartbeat, stale recovery, bounded concurrency, and cancellation;
- timeout, retry/backoff, failure limit, poison-item handling;
- structured receipt/ledger with integrity evidence;
- auth/policy validation before work starts;
- no external effect without its exact gate;
- safe local simulation and deterministic tests.

## Verification Ladder

1. Format/static analysis.
2. Unit/state-machine tests.
3. Contract and integration tests.
4. Policy/security negative tests.
5. Build/type/target checks.
6. Local smoke/UAT through the real entrypoint.
7. Independent receipt/completion audit.

Preview and production deploys are not rungs on the local implementation
ladder; each is a later, exact external-action gate.
