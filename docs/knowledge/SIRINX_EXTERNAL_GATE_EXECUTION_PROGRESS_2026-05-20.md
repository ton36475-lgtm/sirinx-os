# SIRINX External Gate Execution Progress - 2026-05-20

Status: local/read-only execution advanced; external writes remain gated

## Scope

This progress note continues the current four-gate external workflow:

1. Codex Mobile QR/MFA pairing
2. Telegram/LINE recipient and token setup
3. Solis API consent, credential setup, and read-only telemetry smoke
4. Cloudflare Bot Management official review

No public website runtime files were changed in this pass.

## Work Completed

### Part 1 - Command Center Runtime Sync

- Restarted the local Command Center API/dashboard stack so port `8711` loads the committed four-gate workflow instead of the stale nine-gate process.
- Verified `/api/external-gate-preflight` now returns:
  - 4 entries
  - 2 reviewed
  - 2 blocked
  - 1 manual human gate
  - 1 optional official review
  - `canExecuteNow=false`
  - `externalWrites=false`

### Part 2 - Repeatable Readiness Runner

Added:

- `scripts/external-gate-readiness.sh`
- package script `pnpm external-gates:check`
- `scripts/external-gate-write-local-records.sh`
- `scripts/external-gate-evidence-check.mjs`
- package script `pnpm external-gates:write`
- package script `pnpm external-gates:evidence-check`
- `SIRINX_EXTERNAL_GATE_OPERATOR_RUNBOOK_2026-05-20.md`
- `docs/knowledge/external-gates/` evidence intake templates

The runner checks:

- `sirinx-os` git status
- public website repo git status
- Command Center API health
- current four-gate preflight shape
- dashboard HTTP availability
- Hermes gateway/pairing readability
- Telegram/LINE blocked-send state
- Solis policy presence without calling SolisCloud
- live `www.sirinx.co` CSP state

The runner intentionally does not:

- read `.env`
- print secrets
- send Telegram/LINE messages
- call SolisCloud with credentials
- mutate Cloudflare
- deploy or change website runtime

Latest result:

- `pnpm external-gates:check` passed with `Hard failures: 0`.
- `pnpm external-gates:write` wrote local approval packet and audit preflight records into Obsidian with `externalWrites=false`.
- `pnpm external-gates:evidence-check` initially returned `ready=0`, `blocked=4`, and `unsafe=0` for the operational gates. It now also tracks the separate `sirinx-os` GitHub publish target so push/PR evidence is not outside the checker.

### Part 3 - Dashboard E2E Alignment

Updated the dashboard browser tests so they assert the current four gates rather than the completed nine-gate release flow.

Validation:

- Initial E2E found stale expectations for `GitHub Push And PR Update` and `Gate 8`.
- Test expectations were updated to:
  - `Gate 1: Codex Mobile QR/MFA Pairing`
  - `Gate 2: Telegram/LINE Recipient And Token Setup`
  - `Gate 3: Solis API Consent And Read-Only Telemetry`
  - `Gate 4: Cloudflare Bot Management Official Review`
- `pnpm dashboard:e2e` passed `8/8`.

### Part 4 - Live Website Cloudflare/CSP Read-Only Smoke

Read-only live checks on `https://www.sirinx.co/` found:

- CSP header is present.
- CSP allows deployed `/assets/` scripts.
- CSP does not allow `/cdn-cgi/challenge-platform` scripts.
- Cloudflare still injects a challenge-platform tag into fetched HTML.
- Browser execution is blocked by CSP, so `challengeLoaded=false`.

Playwright mobile smoke on:

- `/`
- `/home-solution/`
- `/contact/`

Result:

- `challengeLoaded=false`
- deployed asset script loaded
- no horizontal overflow
- live energy layer present
- AI avatar layer present
- robots remain `index, follow`
- each route logs one expected CSP block for Cloudflare's injected challenge script

### Part 5 - Evidence Readiness Workbench

Added:

- working evidence files under `docs/knowledge/external-gates/evidence/`
- shared evidence checker module `services/dev-control-api/src/external-gate-evidence.mjs`
- test coverage `services/dev-control-api/src/external-gate-evidence.test.mjs`
- local API `GET /api/external-gate-evidence`
- Command Center `Evidence Readiness` panel

Current evidence state:

- 5 gates, including the separate `sirinx-os` GitHub publish target
- `ready=0`
- `blocked=5`
- `missingEvidenceFiles=0`
- `incomplete=5`
- `unsafe=0`
- checked items `0/25`

This means the evidence files now exist and are safe to fill, but no external execution is authorized yet.

### Part 6 - Gate Runner Readiness

Added:

- `services/dev-control-api/src/external-gate-runner.mjs`
- `services/dev-control-api/src/external-gate-runner.test.mjs`
- `scripts/external-gate-runner.mjs`
- local API `GET /api/external-gate-runner`
- Command Center `Gate Runner Readiness` panel

The runner lists:

- safe local checks for each gate
- blocked external actions for each gate
- operator next step
- `canExecuteNow=false`
- `externalWrites=false`

Current runner state:

- 5 gates
- executable now `0`
- external writes `false`
- all external actions still blocked until evidence is ready and exact target approval exists

## Current Gate Status

| Gate | Status | Current blocker |
| --- | --- | --- |
| Codex Mobile QR/MFA | Manual human gate | Computer Use cannot operate `com.openai.codex`; user must open Codex App, show QR, scan on ChatGPT mobile, and complete MFA/SSO/passkey. |
| Telegram/LINE | Blocked | Token/recipient rotation or confirmation is required before any smoke send. LINE still requires OA channel, raw-body signature verification, and allowed recipient policy. |
| Solis | Blocked | Customer consent, credential storage path, station/inverter/logger/meter mapping, and engineer signoff are required before any read-only API call. |
| Cloudflare Bot Management | Optional official review | Current CSP mitigation works, but dashboard/API permission is required to replace it with an official Bot/WAF rule. |

## Official References Reviewed

- OpenAI Codex mobile preview: https://openai.com/index/work-with-codex-from-anywhere/
- Cloudflare JavaScript Detections: https://developers.cloudflare.com/bots/reference/javascript-detections/
- Telegram Bot API: https://core.telegram.org/bots/api
- LINE webhook signature verification: https://developers.line.biz/en/docs/messaging-api/verify-webhook-signature/
- SolisCloud API documentation: https://doc.ginlongcloud.com/en/20.API%20documentation/01.SolisCloud%20Platform%20API%20Document.html

## Next Strict Sequence

1. Complete Codex Mobile QR/MFA manually in the Codex App.
2. After mobile pairing works, use mobile as the review/approval surface for the next external gate only.
3. Rotate or confirm Telegram token and recipient; do not run `hermes-telegram-test` until target evidence is present.
4. Configure LINE only after raw webhook signature verification is designed and the allowed recipient is named.
5. Collect Solis consent, credential path, and station mapping; only then run read-only metadata/telemetry/alarm smoke.
6. Review Cloudflare Bot Management in dashboard/API when permission exists; keep CSP mitigation until an official reversible rule passes live smoke.
