# A2A2A P091S Scoped Website Commit Gate Preview

Packet: `P091S_SCOPED_WEBSITE_COMMIT_GATE_PREVIEW`
Status: `READY_FOR_HUMAN_SCOPED_LOCAL_COMMIT_DECISION`
Run at: `2026-07-07T04:37:00+0700`
Mode: `COMMIT_GATE_PREVIEW_ONLY_NO_STAGE_NO_COMMIT_NO_PUSH_NO_DEPLOY`

## Purpose

Prepare the local commit gate for the restored Solar Carport page plus LINE CTA
and the P091S visual/bot acceptance evidence. This file does not approve or run
a commit.

## Proposed Commit Message

`fix(site): restore solar carport homepage with line cta`

## Proposed Scoped Files

Website source and tests:

- `apps/sirinx-site/public/_redirects`
- `apps/sirinx-site/scripts/manual-review-gate.test.mjs`
- `apps/sirinx-site/scripts/release-readiness.mjs`
- `apps/sirinx-site/scripts/release-readiness.test.mjs`
- `apps/sirinx-site/scripts/server.test.mjs`
- `apps/sirinx-site/src/index.html`
- `apps/sirinx-site/src/styles.css`
- `apps/sirinx-site/tests/line-integration.spec.ts`

P087B visual evidence:

- `reports/review/p087b/auto_visual_bot_receipt.json`
- `reports/review/p087b/auto_visual_bot_result.json`
- `reports/review/p087b/lighthouse.json`
- `reports/review/p087b/network_events.json`
- `reports/review/p087b/screenshots/home-desktop-1440.png`
- `reports/review/p087b/screenshots/home-mobile-375.png`
- `reports/review/p087b/screenshots/home-mobile-414.png`
- `reports/review/p087b/screenshots/home-tablet-768.png`

Accepted homepage visual baselines:

- `reports/visual/baseline/home-desktop-1440.png`
- `reports/visual/baseline/home-mobile-375.png`
- `reports/visual/baseline/home-mobile-414.png`
- `reports/visual/baseline/home-tablet-768.png`

P091S reports and receipts:

- `docs/website/SIRINX_WEBSITE_RELEASE_PREFLIGHT_2026-07-03.md`
- `reports/mission/A2A2A_P091S_RESTORE_MAIN_PAGE_LINE_CTA_20260707.md`
- `reports/mission/A2A2A_P091S_VISUAL_BOT_ACCEPTANCE_20260707.md`
- `reports/mission/A2A2A_P091S_SCOPED_WEBSITE_COMMIT_GATE_PREVIEW_20260707.md`
- `reports/mission/A2A2A_P091S_SCOPED_WEBSITE_COMMIT_EXECUTED_20260707.md`
- `reports/review/p091s/main_restore_line_cta_receipt.json`
- `reports/review/p091s/visual_bot_acceptance_receipt.json`
- `reports/review/p091s/scoped_website_commit_receipt.json`

## Explicitly Excluded

- `crates/ghostclaw_migration_core/**`
- `docs/migration/**`
- `reports/review/p101/**`
- `reports/mission/*P101*`
- `apps/sirinx-site/scripts/auto-review/computer-use-review.mjs`
- `apps/sirinx-site/scripts/auto-review/computer-use-review.test.mjs`
- `.env*`
- `secrets/**`
- `target/**`
- Any deploy, Cloudflare, DNS, R2, D1, KV, LINE webhook, CRM, or live-send path

## Validation Already Run

- `pnpm --filter @sirinx/site test:server` passed, 4 tests.
- `pnpm --filter @sirinx/site test:line` passed, 110 tests.
- `pnpm --filter @sirinx/site build` passed.
- `pnpm --filter @sirinx/site test:auto-visual-bot` passed, 10 tests.
- `pnpm --filter @sirinx/site auto-review:visual-bot` passed with `auto_review_pass_bot_verified`.
- `node scripts/secret-scan.mjs` passed, no findings.
- Scoped `git diff --check -- apps/sirinx-site` passed before baseline acceptance.

## Required Before Commit

1. Run final scoped validation again.
2. Stage only the proposed scoped files above.
3. Confirm `git diff --cached --name-only` matches the scoped file list.
4. Commit only after explicit approval:

```text
APPROVE_P091S_SCOPED_WEBSITE_COMMIT_20260707
```

## Still Blocked

- Git push
- Preview deploy
- Production deploy
- Cloudflare/R2/D1/KV/DNS mutation
- LINE webhook activation
- CRM/customer storage write
- Live Telegram/LINE/email/customer send
- Provider/model call
- Secret read/print

## Next Gate

`APPROVE_P091S_SCOPED_WEBSITE_COMMIT_20260707`
