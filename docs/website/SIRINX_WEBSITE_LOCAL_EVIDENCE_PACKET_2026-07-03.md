# SIRINX Website Local Evidence Packet

Status: local evidence packet only
Date: 2026-07-03T00:34:00+0700
Scope: `apps/sirinx-site`
Deployment status: not deployed
Production mutation: none

## Purpose

This packet summarizes the current local website upgrade work for human review before any deploy approval. It extends the earlier packet 039 and packet 040 evidence with the latest professional copy, SEO/AEO, breadcrumb schema, LINE FAQPage schema, trust, LINE Official, quote, ROI, CRM readiness updates, the theme-correction pass after human rejection, and the live-index homepage source sync.

## Current Local Review URL

- Local preview: `http://127.0.0.1:8730/`
- Scope: local static preview only
- Public tunnel: not opened
- Production site: not mutated

## Implemented Website Surfaces

### Homepage

- Synced the local homepage hero and primary CTA with the current live index source for `https://www.sirinx.co/`.
- Current local homepage hero copy now uses `เปลี่ยนที่จอดรถ` / `เป็นโรงไฟฟ้าพลังงานแสงอาทิตย์`.
- Current local homepage primary CTA is `ขอใบเสนอราคา Solar Carport` and routes to `/contact?interest=solar-carport`.
- Preserved the LINE Official homepage CTA as a secondary local requirement.
- Reworked supporting copy toward a more professional business solar assessment, solar engineering, and AI energy positioning.
- Added clearer business-facing CTAs for LINE Official, quote preparation, ROI, projects, and trust.
- Improved SEO/AEO metadata and homepage structured content without fake reviews, fake ratings, or unverified certification claims.
- Added safe subpage breadcrumb JSON-LD verification for `/line`, `/contact`, `/projects`, `/trust-center`, `/quote`, and `/roi-calculator`.
- Added route-level social metadata consistency for canonical, Open Graph, Twitter image, robots, and theme color.
- Added accessibility guardrails for Thai language, skip link, main target, labeled navigation, current-page navigation state, and stable image alt/width/height.
- Preserved visual direction around premium, technical, clean energy, and AI energy language.

### Theme Correction After Human Review

- Rechecked the local rendered homepage, `/line`, `/contact`, and `/quote` screens after the human rejection that the previous design direction looked inconsistent.
- Realigned subpage headers with the homepage navigation style: simple SIRINX wordmark, compact navigation, no boxed `SX` header treatment in the rendered subpage header.
- Reduced subpage hero height so key conversion content and QR surfaces appear sooner without changing the homepage hero.
- Retained LINE Official, QR, and existing website inquiry/contact dock behavior.
- Replaced the less polished customer-facing word `brief` with `ข้อมูลโครงการ` / `ข้อมูลเบื้องต้น` in the quote/contact flow.
- Added static and browser guardrails so subpage navigation must keep the same labels and order as the homepage: `ผลงาน`, `Trust`, `Quote`, `ROI`, `ติดต่อ`, `LINE`.
- Added regression checks to prevent legacy mixed labels such as `หน้าแรก`, `ความสามารถ`, `ขอใบเสนอราคา`, `Trust Center`, and `LINE Official` from returning inside subpage navigation.

### LINE Official

- Added canonical LINE Official route at `/line`.
- Added QR image and fallback link.
- Added Add LINE and chat CTAs using the approved SIRINX LINE Official data.
- Added customer-facing guidance for sending electricity bills, site photos, and project questions.
- Improved LINE copy around project information intake, assessment intent, and next-step clarity without creating a webhook or data collection path.
- Added safe FAQPage JSON-LD to `/line` from the five visible FAQ questions and answers on the page.

### Contact

- Added LINE Official placement with QR, ID, and Add LINE CTA.
- Improved copy for customers who want to start with bill and site-photo assessment.
- Preserved email contact path.

### Projects And Trust

- Added local routes for `/projects` and `/trust-center`.
- Improved trust copy around evaluation process, project proof categories, evidence policy, and next-step clarity.
- Avoided fabricated project results, ratings, certifications, or guaranteed performance claims.

### Quote And ROI

