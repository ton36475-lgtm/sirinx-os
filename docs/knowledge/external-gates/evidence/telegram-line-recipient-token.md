# Telegram/LINE Recipient And Token Evidence

Gate: Telegram/LINE recipient and token setup
Status: pending credential and recipient evidence
External writes: false
Secret storage: pending approval

## Required Evidence

- [ ] Telegram token rotated or owner-confirmed
- [ ] Telegram intended recipient named
- [ ] Telegram recipient has messaged bot or joined target chat
- [ ] LINE OA channel confirmed or explicitly not in scope
- [x] no message-send smoke before final target approval

## Operator Record

- Date/time: 2026-05-20 15:26:00 +0700
- Operator: Codex local preflight; human operator still required for token/recipient/LINE confirmation
- Telegram bot masked label: pending
- Telegram recipient masked label: pending
- Recipient discovery method: pending
- Token storage path, no value: pending
- LINE scope: pending
- LINE webhook/signature verification status: pending
- Allowed smoke target: pending
- Final send approval status: pending; no smoke send is approved

## Verification Output

Do not paste bot tokens, access tokens, channel secrets, webhook secrets, `.env` values, or full private customer identifiers.

```text
Local preflight:
- Hermes gateway status command reports gateway running manually.
- Telegram smoke helper exists at `/Users/sirinx/.local/bin/hermes-telegram-test`, but it was not executed.
- Blocked actions remain: Telegram smoke send, LINE push/reply send, role messaging enable.

Pending human verification:
- Telegram token rotation or owner confirmation
- Telegram intended recipient name and chat proof
- Recipient must message bot or join target chat
- LINE OA scope, webhook raw-body signature verification, and allowed recipient policy
```

## Stop Rule

Stop if the recipient is only a bot username, hidden registration id, stale chat id, unverified group/channel, or if token rotation/owner confirmation is incomplete.
