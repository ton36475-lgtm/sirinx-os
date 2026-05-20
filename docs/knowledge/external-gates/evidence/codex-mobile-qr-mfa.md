# Codex Mobile QR/MFA Evidence

Gate: Codex Mobile QR/MFA pairing
Status: pending operator evidence
External writes: false
Secret storage: not applicable

## Required Evidence

- [ ] same ChatGPT account/workspace confirmed
- [ ] Mac host appears online in ChatGPT mobile Codex
- [ ] MFA/SSO/passkey completed
- [x] Mac keep-awake confirmed
- [x] wrong-account rollback understood

## Operator Record

- Date/time: 2026-05-20 15:13:09 +0700
- Operator: Codex local preflight; human operator still required for QR/MFA
- Host name or masked device label: Mac mini host, local label `MacminiSirinx.local`
- Mobile device masked label: pending
- Workspace/account confirmation method: pending
- Pairing result: pending
- Rollback note: use official unpair/disconnect flow if the wrong account, workspace, or host is paired

## Verification Output

Do not paste secrets, cookies, session ids, QR payloads, MFA codes, passkeys, or account-private identifiers.

```text
Local preflight:
- Codex host process observed: `codex app-server --listen stdio://`
- macOS AC power sleep setting observed: `sleep 0`
- Computer Use cannot operate `com.openai.codex`; QR/MFA must be completed by the human operator in the official Codex App and ChatGPT mobile flow.

Pending human verification:
- same ChatGPT account/workspace
- Mac host appears online in ChatGPT mobile Codex
- MFA/SSO/passkey completion
```

## Stop Rule

Stop if the Codex mobile host is not the same Mac/workspace/account, if MFA fails, or if the host does not appear online after pairing.