- Added `/quote` and `/roi-calculator` local routes for future quote readiness and browser-only ROI estimation.
- `/quote` currently provides customer preparation guidance only.
- `/roi-calculator` now includes a client-side ROI estimate panel using approximate monthly bill, usable installation area, daytime load profile, and electricity rate.
- Copy now frames quote and ROI as project information readiness, assumptions, range estimates, and engineering review rather than guaranteed savings.
- No guaranteed savings claims were added.
- The ROI estimate runs only in the browser. It has no form submit, no API call, no browser storage, no CRM write, and no production analytics.

### CRM Readiness

- Added a static, closed-gate CRM handoff readiness section on `/quote`.
- The section is marked with `data-crm-handoff-readiness` and `data-gate-state="closed"`.
- It contains no form, no input collection, no file upload, no network call, no browser storage, no CRM write, and no database connection.
- It documents the future consent, data minimization, human review, and evidence flow.

## LINE Official Canonical Data

- Display name: SIRINX โซล่าเซลล์
- Short link: `https://lin.ee/S97R6nj`
- Basic ID: `@304zrttj`
- Add Friend URL: `https://line.me/R/ti/p/%40304zrttj`
- Chat URL: `https://line.me/R/oaMessage/%40304zrttj`
- QR image URL: `https://qr-official.line.me/gs/M_304zrttj_GW.png?oat_content=qr`

## Evidence Files

