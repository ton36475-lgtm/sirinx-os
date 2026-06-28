# SECURITY_GUARDRAILS — Pocket Hatchery Agent Factory v4

## Never Allowed

- Access or store secrets, seeds, private keys, API tokens, session cookies.
- Deploy to production without explicit R0 approval.
- Expose `waxwing` signer publicly.
- Add paid randomness, loot boxes, cash-out, or real-money prize pools.
- Hide logs or modify audit history.
- Blindly repair dependencies (`rm -rf node_modules && pnpm install` without plan).

## Allowed Without Approval

- Read repo files.
- Write schema, spec, markdown, tests, and safe local scripts.
- Run deterministic unit tests.
- Generate read-only reports.

## Require Approval

- Testnet deploy.
- Wallet connector code that touches real keys.
- Any change to `contract_actions.md` that adds red-listed actions.

## Verification

Run `python3 -m unittest discover -s WORKSPACE_SCAFFOLD/tests -v` before committing.
