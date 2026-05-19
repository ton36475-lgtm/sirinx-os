# SIRINX External Gate Action Packets

Date: 2026-05-20
Status: current execution queue; local-safe only until exact evidence exists
Source of truth: `NEXT_ACTIONS.md`, `KNOWN_ISSUES.md`, `SIRINX_EXTERNAL_GATE_EXECUTION_HANDOFF_2026-05-20.md`

## Purpose

This document converts the remaining SIRINX work into exact action packets. It replaces the old 2026-05-19 release queue, because the public website PR, Cloudflare production deploy, PageSpeed pass, Home Solution page, live energy background, AI avatar motion, section seam cleanup, and Command Center four-gate refresh are already completed.

No packet is self-approved by this document. Broad permission does not override a missing target, missing credential evidence, missing consent, missing rollback plan, or missing smoke-test plan.

## Current Local State

| Area | Current state |
| --- | --- |
| SIRINX OS repo | `/Users/sirinx/sirinx-os` |
| SIRINX OS branch | `codex/urgent-backlog-execution` |
| SIRINX OS remote | no remote printed by `git remote -v`; push/PR is blocked until a target remote and branch are approved |
| SIRINX OS worktree | clean before this action-packet refresh |
| Public website repo | `/Users/sirinx/restore-sources/ton36475-lgtm-sirinx` |
| Public website branch | `codex/home-solution-seo-hydration`, tracking `origin/main` |
| Public website latest source | `41dced7 perf: restrict public scripts to assets` |
| Public website production | deployed and verified on `www.sirinx.co`; do not modify in this gate queue |
| Command Center | local API `http://127.0.0.1:8711`, dashboard `http://127.0.0.1:8710` |
| External gate evidence check | `ready=0`, `blocked=4`, `unsafe=0` |
| External writes | `false` |

## Execution Rule

Run local checks before and after each packet:

```bash
cd /Users/sirinx/sirinx-os
pnpm external-gates:evidence-check
pnpm external-gates:check
git status --short
```

Expected safe state before external execution:

- no secret-like evidence content
- no dirty public website worktree
- Command Center API reports external writes disabled
- exact human/credential evidence exists for the specific gate

## Packet 0 - Publish `sirinx-os` To GitHub

Status: separate external-write gate, not part of the four Command Center operational gates.

Goal:

- Publish the local `sirinx-os` branch only after the operator confirms the exact repository remote, branch name, and PR target.

Current blocker:

- `git remote -v` printed no configured remote for `/Users/sirinx/sirinx-os`.
- A GitHub push or PR is an external write.

Required evidence:

- target GitHub owner/repo
- target remote URL
- target branch name
- base branch name
- PR title/body approval
- rollback rule, usually no force-push and close PR if wrong target

Allowed after exact approval:

```bash
cd /Users/sirinx/sirinx-os
git status --short --branch
git remote -v
git push <approved-remote> codex/urgent-backlog-execution:<approved-branch>
```

Forbidden:

- creating a remote from guesswork
- force-pushing
- pushing secrets or `.env`
- opening a PR to the wrong owner/repo

Stop rule:

- Stop if the remote is missing, owner/repo is uncertain, local status is dirty, or the push target differs from the approved packet.

## Packet 1 - Codex Mobile QR/MFA Pairing

Status: manual human/device gate.

Goal:

- Use the phone as command/review/approval surface while the Mac mini remains the execution host.

Required evidence file:

- `docs/knowledge/external-gates/evidence/codex-mobile-qr-mfa.md`

Required checked evidence:

- same ChatGPT account/workspace confirmed
- Mac host appears online in ChatGPT mobile Codex
- MFA/SSO/passkey completed
- Mac keep-awake confirmed
- wrong-account rollback understood

Manual sequence:

1. Open Codex App on the Mac mini.
2. Open `Set up Codex mobile`.
3. Scan QR in ChatGPT mobile using the same account/workspace.
4. Complete MFA, SSO, or passkey.
5. Confirm the Mac host appears online on mobile.
6. Keep Codex App open and keep the Mac awake.