- Website audit: `docs/website/SIRINX_WEBSITE_QUALITY_AUDIT.md`
- LINE UAT receipt packet: `_A2A_QUEUE/outbox/packet_039_sirinx_website_line_uat_verification_receipt.json`
- Human review gate packet: `_A2A_QUEUE/outbox/packet_040_sirinx_website_human_review_deploy_gate.json`
- Latest visual correction receipt packet: `_A2A_QUEUE/outbox/packet_041_sirinx_website_visual_correction_evidence_receipt.json`
- Latest SEO/AEO metadata receipt packet: `_A2A_QUEUE/outbox/packet_042_sirinx_website_seo_aeo_metadata_evidence_receipt.json`
- Latest accessibility/performance guardrail receipt packet: `_A2A_QUEUE/outbox/packet_043_sirinx_website_accessibility_performance_guardrail_receipt.json`
- Human review checklist receipt packet: `_A2A_QUEUE/outbox/packet_044_sirinx_website_human_review_checklist_receipt.json`
- Human review checklist: `docs/website/SIRINX_WEBSITE_HUMAN_REVIEW_CHECKLIST_2026-07-03.md`
- Manual review result template receipt packet: `_A2A_QUEUE/outbox/packet_045_sirinx_website_manual_review_result_template_receipt.json`
- Manual review result template: `docs/website/SIRINX_WEBSITE_MANUAL_REVIEW_RESULT_TEMPLATE_2026-07-03.md`
- Professional copy, SEO/AEO, and breadcrumb receipt packet: `_A2A_QUEUE/outbox/packet_046_sirinx_website_professional_copy_seo_aeo_breadcrumb_receipt.json`
- LINE FAQPage AEO schema receipt packet: `_A2A_QUEUE/outbox/packet_047_sirinx_line_faqpage_aeo_schema_receipt.json`
- Theme correction receipt packet: `_A2A_QUEUE/outbox/packet_048_sirinx_website_theme_correction_receipt.json`
- Theme navigation guardrail receipt packet: `_A2A_QUEUE/outbox/packet_049_sirinx_website_theme_nav_guardrail_receipt.json`
- Completion audit receipt packet: `_A2A_QUEUE/outbox/packet_050_sirinx_website_completion_audit_receipt.json`
- Completion audit: `docs/website/SIRINX_WEBSITE_COMPLETION_AUDIT_2026-07-03.md`
- Live-index source sync receipt packet: `_A2A_QUEUE/outbox/packet_051_sirinx_website_live_index_source_sync_receipt.json`
- Live-index source sync report: `docs/website/SIRINX_WEBSITE_LIVE_INDEX_SOURCE_SYNC_2026-07-03.md`
- Evidence docs live-index refresh receipt packet: `_A2A_QUEUE/outbox/packet_052_sirinx_website_evidence_docs_live_index_refresh.json`
- GitHub baseline review receipt packet: `_A2A_QUEUE/outbox/packet_053_sirinx_website_github_baseline_review.json`
- GitHub baseline review report: `docs/website/SIRINX_WEBSITE_GITHUB_BASELINE_REVIEW_2026-07-03.md`
- Review staging manifest receipt packet: `_A2A_QUEUE/outbox/packet_054_sirinx_website_review_staging_manifest.json`
- Review staging manifest: `docs/website/SIRINX_WEBSITE_REVIEW_STAGING_MANIFEST_2026-07-03.md`
- Website check guardrail receipt packet: `_A2A_QUEUE/outbox/packet_055_sirinx_website_check_guardrail_receipt.json`
- Review gate regression receipt packet: `_A2A_QUEUE/outbox/packet_056_sirinx_website_review_gate_regression_receipt.json`
- Release readiness dry-run receipt packet: `_A2A_QUEUE/outbox/packet_057_sirinx_website_release_readiness_dry_run_receipt.json`
- Review screenshot evidence packet: `_A2A_QUEUE/outbox/packet_058_sirinx_website_review_screenshot_evidence.json`
- GitHub current recheck receipt packet: `_A2A_QUEUE/outbox/packet_059_sirinx_website_github_current_recheck.json`
- GitHub current recheck report: `docs/website/SIRINX_WEBSITE_GITHUB_CURRENT_RECHECK_2026-07-03.md`
- Master plan current audit packet: `_A2A_QUEUE/outbox/packet_060_sirinx_website_master_plan_current_audit.json`
- Master plan current audit report: `docs/website/SIRINX_WEBSITE_MASTER_PLAN_CURRENT_AUDIT_2026-07-03.md`
- Human review board packet: `_A2A_QUEUE/outbox/packet_061_sirinx_website_human_review_board.json`
- Human review board: `docs/website/SIRINX_WEBSITE_HUMAN_REVIEW_BOARD_2026-07-03.html`
- Human review board report: `docs/website/SIRINX_WEBSITE_HUMAN_REVIEW_BOARD_2026-07-03.md`
- Manual review gate packet: `_A2A_QUEUE/outbox/packet_062_sirinx_website_manual_review_gate.json`
- Manual review gate report: `docs/website/SIRINX_WEBSITE_MANUAL_REVIEW_GATE_2026-07-03.md`
- Local review run packet: `_A2A_QUEUE/outbox/packet_063_sirinx_website_local_review_run.json`
- Local review run report: `docs/website/SIRINX_WEBSITE_LOCAL_REVIEW_RUN_2026-07-03.md`
- GitHub connector recheck packet: `_A2A_QUEUE/outbox/packet_064_sirinx_website_github_connector_recheck.json`
- GitHub connector recheck report: `docs/website/SIRINX_WEBSITE_GITHUB_CONNECTOR_RECHECK_2026-07-03.md`
- GitHub/live/local automated recheck packet: `_A2A_QUEUE/outbox/packet_065_sirinx_website_github_live_local_recheck_automation.json`
- GitHub/live/local automated recheck report: `docs/website/SIRINX_WEBSITE_GITHUB_LIVE_LOCAL_AUTOMATED_RECHECK_2026-07-03.md`
- LINE QR/link recheck packet: `_A2A_QUEUE/outbox/packet_066_sirinx_website_line_qr_link_recheck.json`
- LINE QR/link recheck report: `docs/website/SIRINX_WEBSITE_LINE_QR_LINK_RECHECK_2026-07-03.md`
- Manual review intake packet: `_A2A_QUEUE/outbox/packet_067_sirinx_website_manual_review_intake.json`
- Manual review intake report: `docs/website/SIRINX_WEBSITE_MANUAL_REVIEW_INTAKE_2026-07-03.md`
- Review evidence refresh packet: `_A2A_QUEUE/outbox/packet_068_sirinx_website_review_evidence_refresh.json`
- Review evidence refresh report: `docs/website/SIRINX_WEBSITE_REVIEW_EVIDENCE_REFRESH_2026-07-03.md`
- Manual review evidence contract packet: `_A2A_QUEUE/outbox/packet_069_sirinx_website_manual_review_evidence_contract.json`
- Manual review evidence contract report: `docs/website/SIRINX_WEBSITE_MANUAL_REVIEW_EVIDENCE_CONTRACT_2026-07-03.md`
- Local preview health packet: `_A2A_QUEUE/outbox/packet_070_sirinx_website_local_preview_health.json`
- Local preview health report: `docs/website/SIRINX_WEBSITE_LOCAL_PREVIEW_HEALTH_2026-07-03.md`
- Release preflight packet: `_A2A_QUEUE/outbox/packet_071_sirinx_website_release_preflight.json`
- Release preflight report: `docs/website/SIRINX_WEBSITE_RELEASE_PREFLIGHT_2026-07-03.md`
- Manual review receipt packet: `_A2A_QUEUE/outbox/packet_072_sirinx_website_manual_review_receipt.json`
- Manual review receipt report: `docs/website/SIRINX_WEBSITE_MANUAL_REVIEW_RECEIPT_2026-07-03.md`
- Website quality specs: `docs/specs/website-quality/`
- LINE OA specs: `docs/specs/line-oa-flow/`
- Quote ROI CRM readiness specs: `docs/specs/quote-roi-crm-readiness/`
- Website runbook: `docs/runbooks/SIRINX_WEBSITE_QUALITY_RUNBOOK.md`
- LINE runbook: `docs/runbooks/LINE_OFFICIAL_WEBSITE_INTEGRATION_RUNBOOK.md`

