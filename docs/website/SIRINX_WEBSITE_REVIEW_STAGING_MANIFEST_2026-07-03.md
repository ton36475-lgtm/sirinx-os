# SIRINX Website Review Staging Manifest

Status: local review manifest only
Date: 2026-07-03T01:45:01+0700
Scope: `apps/sirinx-site`, website docs/specs/runbooks, website A2A packets
Mode: no staging, no commit, no push, no deploy

## Purpose

This manifest prepares the next human review step after the GitHub baseline check. It separates the local website upgrade files that should be reviewed together from backup/generated/unrelated files that should not be pushed accidentally.

This file is not a deploy approval, not a push approval, and not a staging command.

## GitHub Baseline Context

- Repository: `ton36475-lgtm/sirinx-os`
- Local branch: `staging/godmode-master-os-v2`
- Upstream branch: `origin/staging/godmode-master-os-v2`
- GitHub default branch: `codex/urgent-backlog-execution`
- The upstream website homepage is still the older `Controlled AI Operations` page.
- The local website is now the SIRINX Solar/LINE conversion upgrade.
- Local branch is ahead of upstream and contains a broad website change set.

## Core Website Files To Review Together

These are the main website implementation files that form the local upgrade:

- `apps/sirinx-site/package.json`
- `apps/sirinx-site/public/sitemap.xml`
- `apps/sirinx-site/scripts/build.mjs`
- `apps/sirinx-site/scripts/check.mjs`
- `apps/sirinx-site/server.mjs`
- `apps/sirinx-site/src/app.js`
- `apps/sirinx-site/src/index.html`
- `apps/sirinx-site/src/styles.css`

## New Website Files To Include In Human Review

- `apps/sirinx-site/DESIGN.md`
- `apps/sirinx-site/playwright.config.mjs`
- `apps/sirinx-site/scripts/closed-gate-checks.mjs`
- `apps/sirinx-site/scripts/closed-gate-checks.test.mjs`
- `apps/sirinx-site/scripts/server.test.mjs`
- `apps/sirinx-site/src/_partials/floating-contact.html`
- `apps/sirinx-site/src/assets/optimized/solar-carport-hero-1280.jpg`
- `apps/sirinx-site/src/components/floating-contact.css`
- `apps/sirinx-site/src/components/floating-contact.js`
- `apps/sirinx-site/src/config/lineOfficial.json`
- `apps/sirinx-site/src/contact/index.html`
- `apps/sirinx-site/src/line/index.html`
- `apps/sirinx-site/src/projects/index.html`
- `apps/sirinx-site/src/quote/index.html`
- `apps/sirinx-site/src/roi-calculator/index.html`
- `apps/sirinx-site/src/trust-center/index.html`
- `apps/sirinx-site/tests/line-integration.spec.ts`

## Evidence And Governance Files To Review Together

- `docs/website/SIRINX_WEBSITE_QUALITY_AUDIT.md`
- `docs/website/SIRINX_WEBSITE_HUMAN_REVIEW_CHECKLIST_2026-07-03.md`
- `docs/website/SIRINX_WEBSITE_MANUAL_REVIEW_RESULT_TEMPLATE_2026-07-03.md`
- `docs/website/SIRINX_WEBSITE_COMPLETION_AUDIT_2026-07-03.md`
- `docs/website/SIRINX_WEBSITE_LOCAL_EVIDENCE_PACKET_2026-07-03.md`
- `docs/website/SIRINX_WEBSITE_LIVE_INDEX_SOURCE_SYNC_2026-07-03.md`
- `docs/website/SIRINX_WEBSITE_GITHUB_BASELINE_REVIEW_2026-07-03.md`
- `docs/website/SIRINX_WEBSITE_REVIEW_STAGING_MANIFEST_2026-07-03.md`
- `docs/specs/website-quality/`
- `docs/specs/line-oa-flow/`
- `docs/specs/quote-roi-crm-readiness/`
- `docs/runbooks/SIRINX_WEBSITE_QUALITY_RUNBOOK.md`
- `docs/runbooks/LINE_OFFICIAL_WEBSITE_INTEGRATION_RUNBOOK.md`

## Website A2A Packets To Keep With The Review Packet

