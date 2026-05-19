# SIRINX External Gate Operator Runbook - 2026-05-20

Status: active runbook for the four remaining external gates

## Operating Rule

This runbook turns the remaining blocked work into exact operator actions. It does not grant approval to send messages, use credentials, mutate Cloudflare, call SolisCloud, deploy, or change `www.sirinx.co`.

Run local checks first:

```bash
cd /Users/sirinx/sirinx-os
pnpm external-gates:check
pnpm external-gates:write
```

Expected safety state:

- `externalWrites=false`
- `canExecuteNow=false`
- `Hard failures: 0`
- public website repo clean
- Command Center preflight has exactly 4 gates

## Gate 1 - Codex Mobile QR/MFA

Goal:

- Use the phone as command/review/approval while this Mac mini remains the execution host.

Operator steps:

1. Open Codex App on the Mac mini.
2. Open `Set up Codex mobile`.
3. Confirm the same ChatGPT account and workspace as the phone.
4. Scan QR using ChatGPT mobile.
5. Complete MFA, SSO, or passkey.
6. Verify the Mac host appears online on mobile.
7. Keep Codex App open and keep the Mac awake.

Verification:

```bash
hermes pairing list
pnpm external-gates:check
```

Stop if:

- wrong account
- wrong workspace
- QR expired
- MFA fails
- host does not appear on mobile

Note:

- Computer Use cannot operate `com.openai.codex` in this environment, so this is intentionally a human manual gate.

## Gate 2 - Telegram/LINE Recipient And Token Setup

Goal:

- Establish a safe recipient and credential path before any send.

Telegram required evidence:

- token has been rotated or confirmed by owner
- intended user/group/channel is named
- intended recipient has messaged the bot or added the bot to the target chat
- discovered `chat.id` is confirmed by the operator
- allowed-recipient policy is recorded

Forbidden before evidence exists:

- running `/Users/sirinx/.local/bin/hermes-telegram-test`
- sending smoke messages
- enabling role messaging
- printing bot token
- committing recipient/token config if it contains secrets

LINE required evidence:

- LINE OA channel confirmed
- channel secret/access token stored in approved secret storage
- webhook endpoint confirmed
- raw body signature verification implemented or externally verified
- allowed test recipient/group named

Stop if:

- target is only a bot username
- chat id is stale or hidden
- LINE signature verification is missing
- token rotation/confirmation is incomplete

## Gate 3 - Solis Read-Only Telemetry

Goal:

- Prepare read-only telemetry before any future load-balancing work.

Required evidence:

- written customer/site consent
- SolisCloud API access approved by account owner
- credential storage path approved
- station id, inverter id, logger id, meter id, and customer/site mapping known
- engineer signoff recorded
- kill switch and audit path known

Allowed first smoke, after evidence exists:

- station metadata read
- inverter metadata read
- current telemetry snapshot read
- alarm state read
- freshness/source metadata record

Forbidden:

- inverter control
- battery dispatch
- export limit change
- schedule change
- load control command
- any cyber-physical write

Stop if:

- consent missing
- station mapping uncertain
- credentials are not in approved storage
- adapter exposes write/control endpoint by default

## Gate 4 - Cloudflare Bot Management Official Review

Current truth:

- CSP mitigation is live.
- CSP allows deployed `/assets/` scripts.
- CSP does not allow `/cdn-cgi/challenge-platform`.
- Browser smoke confirms `challengeLoaded=false`.
- Cloudflare still injects a challenge-platform tag into raw HTML, but CSP blocks execution.

Official review goal:

- Decide whether Cloudflare Bot Management/WAF can replace the CSP mitigation with a cleaner reversible rule.

Read-only review checklist:

- Bot Fight Mode / Super Bot Fight Mode
- Bot Management / JavaScript Detections
- WAF custom rules
- security events
- route/path scoping
- admin/API/auth/webhook/telemetry protection

Do not change:

- DNS
- Pages project route
- WAF/Bot rule
- Access policy
- Cloudflare secrets
- production deployment

unless exact rule, affected path, rollback path, and verification plan are recorded.

## Validation Matrix

| Check | Command | Expected |
| --- | --- | --- |
| Local gate readiness | `pnpm external-gates:check` | `Hard failures: 0` |
| Local packet write | `pnpm external-gates:write` | writes only local Obsidian gate packet/preflight |
| Command Center E2E | `pnpm dashboard:e2e` | `8 passed` |
| Static verification | `pnpm verify` | passes |
| Public repo safety | `git -C /Users/sirinx/restore-sources/ton36475-lgtm-sirinx status --short` | no changes |

