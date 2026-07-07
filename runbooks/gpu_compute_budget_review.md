# GPU Compute Budget Review Runbook

Applies to H100/GPU instance offers.

## Review Steps

1. Identify provider and billing entity.
2. Define workload and expected runtime.
3. Set budget ceiling and shutdown policy.
4. Classify data to be uploaded.
5. Confirm no customer data or secrets are required.
6. Require explicit provisioning gate.

## Blocked

- provisioning without budget approval
- model downloads without gate
- training jobs without workload plan
- credential storage in repo
- connecting compute jobs to Hermes runtime by default