## Screenshot Evidence

- Homepage desktop: `/tmp/sirinx-seo-copy-home-desktop.png`
- Homepage mobile: `/tmp/sirinx-seo-copy-home-mobile.png`
- LINE page desktop: `/tmp/sirinx-seo-copy-line-final-desktop.png`
- LINE page mobile: `/tmp/sirinx-seo-copy-line-final-mobile.png`
- Contact page desktop: `/tmp/sirinx-seo-copy-contact-final-desktop.png`
- Contact page mobile: `/tmp/sirinx-seo-copy-contact-final-mobile.png`
- Quote CRM readiness desktop: `/tmp/sirinx-quote-crm-readiness-final-desktop.png`
- Quote CRM readiness mobile: `/tmp/sirinx-quote-crm-readiness-final-mobile.png`
- LINE compact dock desktop: `/tmp/sirinx-line-compact-dock-desktop-v2.png`
- LINE QR unobstructed mobile: `/tmp/sirinx-line-qr-unobstructed-mobile.png`
- Projects mobile compact trigger: `/tmp/sirinx-projects-mobile-trigger-48.png`
- Trust Center mobile compact trigger: `/tmp/sirinx-trust-mobile-trigger-48.png`
- Professional copy v2 homepage desktop: `/tmp/sirinx-copy-v2-home-desktop.png`
- Professional copy v2 homepage mobile: `/tmp/sirinx-copy-v2-home-mobile.png`
- Professional copy v2 LINE desktop: `/tmp/sirinx-copy-v2-line-desktop.png`
- Professional copy v2 quote mobile: `/tmp/sirinx-copy-v2-quote-mobile.png`
- Theme audit before correction, homepage desktop: `/tmp/sirinx-audit-home-desktop.png`
- Theme audit before correction, LINE desktop: `/tmp/sirinx-audit-line-desktop.png`
- Theme correction final LINE desktop: `/tmp/sirinx-fix2-line-desktop.png`
- Theme correction final LINE mobile: `/tmp/sirinx-fix2-line-mobile.png`
- Theme correction final contact desktop: `/tmp/sirinx-fix2-contact-desktop.png`
- Theme correction final quote mobile: `/tmp/sirinx-fix2-quote-mobile.png`
- Live-index synced homepage desktop: `/tmp/sirinx-live-index-applied-home-desktop-final.png`
- Live-index synced homepage mobile: `/tmp/sirinx-live-index-applied-home-mobile-final.png`
- Live-index synced contact mobile: `/tmp/sirinx-live-index-applied-contact-mobile.png`
- Fresh review screenshot manifest: `/tmp/sirinx-site-review-screenshots-1783018931992/manifest.json`
- Fresh review screenshots: `/tmp/sirinx-site-review-screenshots-1783018931992/`
- Fresh review screenshot count: 14 images across desktop and mobile for `/`, `/line`, `/contact`, `/projects`, `/trust-center`, `/quote`, and `/roi-calculator`

