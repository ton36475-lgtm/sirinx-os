# SIRINX QA Governance

This additive namespace contains policy and run-control artifacts for the
SIRINX QA system. It does not replace existing application tests, policy-core,
release gates, receipts, or evidence stores.

## Initial Run

Run: `SIRINX-QA-20260723-001`

Mode: `AUDIT_ONLY`

Target source: `apps/sirinx-site`

Current state: source scope identified; build and deployment identities absent;
no QA execution started.

## Compatibility

Existing SIRINX visual tooling uses legacy verdict and severity vocabularies.
`qa/baselines/legacy-qa-compatibility-map.yaml` defines a one-way reporting
adapter. It does not rewrite legacy artifacts or grant backward validation.

Known mismatch: the visual-bot implementation can emit
`baseline_initialized_needs_second_run`, while its current receipt schema does
not permit that value. Until repaired under a separate approval, this result is
`BLOCKED`, not `PASS`.

## Output Separation

- `packets/<RUN_ID>/` contains immutable run inputs and plans.
- `reports/<RUN_ID>/` contains findings, evidence indexes, and receipts.
- Executable tests and generated browser artifacts stay in their existing
  application-owned paths under exact future output leases.
