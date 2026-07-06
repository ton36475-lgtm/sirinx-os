# A2A2A P091S Original Solar Carport Restore + LINE CTA

Packet: `P091S_RESTORE_ORIGINAL_SOLAR_CARPORT_PAGE_WITH_LINE_CTA`
Status: `P091S_ORIGINAL_SOLAR_CARPORT_RESTORE_READY_FOR_REVIEW`
Run at: `2026-07-07T03:29:24+0700`
Mode: `LOCAL_PATCH_ONLY_NO_DEPLOY`
Scope: `apps/sirinx-site`

## Objective

Restore the original Solar Carport page, not the current `/main` rewrite and not
the company-facing SIRINX operating-system page. Add only a LINE entry point and
preserve the existing P087B contact-panel safety behavior.

## Source Restored From

- Source repo: `/Users/sirinx/restore-sources/ton36475-lgtm-sirinx`
- Source commit: `15799844a0ce41ad33717cf0c2f09ce8a725596e`
- Source files:
  - `/Users/sirinx/restore-sources/ton36475-lgtm-sirinx/client/src/pages/Home.tsx`
  - `/Users/sirinx/restore-sources/ton36475-lgtm-sirinx/client/src/components/HeroSlideshow.tsx`
  - `/Users/sirinx/restore-sources/ton36475-lgtm-sirinx/client/src/i18n/pages/home.ts`

## Restored Solar Carport Markers

- `Solar Carport`
- `เปลี่ยนที่จอดรถ`
- `เป็นโรงไฟฟ้าพลังงานแสงอาทิตย์`
- `ออกแบบเฉพาะทาง รับน้ำหนักลม-ฝน`
- `อายุใช้งาน 25+ ปี`
- `นัดสำรวจหน้างานฟรี`
- `ดูโซลูชันทั้งหมด`
- `99.5% System Uptime`

## LINE CTA Added

- Button copy: `เพิ่มเพื่อน LINE`
- Support copy: `ส่งบิลค่าไฟ รูปพื้นที่ หรือคำถามโครงการผ่าน LINE Official: @304zrttj`
- Link behavior: uses the existing `/line` route only.
- No LINE webhook activation, no customer message send, and no external live send was performed.

## Changed Files

- `apps/sirinx-site/public/_redirects`
- `apps/sirinx-site/src/index.html`
- `apps/sirinx-site/src/styles.css`
- `apps/sirinx-site/scripts/server.test.mjs`
- `apps/sirinx-site/tests/line-integration.spec.ts`
- `reports/review/p087b/auto_visual_bot_receipt.json`
- `reports/review/p087b/auto_visual_bot_result.json`
- `reports/review/p087b/lighthouse.json`
- `reports/review/p087b/network_events.json`
- `reports/review/p087b/screenshots/home-desktop-1440.png`
- `reports/review/p087b/screenshots/home-mobile-375.png`
- `reports/review/p087b/screenshots/home-mobile-414.png`
- `reports/review/p087b/screenshots/home-tablet-768.png`
- `reports/mission/A2A2A_P091S_RESTORE_MAIN_PAGE_LINE_CTA_20260707.md`
- `reports/review/p091s/main_restore_line_cta_receipt.json`

## Validation

Passed:

- `pnpm --filter @sirinx/site test:server` — 4 tests passed.
- `pnpm --filter @sirinx/site test:line` — 110 tests passed.
- `pnpm --filter @sirinx/site build` — passed.
- `node scripts/secret-scan.mjs` — passed, `findings: []`.
- Scoped `git diff --check` for the P091S files — passed.
- P087B auto visual bot functional checks:
  - accessibility bot: passed
  - broken link crawler: passed, 0 broken links
  - console error scan: passed
  - mobile overlap bot: passed
  - Lighthouse real CLI: performance 98, accessibility 100, SEO 100, best practices 96
  - SEO/meta bot: passed
  - form dry-run bot: passed, no submit
  - cross-browser bot: passed
  - local preview ports `18741` and `18742`: closed after run

Blocked / needs review:

- P087B auto visual bot verdict is `auto_review_blocked_findings_attached`.
- Reason: visual regression failed for `/` on 4 viewports because this packet intentionally restores the full original Solar Carport page, which no longer matches the old homepage baseline.
- This requires OpenCode/human visual review and a baseline decision before any deploy discussion.
- Full repo `git diff --check` remains blocked by unrelated pre-existing whitespace in `README.md:3`.

## Guardrail Confirmation

No deploy, git push, Cloudflare/R2/D1/KV/DNS mutation, webhook activation,
CRM/customer storage write, live Telegram/LINE/email/customer send, provider/model
call, secret read/print, broad dirty-tree cleanup, or visual-baseline update was performed.

## Next Safe Action

Run OpenCode/human visual review of the restored Solar Carport screenshots and decide
whether to accept/refresh the visual baseline. Preview or production deploy remains a
separate exact gate.
