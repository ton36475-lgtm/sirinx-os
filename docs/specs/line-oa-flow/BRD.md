# LINE Official Account Flow BRD

Status: local implementation support
Target: `apps/sirinx-site`

## Business Objective

Make LINE Official the canonical low-friction contact path for SIRINX solar assessment requests while preserving the existing website contact behavior and keeping all automation gates closed.

## Canonical LINE Account

- Display name: `SIRINX โซล่าเซลล์`
- Basic ID: `@304zrttj`
- Premium ID target: `@sirinx`
- Short link: `https://lin.ee/S97R6nj`
- Add Friend: `https://line.me/R/ti/p/%40304zrttj`
- Chat: `https://line.me/R/oaMessage/%40304zrttj`
- QR image: `https://qr-official.line.me/gs/M_304zrttj_GW.png?oat_content=qr`

## Business Outcomes

- Customers can add SIRINX on LINE from homepage, footer, floating contact, `/line`, and `/contact`.
- Customers understand what to prepare before asking for assessment.
- Internal team can later add quote form, ROI calculator, CRM, and LINE automation from a documented contract.

## Scope

In scope:
- Static LINE Official config.
- QR display.
- Add Friend and Chat links.
- Dedicated `/line` page.
- LINE CTA coverage on homepage, footer, contact page, and floating contact.
- Event tracking placeholders only.

Out of scope until explicit approval:
- LINE webhook.
- Automated LINE messages.
- LINE rich menu.
- Production analytics.
- CRM/customer data storage.
- Customer or production data processing.

## Success Metrics

- LINE QR is visible and scannable in browser UAT.
- Add Friend and Chat links point to canonical URLs.
- `/line` and `/contact` pass local checks.
- No live send, webhook, or data write is introduced.
