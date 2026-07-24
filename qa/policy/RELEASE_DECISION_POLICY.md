# Release Decision Policy

Valid recommendations:

- `GO`
- `CONDITIONAL_GO`
- `NO_GO`
- `NOT_APPLICABLE`

`AUDIT_ONLY` always returns `NOT_APPLICABLE`.

A future release approval must be independently issued, one-use, and bound to:

- Policy, plan, and scope digests
- Repository and commit
- Clean/dirty state
- Build and artifact digests
- Deployment identity
- Evidence-manifest digest
- Receipt-chain head
- Exact target and expiry

No required control may remain `FAIL`, `BLOCKED`, `UNVERIFIED`, or `NOT_RUN`
unless an eligible `FAIL` has a valid scoped waiver. `BLOCKED`, `UNVERIFIED`,
and `NOT_RUN` are not waivable. Waivers preserve the underlying failure state
and cannot be blanket, retroactive, self-approved, expired, reused, or
scope-drifting.
