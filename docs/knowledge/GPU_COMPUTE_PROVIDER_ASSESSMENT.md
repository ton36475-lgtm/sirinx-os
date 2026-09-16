# GPU Compute Provider Assessment

Lane: `COMPUTE_PROVIDER_REVIEW`
Default Gate: `YELLOW`, escalates to `RED` for spend, credentials, or customer
data.

## Source Snapshot

The intake post promotes H100 GPU instances as affordable web-provisioned
compute. No provider account, pricing page, contract, or SLA was verified in
this packet.

## GhostClaw Fit

Useful for:

- short-term model experimentation plan
- budget-controlled GPU workload design
- training/inference capacity assessment

Blocked by default:

- provisioning GPU instances
- storing provider credentials
- uploading private code or customer data
- running model downloads or training jobs
- connecting GPU jobs to Hermes runtime

## Required Controls

- budget ceiling
- provider identity and billing review
- data classification
- workload estimate
- shutdown policy
- receipt per provisioning action

## Verdict

Keep as budget-review-only until a named provider, cost ceiling, and explicit
provisioning gate exist.