## Verified Locally

The following commands were run against the local workspace after the current website and closed-gate readiness changes:

- `git diff --check` on the latest touched website, test, and spec files: passed
- `pnpm --filter @sirinx/site build`: passed
- `pnpm --filter @sirinx/site check`: passed, 18 files checked
- `pnpm --filter @sirinx/site test:line`: passed, 106 Playwright checks
- `pnpm --filter @sirinx/site test:closed-gates`: passed, 3 checks
- `pnpm --filter @sirinx/site test:server`: passed, 2 checks
- `packet_046` JSON parse: passed
- `packet_047` JSON parse: passed
- `packet_048` JSON parse: passed
- `packet_049` JSON parse: passed
- `packet_050` JSON parse: passed
- `packet_051` JSON parse: passed
- `packet_052` JSON parse: passed
- `packet_053` GitHub baseline review JSON parse: passed
- `packet_054` review staging manifest JSON parse: passed
- `packet_055` website check guardrail JSON parse: passed
- `packet_056` review gate regression JSON parse: passed
- `packet_057` release readiness dry-run JSON parse: passed
- `packet_058` review screenshot evidence JSON parse: passed
- `packet_059` GitHub current recheck JSON parse: passed
- `packet_060` master plan current audit JSON parse: passed
- `packet_061` human review board JSON parse: passed
- `packet_062` manual review gate JSON parse: passed
- `packet_063` local review run JSON parse: passed
- `packet_064` GitHub connector recheck JSON parse: passed
- `packet_065` GitHub/live/local automated recheck JSON parse: passed
- `packet_066` LINE QR/link recheck JSON parse: passed
- `packet_067` manual review intake JSON parse: passed
- `packet_068` review evidence refresh JSON parse: passed
- `packet_069` manual review evidence contract JSON parse: passed
- `packet_070` local preview health JSON parse: passed
- `packet_071` release preflight JSON parse: passed
- `packet_072` manual review receipt JSON parse: passed
- `pnpm --filter @sirinx/site check` now enforces website evidence docs, website A2A packet JSON parsing, and backup/partial exclusion from build output.
- `pnpm --filter @sirinx/site test:review-gates`: passed, 3 checks
- `pnpm --filter @sirinx/site release:readiness`: passed; status `READY_FOR_HUMAN_REVIEW`, deploy gate `BLOCKED_FOR_DEPLOY`, push gate `BLOCKED_UNTIL_EXPLICIT_APPROVAL`
- `pnpm --filter @sirinx/site test:release-readiness`: passed, 1 check
- `pnpm --filter @sirinx/site review:screenshots`: passed, 14 screenshots captured to `/tmp/sirinx-site-review-screenshots-1783018931992/`
- `pnpm --filter @sirinx/site test:review-screenshots`: passed, 2 checks
- GitHub current recheck: connector and CLI repository metadata queries passed, open PR queries returned no open PRs, remote staging branch remains `02524464ea97931aea1a34c559ecdec6e431dc37`, and local website work remains unpushed.
- GitHub connector recheck: GitHub branch `staging/godmode-master-os-v2` exists, fetched branch `apps/sirinx-site/src/index.html` is the older `Controlled AI Operations` page, live `https://www.sirinx.co/` is already Solar/LINE-oriented but does not contain the local `/line` homepage link, and local source remains the correct review target.
- GitHub/live/local automated recheck: `pnpm --filter @sirinx/site review:github-live` regenerates packet 065, confirms the local working copy remains the review target, and keeps deploy/push/webhook/analytics/CRM gates blocked.
- LINE QR/link recheck: `pnpm --filter @sirinx/site review:line-qr` regenerates packet 066, verifies the QR PNG asset is 360x360 and public LINE links respond in read-only mode, but still requires a real-device QR scan.
- Manual review intake: `pnpm --filter @sirinx/site review:manual-intake` regenerates packet 067, verifies checklist/template are current with packet 065 and packet 066, and keeps human review pending.
- Manual review evidence contract: `pnpm --filter @sirinx/site review:manual-contract` regenerates packet 069, confirms all 17 required manual checks are present, blocks passed rows without evidence, and keeps deploy/push gates closed.
- Local preview health: `pnpm --filter @sirinx/site review:preview-health` starts the built site on an ephemeral localhost port, verifies all 7 human-review routes return HTTP 200 with expected review content including the browser-only ROI calculator, writes packet 070, then stops the local server.
- Release preflight: `pnpm --filter @sirinx/site release:preflight` writes packet 071, confirms automated evidence is ready, and keeps deploy blocked because manual evidence, real-device QR scan, existing bot behavior confirmation, and exact deploy approval are still missing.
- Manual review receipt: `pnpm --filter @sirinx/site review:manual-receipt` writes packet 072, records 17 pending manual checks, QR scan status, existing bot/contact behavior status, and exact deploy approval state without granting completion.
- Review evidence refresh: `pnpm --filter @sirinx/site review:evidence` regenerates packet 065, packet 066, packet 069, packet 070, packet 067, packet 072, packet 060, packet 061, packet 062, packet 063, and packet 068 in a serial local-only review lane.
- `pnpm --filter @sirinx/site master:plan-audit`: passed; status `LOCAL_EVIDENCE_READY_FOR_HUMAN_REVIEW_NOT_COMPLETE`, local missing requirements `[]`, completion claim allowed `false`
- `pnpm --filter @sirinx/site review:board`: passed; status `READY_FOR_HUMAN_REVIEW`, screenshot count `14`, missing screenshots `[]`, completion claim allowed `false`
- `pnpm --filter @sirinx/site manual:review-gate`: passed; status `BLOCKED_PENDING_HUMAN_REVIEW`, manual checks total `17`, manual checks passed `0`, deploy gate `BLOCKED_FOR_DEPLOY`
- `pnpm --filter @sirinx/site review:local`: passed; status `LOCAL_REVIEW_READY_BLOCKED_PENDING_HUMAN_INPUT`, generated packets `packet_060`, `packet_061`, and `packet_062`
- `pnpm --filter @sirinx/site review:github-live`: passed; status `GITHUB_LIVE_LOCAL_RECHECK_READY_LOCAL_REVIEW_TARGET_CONFIRMED`, review target `local_working_copy`, copy GitHub index to local `false`
- `pnpm --filter @sirinx/site test:github-live-review`: passed, 2 checks
- `pnpm --filter @sirinx/site review:line-qr`: passed; status `LINE_QR_LINK_RECHECK_READY_PENDING_REAL_DEVICE_SCAN`, QR PNG `360x360`, real-device scan still not proven
- `pnpm --filter @sirinx/site test:line-qr-review`: passed, 3 checks
- `pnpm --filter @sirinx/site review:manual-intake`: passed; status `MANUAL_REVIEW_INTAKE_READY_PENDING_HUMAN_INPUT`, docs fresh `true`, manual checks pending `17`
- `pnpm --filter @sirinx/site test:manual-intake`: passed, 2 checks
- `pnpm --filter @sirinx/site review:manual-contract`: passed; status `MANUAL_REVIEW_EVIDENCE_CONTRACT_READY_PENDING_HUMAN_EVIDENCE`, required checks `17`, human evidence complete `false`
- `pnpm --filter @sirinx/site test:manual-contract`: passed, 3 checks
- `pnpm --filter @sirinx/site review:preview-health`: passed; status `LOCAL_PREVIEW_HEALTH_READY_FOR_HUMAN_REVIEW`, routes ready `true`, route count `7`
- `pnpm --filter @sirinx/site test:preview-health`: passed, 2 checks
- `pnpm --filter @sirinx/site review:manual-receipt`: passed; status `MANUAL_REVIEW_RECEIPT_READY_PENDING_HUMAN_INPUT`, manual checks pending `17`, receipt complete `false`
- `pnpm --filter @sirinx/site test:manual-receipt`: passed, 3 checks
- `pnpm --filter @sirinx/site test:roi-claims`: passed, 3 checks
- `pnpm --filter @sirinx/site test:line`: passed, 108 Playwright checks after adding browser-only ROI calculator smoke coverage
- `pnpm --filter @sirinx/site release:preflight`: passed; status `READY_FOR_HUMAN_REVIEW_BLOCKED_FOR_DEPLOY`, blockers include `real_device_qr_scan_missing` and `exact_deploy_approval_missing`
- `pnpm --filter @sirinx/site test:release-readiness`: passed, 1 check
- `pnpm --filter @sirinx/site review:evidence`: passed; status `REVIEW_EVIDENCE_REFRESH_READY_PENDING_HUMAN_INPUT`, manual checks pending `17`
- `pnpm --filter @sirinx/site test:review-evidence`: passed, 2 checks
- Forbidden storage/network scan on quote, ROI, and app script: no matches for form submit, browser storage, network calls, analytics calls, MongoDB URL, or CRM client creation
- Desktop `/line` floating dock was compacted to icon buttons so the closed state does not cover LINE card copy.
- Mobile `/line` hides the floating trigger because the page itself is the QR/contact route; this keeps the primary QR unobstructed for scanning.
- Mobile floating trigger on other pages was reduced to 48px so it remains available without dominating section headings.
- Homepage, `/line`, `/contact`, `/trust-center`, `/projects`, `/quote`, and `/roi-calculator` now have enforced canonical SEO/AEO metadata in static checks and browser UAT.
- `/line`, `/contact`, `/trust-center`, `/projects`, `/quote`, and `/roi-calculator` now have enforced `BreadcrumbList` JSON-LD checks.
- `/line` now has enforced `FAQPage` JSON-LD checks that compare schema questions and answers against visible FAQ copy.
- Static checks now enforce baseline accessibility and image stability across built routes.
- Browser UAT now verifies current navigation state on `/line`, `/contact`, `/projects`, `/trust-center`, `/quote`, and `/roi-calculator`.
- Theme correction local visual evidence shows `/line`, `/contact`, and `/quote` using the homepage-aligned dark hero, simple SIRINX wordmark, compact nav treatment, and preserved floating LINE/inquiry dock.
- Static checks and browser UAT now enforce the live-index homepage hero/CTA plus homepage-aligned subpage navigation labels and order across `/line`, `/contact`, `/projects`, `/trust-center`, `/quote`, and `/roi-calculator`.
- Completion audit records proven local evidence separately from pending manual review items, including real-device QR scan and existing bot/inquiry behavior.

