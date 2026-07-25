# ADR: GPU Compute Budget Gate

Status: `Accepted as budget-review-only lane`
Date: `2026-07-01`

## Context

GPU instances can enable short-term AI experiments but introduce spend, data,
credential, workload, and shutdown risks.

## Decision

Register GPU compute providers as Yellow/Red gated. Do not provision compute
without provider identity, budget ceiling, workload scope, data classification,
shutdown policy, and explicit approval.

## Consequences

- No GPU provisioning in docs-only packets.
- No model downloads or training jobs without a separate gate.
- All future provisioning actions require receipts.