Website-specific packets:

- `_A2A_QUEUE/outbox/packet_029_sirinx_website_line_hermes_review.json`
- `_A2A_QUEUE/outbox/packet_039_sirinx_website_line_uat_verification_receipt.json`
- `_A2A_QUEUE/outbox/packet_040_sirinx_website_human_review_deploy_gate.json`
- `_A2A_QUEUE/outbox/packet_041_sirinx_website_visual_correction_evidence_receipt.json`
- `_A2A_QUEUE/outbox/packet_042_sirinx_website_seo_aeo_metadata_evidence_receipt.json`
- `_A2A_QUEUE/outbox/packet_043_sirinx_website_accessibility_performance_guardrail_receipt.json`
- `_A2A_QUEUE/outbox/packet_044_sirinx_website_human_review_checklist_receipt.json`
- `_A2A_QUEUE/outbox/packet_045_sirinx_website_manual_review_result_template_receipt.json`
- `_A2A_QUEUE/outbox/packet_046_sirinx_website_professional_copy_seo_aeo_breadcrumb_receipt.json`
- `_A2A_QUEUE/outbox/packet_047_sirinx_line_faqpage_aeo_schema_receipt.json`
- `_A2A_QUEUE/outbox/packet_048_sirinx_website_theme_correction_receipt.json`
- `_A2A_QUEUE/outbox/packet_049_sirinx_website_theme_nav_guardrail_receipt.json`
- `_A2A_QUEUE/outbox/packet_050_sirinx_website_completion_audit_receipt.json`
- `_A2A_QUEUE/outbox/packet_051_sirinx_website_live_index_source_sync_receipt.json`
- `_A2A_QUEUE/outbox/packet_052_sirinx_website_evidence_docs_live_index_refresh.json`
- `_A2A_QUEUE/outbox/packet_053_sirinx_website_github_baseline_review.json`
- `_A2A_QUEUE/outbox/packet_054_sirinx_website_review_staging_manifest.json`

## Exclude Or Review Carefully Before Any Push

Do not push these accidentally without a separate review decision:

- `apps/sirinx-site/src/components/floating-contact.bak.html`
  - Reason: backup file; current build script excludes `.bak.` files from `dist`.
- `apps/sirinx-site/dist/`
  - Reason: generated build output.
- `apps/sirinx-site/test-results/`
  - Reason: generated test output.
- `_A2A_QUEUE/outbox/outbox_*.json`
  - Reason: generic runtime outbox files, not scoped website release evidence.
- Non-website packets such as UAT CRUD MongoDB, coding-engine security rules, active-goal blocker, ChatGPT export, and gateway repair packets.
  - Reason: relevant to broader GhostClaw work, but not part of the SIRINX website review set.

## Required Human Review Before Push Or Deploy

- Review homepage against the live website and approved business direction.
- Review `/line`, `/contact`, `/projects`, `/trust-center`, `/quote`, and `/roi-calculator`.
- Scan the LINE QR on a real phone and confirm it opens `SIRINX โซล่าเซลล์`.
- Confirm Add LINE and Chat links.
- Confirm existing website bot or inquiry behavior manually.
- Confirm mobile contact tray spacing and QR scan usability.
- Decide whether the backup file should be removed or kept out of staged changes.

## Required Technical Checks Before Any Future Push Gate

Run fresh checks immediately before any approved push or deploy discussion:

- `git diff --check`
- `pnpm --filter @sirinx/site build`
- `pnpm --filter @sirinx/site check`
- `pnpm --filter @sirinx/site test:line`
- `pnpm --filter @sirinx/site test:closed-gates`
- `pnpm --filter @sirinx/site test:server`
- scoped secret-like scan over website source, docs, and packets
- JSON parse checks for website A2A packets

## Closed Gates

Still blocked until separate explicit approval:

- Deploy
- Push
- LINE webhook activation
- Production analytics
- CRM/customer data storage
- Customer data collection through website forms
- External message send
- Provider call
- Paid provider call
- Public tunnel
- Package install
- Database write or migration
- Secret or real `.env` read

## Next Safe Action

Human review this manifest with the local website preview and decide the exact review set for a future approved staging/commit/push gate. Do not push or deploy from this manifest alone.
