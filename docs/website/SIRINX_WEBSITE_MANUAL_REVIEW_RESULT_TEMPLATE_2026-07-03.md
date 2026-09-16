# SIRINX Website Manual Review Result Template

Status: deploy approval token recorded
Date prepared: 2026-07-03T00:50:00+0700
Scope: `apps/sirinx-site`
Local preview: `http://127.0.0.1:8730/`

## Purpose

Use this template to record real human review results after checking the local website. Do not mark any item passed until a human has actually reviewed it. This file is a recording template, not deploy approval.

## Reviewer

- Reviewer name:
- Review date: 2026-07-06
- Device/browser: Mobile phone QR scanner / LINE app, user-reported
- Network context:
- Notes: User reported manual QR code scan passed and approved on 2026-07-06. User also provided the exact deploy approval token `APPROVE_DEPLOY_SIRINX_SITE_2026-07-06` on 2026-07-06. This records approval evidence only; deploy execution still requires the exact target, command, and rollback scope.

## Codex Local Preview Evidence Addendum

Date checked: 2026-07-06T21:20:24+0700

This section records local automated and visual evidence captured by Codex. It is not a human manual review, not a real-device QR scan, and not deploy approval.

- Local preview health: `pnpm --filter @sirinx/site review:preview-health` passed; all 7 local routes returned HTTP 200 and the preview server stopped after the check.
- LINE QR/link recheck: `pnpm --filter @sirinx/site review:line-qr` passed for QR asset/link availability; real-device scan remains unproven.
- Screenshot evidence manifest: `/tmp/sirinx-site-review-screenshots-1783347649326/manifest.json`
- Screenshot set: `/tmp/sirinx-site-review-screenshots-1783347649326/`
- Release readiness after checks: `READY_FOR_HUMAN_REVIEW_BLOCKED_FOR_DEPLOY`

## Required Manual Evidence

| Check | Status | Evidence / notes |
| --- | --- | --- |
| Local homepage visual review | Pending | Codex local screenshot captured: `/tmp/sirinx-site-review-screenshots-1783347649326/home-desktop.png`, `/tmp/sirinx-site-review-screenshots-1783347649326/home-mobile.png`; pending human acceptance. |
| Local `/line` visual review | Pending | Codex local screenshot captured: `/tmp/sirinx-site-review-screenshots-1783347649326/line-desktop.png`, `/tmp/sirinx-site-review-screenshots-1783347649326/line-mobile.png`; pending human acceptance. |
| Local `/contact` visual review | Pending | Codex local screenshot captured: `/tmp/sirinx-site-review-screenshots-1783347649326/contact-desktop.png`, `/tmp/sirinx-site-review-screenshots-1783347649326/contact-mobile.png`; pending human acceptance. |
| Local `/projects` visual review | Pending | Codex local screenshot captured: `/tmp/sirinx-site-review-screenshots-1783347649326/projects-desktop.png`, `/tmp/sirinx-site-review-screenshots-1783347649326/projects-mobile.png`; pending human acceptance. |
| Local `/trust-center` visual review | Pending | Codex local screenshot captured: `/tmp/sirinx-site-review-screenshots-1783347649326/trust-center-desktop.png`, `/tmp/sirinx-site-review-screenshots-1783347649326/trust-center-mobile.png`; pending human acceptance. |
| Local `/quote` visual review | Pending | Codex local screenshot captured: `/tmp/sirinx-site-review-screenshots-1783347649326/quote-desktop.png`, `/tmp/sirinx-site-review-screenshots-1783347649326/quote-mobile.png`; pending human acceptance. |
| Local `/roi-calculator` visual review | Pending | Codex local screenshot captured: `/tmp/sirinx-site-review-screenshots-1783347649326/roi-calculator-desktop.png`, `/tmp/sirinx-site-review-screenshots-1783347649326/roi-calculator-mobile.png`; pending human acceptance. |
| Desktop floating LINE dock review | Pending | Codex screenshot review observed the desktop LINE/contact floating dock on homepage; pending human acceptance. |
| Mobile contact tray review | Pending | Codex screenshot review observed mobile LINE/contact CTAs on `/line`, `/contact`, and `/roi-calculator`; pending human acceptance. |
| Real-device LINE QR scan | Passed | User reported manual QR code scan passed on 2026-07-06 using a mobile phone QR scanner / LINE app. |
| Confirm QR opens `SIRINX โซล่าเซลล์` | Passed | User approved that the scanned QR opens the SIRINX LINE Official target `SIRINX โซล่าเซลล์` on 2026-07-06. |
| Confirm Add LINE target | Pending | Read-only link check passed for `https://line.me/R/ti/p/%40304zrttj`; real phone confirmation still required. |
| Confirm Chat target | Pending | Read-only link check passed for `https://line.me/R/oaMessage/%40304zrttj`; real phone confirmation still required. |
| Existing bot / inquiry path behavior | Pending | Not verified by Codex; requires human/browser check against the expected existing bot or inquiry behavior. |
| Confirm LINE did not replace existing inquiry path | Pending | Contact page still shows LINE and email/contact paths in local screenshots; human confirmation of existing behavior still required. |
| Keyboard skip-link spot check | Pending | Not manually verified in this addendum; keep pending for human keyboard review. |
| Mobile overlap / layout spot check | Pending | Codex reviewed mobile screenshots for `/line`, `/contact`, and `/roi-calculator`; real-device/mobile acceptance still pending. |

