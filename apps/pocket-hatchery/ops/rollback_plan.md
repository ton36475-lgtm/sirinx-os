# Pocket Hatchery Rollback Plan

## Triggers

- Security finding (public signer exposure, secret leak, gambling mechanic).
- Testnet bug affecting user assets.
- Regulatory concern raised.

## Steps

1. Call `pause()` on contract immediately.
2. Pin current IPFS metadata hash for audit.
3. Revert frontend to last known-good viewer build.
4. Notify users via read-only status page.
5. Open incident in `_A2A_QUEUE/blocked/`.
6. Wait for human approval before `unpause()` or redeploy.

## No-Go

- Do not rollback by deleting on-chain state.
- Do not hide incident logs.
