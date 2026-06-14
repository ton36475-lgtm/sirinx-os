# External Gate Evidence Collection Protocol

Generated: 2026-05-28 02:22 +0700
Status: local-only protocol

## Purpose

Define how SIRINX records evidence for external gates without exposing secrets or executing external actions.

## General Rules

- Fill one gate at a time.
- Record only non-secret labels and facts.
- Never paste raw tokens, API keys, passwords, private keys, OAuth credentials, cookies, session IDs, MFA codes, QR payloads, or `.env` values.
- Do not mark a checkbox complete unless the operator has confirmed the fact.
- After each evidence update, run:

```bash
pnpm external-gates:evidence-check
```

- Do not execute the external gate until it reports ready for human review and exact target approval exists.

## Current Gates

| Gate | Evidence file | Current blocker |
| --- | --- | --- |
| Codex Mobile QR/MFA | `docs/knowledge/external-gates/evidence/codex-mobile-qr-mfa.md` | account/workspace, host online, MFA completion |
| GitHub publish target | `docs/knowledge/external-gates/evidence/sirinx-os-github-publish.md` | owner/repo, remote URL, branch/base, PR title/body |
| Telegram/LINE setup | `docs/knowledge/external-gates/evidence/telegram-line-recipient-token.md` | token ownership, recipient, recipient readiness, LINE scope |
| Solis read-only telemetry | `docs/knowledge/external-gates/evidence/solis-readonly-telemetry.md` | consent, credential path, station mapping, read-only scope |
| Cloudflare bot management | `docs/knowledge/external-gates/evidence/cloudflare-bot-management-review.md` | zone and permission scope |

## Allowed Evidence Examples

Allowed:

- Masked workspace label.
- Masked device label.
- Masked recipient label.
- Cloudflare zone nickname without account secret.
- Branch name.
- Public repo owner/repo if intentionally approved.
- Credential storage path without value.
- Consent artifact path without private customer data.

Blocked:

- Tokens.
- Passwords.
- API keys.
- Full customer private identifiers.
- Cookies.
- Session IDs.
- OAuth callback URLs containing codes.
- QR payloads.
- MFA codes.

## Gate-Specific Notes

### Codex Mobile QR/MFA

Record:

- Same ChatGPT account/workspace confirmed.
- Mac host appears online in ChatGPT mobile Codex.
- MFA/SSO/passkey completed.

Do not record:

- QR payload.
- MFA code.
- Session token.

### GitHub Publish Target

Record:

- Owner/repo.
- Remote URL without embedded credentials.
- Source branch.
- Base branch.
- PR title/body.

Do not execute:

- `git remote add`
- `git push`
- `gh pr create`

### Telegram/LINE

Record:

- Token owner/rotation confirmed without the token.
- Intended recipient masked label.
- Recipient has messaged bot or joined target chat.
- LINE OA in scope or explicitly out of scope.

Do not execute:

- Telegram smoke send.
- LINE push/reply send.

### Solis

Record:

- Consent artifact path.
- Credential storage path without value.
- Station/inverter/logger/meter masked mapping.
- Read-only smoke scope.

Do not execute:

- Login.
- Telemetry API call.
- Inverter/battery/export-limit control.

### Cloudflare

Record:

- Zone masked label.
- Permission scope.
- Candidate rule summary.
- Rollback path.
- Smoke matrix.

Do not execute:

- WAF mutation.
- Bot Management setting change.
- DNS change.
- Access policy change.
- Pages route change.

## Review Checklist

Before any gate moves to ready-for-human-review:

- [ ] No secret values were recorded.
- [ ] Evidence file has all required boxes checked.
- [ ] `pnpm external-gates:evidence-check` reports the gate as ready.
- [ ] Exact external approval names the target action.
- [ ] Rollback or stop rule is recorded.
- [ ] Operator confirms the action is still desired.

