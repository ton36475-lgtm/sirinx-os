# SIRINX Website Human Review Checklist

Status: human review checklist only
Date: 2026-07-03T00:42:00+0700
Scope: `apps/sirinx-site`
Local preview: `http://127.0.0.1:8730/`
Deploy status: not approved

## Purpose

This checklist turns the current local website evidence into a practical human review flow before any deploy decision. It does not approve deploy, push, LINE webhook activation, production analytics, CRM/customer data storage, external sends, public tunnel, provider calls, package installs, or production mutation.

## Review Preconditions

- Use the local preview URL only: `http://127.0.0.1:8730/`
- Do not enter real customer data into any page.
- Do not approve deploy from this checklist alone.
- Keep these approval gates closed unless explicitly approved later:
  - `APPROVE_DEPLOY_SIRINX_SITE_<date>`
  - `APPROVE_LINE_WEBHOOK_<scope>_<date>`
  - `APPROVE_PRODUCTION_ANALYTICS_<scope>_<date>`
  - `APPROVE_CRM_CUSTOMER_DATA_STORAGE_<scope>_<date>`

## Evidence Packet Map

| Packet | Purpose | Current meaning |
| --- | --- | --- |
| `packet_039` | LINE local UAT verification receipt | Local automated UAT evidence only. |
| `packet_040` | Human review and deploy approval gate | Human review is still required before deploy approval. |
| `packet_041` | Visual correction evidence receipt | Floating dock and QR obstruction corrections were locally verified. |
| `packet_042` | SEO/AEO metadata evidence receipt | Route-level metadata coverage was locally verified. |
| `packet_043` | Accessibility/performance guardrail receipt | Current nav, image stability, and accessibility guardrails were locally verified. |

## Automated Evidence Already Collected

Latest local verification evidence:

- `pnpm --filter @sirinx/site build`: passed
- `pnpm --filter @sirinx/site check`: passed, 18 files checked
- `pnpm --filter @sirinx/site test:line`: passed, 106 Playwright checks
- `pnpm --filter @sirinx/site test:closed-gates`: passed, 3 checks
- `pnpm --filter @sirinx/site test:server`: passed, 2 checks
- `pnpm --filter @sirinx/site review:github-live`: passed, `packet_065`
- `pnpm --filter @sirinx/site review:line-qr`: passed, `packet_066`
- `git diff --check`: passed
- Static forbidden pattern scan on quote, ROI, and app script: no form/storage/network/analytics/CRM matches

Screenshots for visual review:

- `/tmp/sirinx-line-compact-dock-desktop-v2.png`
- `/tmp/sirinx-line-qr-unobstructed-mobile.png`
- `/tmp/sirinx-projects-mobile-trigger-48.png`
- `/tmp/sirinx-trust-mobile-trigger-48.png`
- `/tmp/sirinx-quote-crm-readiness-final-desktop.png`
- `/tmp/sirinx-quote-crm-readiness-final-mobile.png`

## Manual Review Checklist

### 1. Homepage

- [ ] Open `http://127.0.0.1:8730/`
- [ ] Confirm the first viewport looks credible, premium, technical, and aligned with clean energy / AI energy.
- [ ] Confirm primary CTA routes to `/contact?interest=solar-carport`.
- [ ] Confirm LINE CTA routes to `/line`.
- [ ] Confirm floating LINE / inquiry dock does not cover critical content.
- [ ] Confirm mobile layout has no overlapping headline, button, footer, or floating contact UI.

### 2. LINE Official Page

- [ ] Open `http://127.0.0.1:8730/line`
- [ ] Confirm display name appears as `SIRINX โซล่าเซลล์`.
- [ ] Confirm LINE ID appears as `@304zrttj`.
- [ ] Confirm short link appears as `https://lin.ee/S97R6nj`.
- [ ] Confirm QR is visible and not covered on desktop.
- [ ] Confirm QR is visible and not covered on mobile.
- [ ] Scan the QR on a real device.
- [ ] Confirm the QR opens the correct SIRINX LINE Official account.
- [ ] Confirm Add LINE button opens the correct LINE target.
- [ ] Confirm Chat button opens the LINE chat target.

### 3. Contact Page

- [ ] Open `http://127.0.0.1:8730/contact`
- [ ] Confirm LINE QR and email contact path are both visible.
- [ ] Confirm no web form is present.
- [ ] Confirm copy explains sending electricity bills, site photos, and project questions.
- [ ] Confirm mobile QR remains scannable.

### 4. Projects Page

- [ ] Open `http://127.0.0.1:8730/projects`
- [ ] Confirm project proof copy does not fabricate customer names, photos, reviews, ratings, certifications, or guaranteed performance.
- [ ] Confirm it explains evidence, permission, and responsible publishing.
- [ ] Confirm LINE/contact CTA remains visible.

### 5. Trust Center

- [ ] Open `http://127.0.0.1:8730/trust-center`
- [ ] Confirm trust content clearly states evidence before claims.
- [ ] Confirm closed gates remain visible for LINE webhook, production analytics, CRM/customer data storage, and database writes.
- [ ] Confirm there are no fake reviews, ratings, certifications, or unsupported guarantees.

### 6. Quote Readiness

- [ ] Open `http://127.0.0.1:8730/quote`
- [ ] Confirm the page is preparation-only, not a quote submission form.
- [ ] Confirm there is no input field or file upload.
- [ ] Confirm readiness checklist does not store browser data.
- [ ] Confirm CRM readiness section is clearly marked as closed and future-only.

### 7. ROI Readiness

- [ ] Open `http://127.0.0.1:8730/roi-calculator`
- [ ] Confirm the page does not calculate or guarantee ROI.
- [ ] Confirm assumptions are presented as preparation guidance only.
- [ ] Confirm there is no analytics, CRM write, storage, or customer data path.

### 8. Existing Bot / Inquiry Behavior

- [ ] Open the floating inquiry button on desktop.
- [ ] Confirm inquiry/contact path still appears beside LINE Official behavior.
- [ ] Confirm LINE mini button does not replace the existing inquiry path.
- [ ] Open the mobile contact tray.
- [ ] Confirm LINE actions and inquiry actions are both visible.
- [ ] Close the tray and confirm page scroll/interaction returns normally.

### 9. Accessibility And Navigation

- [ ] Confirm keyboard focus can reach the skip link.
- [ ] Confirm each subpage highlights the current navigation item.
- [ ] Confirm mobile contact close button is usable.
- [ ] Confirm QR image has meaningful alt text if inspected by browser accessibility tools.

## Deploy Decision Gate

Deploy can be considered only after all of the following are true:

- Human visual review is complete.
- Real-device LINE QR scan confirms the correct account.
- Existing bot / inquiry behavior is manually confirmed.
- The operator provides a separate exact approval phrase: `APPROVE_DEPLOY_SIRINX_SITE_<date>`.

This checklist is not deploy approval.

## Rollback Notes

If review fails, rollback options are local code changes only:

- Remove or revise the route that failed review.
- Remove the floating contact cluster import/injection if it causes UI collision.
- Revert LINE Official config if the account data is wrong.
- Revert SEO/AEO metadata changes if social preview requirements change.
- Revert quote/ROI readiness sections if customer-facing gate language is not approved.

## Next Safe Action

Run human review against the local preview, capture manual results in a follow-up receipt, and keep all external or production gates closed until explicitly approved.
