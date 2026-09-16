# Pocket Hatchery Wallet Flow Evidence

Date: 2026-06-29
Mode: local-only evidence, no deploy, no real wallet write

## Evidence Summary

- Public wallet path is documented in `apps/pocket-hatchery/web/wallet_flow.md`.
- Read-only viewer route is implemented at `apps/centerbrain-shell/app/pocket-hatchery/page.tsx`.
- The route renders WAX Cloud Wallet and My Cloud Wallet as allowed public paths.
- The route stores no private key, seed phrase, session token, signer material, or wallet credential.
- Wallet connector implementation remains blocked until R0 approval.

## Local Verification

```text
./node_modules/.bin/next build
node Playwright smoke against http://127.0.0.1:8721/pocket-hatchery
```

Observed local proof:

- `/pocket-hatchery` returned HTTP 200 during local smoke.
- Page title was `Pocket Hatchery | SIRINX CenterBrain`.
- Rendered text included `WAX Cloud Wallet`, `My Cloud Wallet`, and sample creatures.
- Browser console had no errors.

## Boundaries

- local-only evidence.
- no deploy.
- no real wallet write.
- no transaction signing.
- no testnet deployment.
- no production deployment.
- no inline private key input.
- no seed phrase collection.
- no server-side signing.
