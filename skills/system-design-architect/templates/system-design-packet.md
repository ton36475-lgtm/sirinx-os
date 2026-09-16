# Decision-Complete System Design

## Problem Frame

- Users and jobs to be done:
- Functional requirements:
- Non-functional requirements/SLOs:
- Invariants:
- Constraints:
- Assumptions and unknowns:
- In scope / out of scope / non-goals:
- Current-state evidence:

## Contracts and State

- Domain model:
- API/event schemas and versioning:
- State machine:
- Auth/tenancy/trust boundaries:
- Idempotency/ordering/consistency:
- Error taxonomy/retry/cancellation:

## Architecture

- Context and bounded contexts:
- Containers/components and owners:
- Control/data/approval planes:
- Storage/retention:
- External dependencies:
- Diagram plus textual source of truth:

## Capacity, Cost, and Operations

- Load/payload/concurrency estimates:
- Latency/availability/durability targets:
- Cost model/guard:
- Health/readiness/heartbeats:
- Logs/metrics/traces/receipts/alerts:
- Kill switch/drain/repair:

## Failure Model

| Failure | Detection | Containment | Recovery | Evidence |
|---|---|---|---|---|
|  |  |  |  |  |

## Options and ADR

| Option | Correctness | Complexity | Security | Operability | Cost | Reversibility | Verdict |
|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |

## Delivery and Gate Plan

| Phase | Artifacts | Acceptance evidence | Rollback | Separate gate |
|---|---|---|---|---|
| Local implementation |  |  |  | implementation |
| Preview |  |  |  | preview deploy |
| Production |  |  |  | production deploy |

Open decisions:

Next safe action:
