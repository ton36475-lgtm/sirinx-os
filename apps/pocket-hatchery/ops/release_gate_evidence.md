# Pocket Hatchery Release Gate Evidence

## Checklist

- [x] No paid randomness / loot box / gambling mechanics.
- [x] No cash-out or real-money prize pool.
- [x] Public wallet path uses WAX Cloud Wallet / My Cloud Wallet.
- [x] `waxwing` signer remains office-internal.
- [x] Deterministic hatch/evolve state machine documented.
- [x] Creature catalog schema validates samples.
- [x] Metadata manifest schema defined.
- [x] Contract action table reviewed for blocked actions.
- [x] Pause/unpause tests passing.
- [x] Read-only `/pocket-hatchery` viewer builds locally.
- [x] Public `waxwing` exposure scan evidence recorded at `WORKSPACE_SCAFFOLD/security_scan_waxwing.json`.
- [x] Wallet flow local evidence recorded at `apps/pocket-hatchery/ops/wallet_flow_evidence.md`.
- [x] Metadata permission audit recorded at `apps/pocket-hatchery/ops/metadata_permission_audit.md`.
- [x] Rollback plan review recorded at `apps/pocket-hatchery/ops/rollback_plan_review.md`.
- [ ] Wallet flow end-to-end testnet evidence (requires R0 approval).
- [ ] Testnet deployment (requires R0 approval).

## Current Score

`84/100` — local evidence threshold met. This score does not approve testnet deployment, real wallet connector implementation, production release, push, or cloud mutation.