## Automated Evidence Reference

Latest known automated evidence before human input:

- `pnpm --filter @sirinx/site build`: passed
- `pnpm --filter @sirinx/site check`: passed, 18 files checked
- `pnpm --filter @sirinx/site test:line`: passed, 106 Playwright checks
- `pnpm --filter @sirinx/site test:closed-gates`: passed, 3 checks
- `pnpm --filter @sirinx/site test:server`: passed, 2 checks
- `pnpm --filter @sirinx/site review:preview-health`: passed on 2026-07-06; all 7 routes returned HTTP 200
- `pnpm --filter @sirinx/site review:line-qr`: passed on 2026-07-06; QR asset/link availability passed, real-device scan still pending
- `pnpm --filter @sirinx/site review:screenshots`: passed on 2026-07-06; 14 screenshots captured at `/tmp/sirinx-site-review-screenshots-1783347649326/`
- `pnpm --filter @sirinx/site release:readiness`: status `READY_FOR_HUMAN_REVIEW_BLOCKED_FOR_DEPLOY`
- `pnpm --filter @sirinx/site review:github-live`: passed, `packet_065`
- `pnpm --filter @sirinx/site review:line-qr`: passed, `packet_066`
- `git diff --check`: passed
- `packet_051` live-index source sync receipt: parsed successfully
- `packet_065` GitHub/live/local automated recheck: local working copy remains the review target
- `packet_066` LINE QR/link recheck: QR PNG is 360x360 and link responses are acceptable for local review
- Forbidden quote/ROI/app script scan: no form, storage, network, analytics, or CRM matches

## Decision

Choose exactly one after manual review:

- [ ] Not ready for deploy review. Required fixes:
- [ ] Ready for deploy approval discussion, but deploy is not approved by this checkbox.
- [x] Deploy approval granted separately with exact phrase:

Exact approval phrase, if separately granted:

```text
APPROVE_DEPLOY_SIRINX_SITE_2026-07-06
```

## Closed Gates Still Closed Unless Separately Approved

- Deploy
- Push
- LINE webhook activation
- Production analytics
- CRM/customer data storage
- Customer data collection
- External message send
- Provider call
- Paid provider call
- Public tunnel
- Package install
- Database write or migration
- Secret or real `.env` read

## Follow-Up Receipt

After a human fills this result template, create a follow-up receipt that records:

- Which checks passed.
- Which checks failed.
- Device/browser used for QR scan.
- Whether existing bot / inquiry behavior was preserved.
- Whether deploy approval is still pending or separately granted.

Do not deploy from this template alone.
