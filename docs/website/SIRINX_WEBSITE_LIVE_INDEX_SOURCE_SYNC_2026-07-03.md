# SIRINX Website Live Index Source Sync

Date: 2026-07-03
Scope: `apps/sirinx-site`
Mode: local-only, no deploy, no push

## Source Used

- Live URL: `https://www.sirinx.co/`
- Local captured HTML: `/tmp/sirinx-live-index.html`
- Local captured CSS: `/tmp/sirinx-live-index.css`
- Local captured home bundle: `/tmp/sirinx-live-home.js`

The live page was read as public website source only. No production mutation, deploy, push, webhook, analytics activation, CRM write, customer data storage, package install, or secret read was performed.

## Applied Locally

- Replaced local homepage hero copy with the live index hero:
  - `เปลี่ยนที่จอดรถ`
  - `เป็นโรงไฟฟ้าพลังงานแสงอาทิตย์`
  - `ผลิตไฟฟ้า ให้ร่มเงา รองรับ EV Charger ลดค่าไฟ 30-100% คืนทุน 3-5 ปีโดยประมาณตามข้อมูลไซต์จริง`
- Replaced homepage primary CTA with the live index contact route:
  - `/contact?interest=solar-carport`
  - `ขอใบเสนอราคา Solar Carport`
- Replaced secondary CTA copy with:
  - `ดูผลงานจริง`
- Aligned homepage title, meta description, Open Graph, Twitter metadata, keyword metadata, and OG image with the live index source.
- Kept the LINE Official homepage CTA as a secondary local requirement so the LINE integration is not removed.
- Kept local image references to the existing available asset instead of adding missing AVIF/640/960 references that would 404 locally.
- Kept closed gates for deploy, push, LINE webhook, production analytics, CRM/customer data storage, customer data collection, database writes, package installs, and public tunnels.

## Guardrails Added Or Updated

- Static checker now requires the live-index homepage copy and CTA.
- Browser UAT now verifies the live-index homepage hero and primary CTA route.
- Browser UAT continues to verify LINE CTA, `/line`, `/contact`, route metadata, mobile nav, QR rendering, existing inquiry path, and closed lead-capture gates.

## Visual Evidence

- Homepage desktop after live-index sync: `/tmp/sirinx-live-index-applied-home-desktop-final.png`
- Homepage mobile after live-index sync: `/tmp/sirinx-live-index-applied-home-mobile-final.png`
- Contact mobile after mobile contact correction: `/tmp/sirinx-live-index-applied-contact-mobile.png`

## Verification

- `git diff --check -- apps/sirinx-site/src apps/sirinx-site/scripts/check.mjs apps/sirinx-site/tests/line-integration.spec.ts`: passed
- `pnpm --filter @sirinx/site build`: passed
- `pnpm --filter @sirinx/site check`: passed, 18 files checked
- `pnpm --filter @sirinx/site test:line`: passed, 106 Playwright checks
- `pnpm --filter @sirinx/site test:closed-gates`: passed, 3 tests
- `pnpm --filter @sirinx/site test:server`: passed, 2 tests

## Manual Review Still Required

- Human visual review of local preview.
- Real-device LINE QR scan.
- Manual existing bot/inquiry behavior confirmation.
- Manual deploy approval if accepted.

