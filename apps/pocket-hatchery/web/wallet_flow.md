# Pocket Hatchery Wallet Flow

## Public Path (Default)

1. User opens `/pocket-hatchery` viewer.
2. Click "Connect Wallet".
3. Popup routes to **WAX Cloud Wallet** OAuth.
4. User approves read-only identity scope.
5. Frontend receives `account_name` only.
6. All blockchain writes route through WAX Cloud Wallet signed transaction popup.

## Forbidden

- No inline private key input.
- No seed phrase collection.
- No server-side signing.
- Internal signer details are documented in office-only ops docs.
