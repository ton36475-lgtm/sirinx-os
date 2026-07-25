# System Design Decision Framework

## Decision Inputs

1. Functional requirements and domain invariants.
2. Load, payload, latency, retention, concurrency, and growth bounds.
3. Data classification, tenancy, authorization, and compliance boundaries.
4. Consistency, ordering, idempotency, availability, and durability needs.
5. Existing platform capabilities, team ownership, and migration constraints.
6. Cost ceiling, observability, operability, and rollback requirements.

## Option Scorecard

Score each option with evidence, not intuition:

| Criterion | Question |
|---|---|
| Correctness | Does it preserve invariants under duplicate, delayed, partial, and failed execution? |
| Simplicity | Is each component necessary and independently understandable? |
| Security | Are trust zones, least privilege, data flow, and abuse controls explicit? |
| Operability | Can operators detect, stop, repair, reproduce, and roll back it? |
| Compatibility | Can old/new clients and data coexist during migration? |
| Cost | Are steady-state and failure-amplification costs bounded? |
| Reversibility | Can the decision be undone without hidden durable-state loss? |
| Evidence | Can acceptance be proven locally, in preview, and in production separately? |

## Distributed Job Checklist

- durable task identity and idempotency key;
- state machine with terminal and retryable states;
- ownership lease, heartbeat, stale-worker recovery, and bounded concurrency;
- max runtime, retry limit, backoff, poison-item handling, and cancellation;
- at-least-once/at-most-once effects documented at each boundary;
- immutable input/version and deterministic or explained output;
- structured receipt/ledger and independent verifier;
- kill switch and safe draining;
- explicit local/preview/production gates.

## Architecture Proof Levels

Keep these distinct: static design validation, local executable proof, preview
integration proof, production rollout proof, and rollback proof. A later level
cannot be claimed from an earlier one.
