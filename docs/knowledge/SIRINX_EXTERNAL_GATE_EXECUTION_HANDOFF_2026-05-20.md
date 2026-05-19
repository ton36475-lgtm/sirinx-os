# SIRINX External Gate Execution Handoff - 2026-05-20

Status: prepared, blocked only where human credential/device consent is required

## Scope

This packet covers the four remaining external gates:

1. Codex Mobile QR/MFA pairing
2. Telegram/LINE recipient and token setup
3. Solis API consent, credential setup, and read-only telemetry smoke
4. Cloudflare Bot Management official review to replace or validate the current CSP mitigation

Rules:

- Do not read `.env` values.
- Do not print tokens, API keys, chat IDs from private config, or customer credentials.
- Do not send Telegram, LINE, customer, Solis, DNS, Cloudflare, or database writes without exact target approval.
- Keep `www.sirinx.co` public website baseline unchanged unless a separate website task explicitly targets it.

## Preflight Result

| Gate | Current state | Next blocker |
| --- | --- | --- |
| Codex Mobile | Local runbooks exist. Hermes pairing list reports no pending pairings. | Human must open Codex App on Mac, show QR, scan in ChatGPT mobile, and complete MFA/SSO/passkey. |
| Telegram | Hermes status reports Telegram configured with home target `8719485384`; gateway is running. | Current home target is not proven deliverable. Token/recipient must be rotated or confirmed before any send. |
| LINE | No production-safe LINE adapter is recorded in the current handoff. | LINE OA channel secret/access token/webhook target and allowed recipient policy are missing. |
| Solis | Policy and architecture exist in read-only/dry-run mode. Local `solis` command currently resolves to Hermes CLI help, not a verified Solis telemetry adapter. | Customer consent, SolisCloud API access, credential storage path, and station mapping are missing. |
| Cloudflare Bot Management | Current production mitigation is live via CSP allowlist. Lighthouse mobile now avoids `/cdn-cgi/challenge-platform/scripts/jsd/main.js`. | Official dashboard/API Bot Management review still needs Cloudflare permission. |

Important note:

- `/Users/sirinx/.local/bin/hermes-telegram-test --help` is not a help-only command. It attempted a Telegram request and returned `403`. Do not run it again until the token and recipient target are rotated or confirmed. No token value was printed.

## Gate 1 - Codex Mobile QR/MFA Pairing

Objective:

- Make the phone the command/review/approval surface while this Mac mini remains the execution host.

Manual steps:

1. Open Codex App on the Mac mini.
2. Open `Set up Codex mobile` or `Settings > Connections`.
3. Keep the QR code visible.
4. On the phone, open ChatGPT mobile with the same account/workspace.
5. Open Codex mobile and scan the QR.
6. Complete MFA, SSO, or passkey if prompted.
7. Verify the Mac host appears on mobile.

Verification:

- Mobile shows the Mac host online.
- Same ChatGPT account/workspace is visible.
- Mac stays awake and Codex App remains open.

Stop rule:

- Do not bypass QR/MFA/workspace checks.

## Gate 2 - Telegram/LINE Recipient And Token Setup

Objective:

- Fix deliverable messaging targets before any production messaging.

Telegram sequence:

1. Revoke or rotate any legacy bot token that may exist in old repo scripts.
2. User sends a fresh message to the bot or adds the bot to the intended private group/channel.
3. Discover the real `chat.id` from update metadata without printing token values.
4. Store target through approved secret/config path.
5. Run exactly one smoke send to the confirmed test recipient.
6. Keep role messaging disabled until the smoke send succeeds.

LINE sequence:

1. Confirm LINE OA channel.
2. Store channel secret/access token in approved secret storage only.
3. Configure webhook endpoint and signature verification.
4. Confirm allowed test recipient/group.
5. Run one controlled test event or smoke send only after target approval.

Current blocker:

- Telegram target `8719485384` is configured but not proven deliverable.
- LINE OA adapter and credential path are not configured.

Stop rule:

- Stop if target is a bot username, hidden registration id, stale chat id, unverified LINE webhook, or if token rotation is not complete.

## Gate 3 - Solis Read-Only Telemetry

Objective:

- Connect Solis inverter data as read-only telemetry for analysis and future load-balancing recommendations.

Required before any real API call:

1. Customer/site consent record.
2. SolisCloud API access approved by account owner.
3. Credential storage path approved.
4. Station/site/inverter mapping known.
5. Kill switch and audit path confirmed.
6. No control adapter enabled.

Read-only smoke test target:

- Fetch station/inverter metadata.
- Fetch current telemetry snapshot.
- Fetch alarm state.
- Normalize into internal telemetry snapshot.
- Record freshness and source metadata.

Forbidden:

- Inverter control.
- Schedule change.
- Export limit change.
- Load-control command.
- Battery dispatch command.
- Any physical or cyber-physical write.

Stop rule:

- Stop if consent, credentials, station mapping, alarm status, or engineer signoff is missing.

## Gate 4 - Cloudflare Bot Management Official Review

Current production state:

- `www.sirinx.co` is live with CSP mitigation.
- Public scripts are restricted to deployed `/assets/` paths and Cloudflare Insights.
- Live smoke confirmed the public runtime loads and `/cdn-cgi/challenge-platform/` is not loaded.
- Lighthouse homepage mobile improved to performance `76`, TBT `30ms`, CLS `0`.

Official review sequence:

1. Open Cloudflare dashboard for the `sirinx.co` zone.
2. Review Bot Fight Mode, Super Bot Fight Mode, Bot Management, JavaScript Detections, WAF custom rules, and security events.
3. Confirm whether the zone plan supports official path-specific bot rules.
4. If available, prefer a dashboard/API rule that protects admin/API surfaces while avoiding challenge JavaScript on public marketing pages.
5. Keep the current CSP mitigation until the official rule is tested and reversible.

Useful official references:

- Cloudflare JavaScript Detections: https://developers.cloudflare.com/bots/reference/javascript-detections/
- Cloudflare Bot detection engines: https://developers.cloudflare.com/bots/concepts/bot-detection-engines/
- Cloudflare WAF feature interoperability: https://developers.cloudflare.com/waf/feature-interoperability/
- OpenAI Codex overview: https://openai.com/codex
- OpenAI Codex getting started: https://openai.com/academy/codex-how-to-start/

Stop rule:

- Do not loosen protection for admin, API, auth, dashboard, webhook, or telemetry routes without a separate rule and rollback path.

## Strict Execution Order

1. Pair Codex Mobile manually.
2. Rotate or confirm Telegram token and recipient target.
3. Configure LINE OA only after Telegram smoke policy is stable.
4. Collect Solis customer consent and credentials through approved secret storage.
5. Run Solis read-only smoke only after consent and station mapping exist.
6. Review Cloudflare Bot Management officially only when dashboard/API permission is available.
7. Update Obsidian and this handoff after each gate.

## Current Recommendation

Do Gate 1 first because it unlocks mobile review/approval for the other gates. Do not run Telegram/LINE or Solis commands yet.
