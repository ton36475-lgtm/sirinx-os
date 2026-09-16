# SIRINX QA Control Plane Policy

Policy ID: `SIRINX-QA-CONTROL-PLANE`

Version: `1.1.0-draft`

Status: `CANONICAL_CANDIDATE_AWAITING_APPROVAL`

## Purpose

This policy governs QA planning, execution, evidence, waivers, and release
recommendations for SIRINX. It does not authorize implementation, test
execution, external writes, deployment, or release.

## Truth States

Only these result states are valid:

- `PASS`
- `FAIL`
- `BLOCKED`
- `UNVERIFIED`
- `NOT_RUN`
- `NOT_APPLICABLE`

Missing, stale, inaccessible, ambiguous, or digest-mismatched evidence is
`UNVERIFIED`, never `PASS`.

## Control Topology

1. The human owner defines the goal and authorizes risk.
2. Hermes locks target identity, scope, requirements, and the run packet.
3. QA lanes receive only the core policy, their lane card, the run packet,
   relevant requirements, and their evidence contract.
4. A deterministic runner records commands, versions, exit codes, and artifact
   digests.
5. An independent reviewer verifies evidence without being the maker.
6. Hermes may issue a readiness recommendation.
7. A separate human authority decides release.

Hermes is governance-only and must not author product implementation.

## Mandatory Invariants

- One writer per exact path.
- A maker cannot verify its own candidate.
- A planner cannot relax a locked requirement after seeing results.
- Historical reports, plans, UI state, and agent summaries are not current
  execution evidence.
- A zero exit code is not a semantic pass without asserted outcomes.
- Every `PASS` maps to a requirement and immutable evidence reference.
- Every run is bound to exact repository, revision, source tree, build,
  environment, plan, scope, and policy digests.
- Any post-lock change invalidates the affected decision.
- `AUDIT_ONLY` cannot produce a release authorization.
- `full_auto`, `godmode`, `approve_all`, and similar phrases are not approval
  grants.
- No final receipt means the run cannot be marked complete.

## Standards Baseline

The first-run baseline candidates are:

- WCAG 2.2 Level AA
- OWASP ASVS 5.0.0 with an explicit applicability profile
- Core Web Vitals measured at the 75th percentile:
  LCP 2500 ms, INP 200 ms, CLS 0.1
- Route-specific initial HTML, canonical, robots, content, and claim checks

The run packet must record provenance and version. A broad statement such as
`ASVS L2 CERTIFIED` is forbidden; report only applicable requirements that were
actually verified.

## Required Run Artifacts

- `RUN_PACKET.yaml`
- `REQUIREMENTS.yaml`
- `TRACEABILITY_MATRIX.yaml`
- `RISK_REGISTER.yaml`
- `AGENT_DISPATCH_PLAN.yaml`
- `TEST_PLAN.yaml`
- `FINDINGS.json`
- `EVIDENCE_INDEX.json`
- `RELEASE_RECEIPT.json`

## Current Stop Point

The current run is `AUDIT_ONLY`. Its planning artifacts are created under the
parent planning lane before packet lock. Once the packet is locked, its own run
authority is read-only: source identity may be inspected, but the locked packet
cannot authorize further writes. Test execution, build, browser launch, network
probe, external connector, provider call, message send, deployment, and source
patch remain blocked until separately authorized.
