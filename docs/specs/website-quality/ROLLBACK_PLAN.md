# Website Quality Rollback Plan

Status: local implementation support
Target: `apps/sirinx-site`

## Rollback Scope

Rollback should remove only the local website quality and LINE/contact integration changes. Do not reset unrelated dirty work in the repository.

## Local Rollback Steps

1. Remove `/line` and `/contact` route sources if they are the rollback target:
   - `apps/sirinx-site/src/line/index.html`
   - `apps/sirinx-site/src/contact/index.html`
2. Remove `/trust-center` and `/projects` route sources if they are the rollback target:
   - `apps/sirinx-site/src/trust-center/index.html`
   - `apps/sirinx-site/src/projects/index.html`
3. Remove `/quote` and `/roi-calculator` route sources if they are the rollback target:
   - `apps/sirinx-site/src/quote/index.html`
   - `apps/sirinx-site/src/roi-calculator/index.html`
4. Remove LINE/contact source config and components if needed:
   - `apps/sirinx-site/src/config/lineOfficial.json`
   - `apps/sirinx-site/src/components/floating-contact.css`
   - `apps/sirinx-site/src/components/floating-contact.js`
5. Revert homepage CTA and floating contact markup in:
   - `apps/sirinx-site/src/index.html`
   - `apps/sirinx-site/src/app.js`
   - `apps/sirinx-site/src/styles.css`
6. Remove route entries from:
   - `apps/sirinx-site/public/sitemap.xml`
7. Revert static and browser tests if the UI is rolled back:
   - `apps/sirinx-site/scripts/check.mjs`
   - `apps/sirinx-site/tests/line-integration.spec.ts`
   - `apps/sirinx-site/playwright.config.mjs`

## Verification After Rollback

Run:

```bash
pnpm --filter @sirinx/site build && pnpm --filter @sirinx/site check
git diff --check
```

If browser tests still exist, run:

```bash
pnpm --filter @sirinx/site test:line
```

## External Rollback

No external rollback is needed for this local work because:
- No deploy occurred.
- No push occurred.
- No LINE webhook was enabled.
- No production analytics was connected.
- No CRM/customer data storage was created.
- No database write or migration occurred.