## Manual UAT Still Required

- Human visual review of the local website.
- Real-device scan of the LINE QR code.
- Manual confirmation that the existing website bot/contact behavior is preserved.
- Manual mobile review for the floating contact UI and page spacing.
- Review of packet 039, packet 040, and packet 051 before any deploy approval.

## Closed Gates

These actions remain blocked until separate explicit approval:

- Deploy
- Push
- LINE webhook activation
- Production analytics
- CRM/customer data storage
- Customer data collection through the website
- External message send
- Provider call
- Paid provider call
- Public tunnel
- Package install
- Production mutation
- Database write or migration
- Secret or real `.env` read

## Risk

Current risk: medium until human visual review and real-device QR scan are complete.

Primary residual risks:

- Visual polish still needs human approval because the user rejected an earlier direction.
- QR image is externally hosted by LINE and must be confirmed on a real device.
- Existing website bot behavior must be manually verified in the local browser.
- Production SEO and Open Graph appearance must be checked after a deploy approval, not before.

## Rollback Plan

- Remove `FloatingContactCluster` and floating contact imports if contact UI causes regression.
- Remove `/line`, `/contact`, `/projects`, `/trust-center`, `/quote`, or `/roi-calculator` local routes if a page fails review.
- Remove or revert `apps/sirinx-site/src/config/lineOfficial.json` if LINE account data must change.
- Revert the static CRM readiness section from `/quote` if it is too early for customer-facing copy.
- Revert homepage copy and style updates if the new content direction is rejected.

## Next Safe Action

Human review the local website at `http://127.0.0.1:8730/`, scan the LINE QR on a real device, confirm the existing website bot/contact behavior manually, then approve or reject deploy in a separate exact deploy gate.

This packet is not deploy approval.