Verification:

```bash
hermes pairing list
pnpm external-gates:evidence-check
pnpm external-gates:check
```

Stop rule:

- Do not bypass QR, MFA, passkey, workspace, or account checks.

## Packet 2 - Telegram/LINE Recipient And Token Setup

Status: blocked until credential/recipient evidence exists.

Goal:

- Establish a safe recipient and credential path before any send.

Required evidence file:

- `docs/knowledge/external-gates/evidence/telegram-line-recipient-token.md`

Required checked evidence:

- Telegram token rotated or owner-confirmed
- Telegram intended recipient named
- Telegram recipient has messaged bot or joined target chat
- LINE OA channel confirmed or explicitly not in scope
- no message-send smoke before final target approval

Allowed after evidence and final target approval:

- discover recipient metadata without printing token values
- run exactly one smoke send to the confirmed test recipient
- keep role messaging disabled until smoke succeeds

Forbidden:

- running `/Users/sirinx/.local/bin/hermes-telegram-test` before token/recipient evidence
- sending to a bot username, hidden registration id, stale chat id, or unverified recipient
- printing bot tokens, LINE tokens, channel secrets, or `.env` values
- enabling role messaging before smoke success

Stop rule:

- Stop if target deliverability is unproven, token rotation is incomplete, LINE signature verification is missing, or final smoke-send target approval is absent.

## Packet 3 - Solis Read-Only Telemetry

Status: blocked until customer/site consent, credential storage, and station mapping exist.

Goal:

- Connect Solis inverter data as read-only telemetry for analysis and future load-balancing recommendations.

Required evidence file:

- `docs/knowledge/external-gates/evidence/solis-readonly-telemetry.md`

Required checked evidence:

- customer/site consent recorded
- credential storage path approved
- station/inverter/logger/meter mapping recorded
- read-only smoke scope confirmed
- control/write path disabled

Allowed first smoke after evidence:

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
- load-control command
- any cyber-physical write

Stop rule:

- Stop if consent, credentials, station mapping, alarm status, engineer signoff, kill switch, or read-only adapter boundary is missing.

## Packet 4 - Cloudflare Bot Management Official Review

Status: optional official review; current CSP mitigation remains active.

Goal:

- Decide whether Cloudflare Bot Management/WAF can replace the current CSP mitigation with a cleaner reversible rule while protecting admin/API/auth/webhook/telemetry paths.

Required evidence file:

- `docs/knowledge/external-gates/evidence/cloudflare-bot-management-review.md`

Required checked evidence:

- Cloudflare zone and permission scope confirmed
- current CSP mitigation acknowledged
- admin/API/auth/webhook/telemetry protection preserved
- candidate rule and rollback path recorded
- post-change smoke matrix recorded

Read-only review:

- Bot Fight Mode / Super Bot Fight Mode
- Bot Management / JavaScript Detections
- WAF custom rules
- security events
- route/path scoping

Do not change without an approved mutation packet:

- DNS
- Pages project route
- WAF/Bot rule
- Access policy
- Cloudflare secrets
- production deployment

Stop rule:

- Stop if the proposed rule loosens admin, API, auth, dashboard, webhook, or telemetry protection, or if rollback and smoke tests are not defined.

## Strict Current Sequence

1. Keep `www.sirinx.co` protected and unchanged.
2. Pair Codex Mobile manually.
3. Fill the matching evidence file for Packet 1 and rerun `pnpm external-gates:evidence-check`.
4. Fix Telegram/LINE target evidence, then run one approved smoke only after final target approval.
5. Collect Solis consent and station mapping, then run read-only smoke only after evidence is ready.
6. Review Cloudflare Bot Management only with dashboard/API permission and a rollback plan.
7. Publish `sirinx-os` to GitHub only after the exact target remote/branch/PR is approved.

## Current Recommendation

Do Packet 1 first. It unlocks mobile review/approval for every later external gate while keeping all production systems unchanged.
