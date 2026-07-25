# LINE Official Account Rollback Plan

Status: local implementation support
Target: `apps/sirinx-site`

## Rollback Scope

Rollback only the local LINE Official website integration. Do not touch external LINE account settings, webhooks, analytics, CRM, or production deployments.

## Local Rollback Steps

1. Remove LINE config if reverting the full integration:
   - `apps/sirinx-site/src/config/lineOfficial.json`
2. Remove LINE route:
   - `apps/sirinx-site/src/line/index.html`
3. Remove contact route if it was introduced only for LINE:
   - `apps/sirinx-site/src/contact/index.html`
4. Remove homepage floating LINE panel while preserving the existing inquiry path:
   - `apps/sirinx-site/src/index.html`
   - `apps/sirinx-site/src/app.js`
   - `apps/sirinx-site/src/styles.css`
5. Remove `/line` and `/contact` from sitemap if routes are removed:
   - `apps/sirinx-site/public/sitemap.xml`
6. Revert tests and static checks that require LINE integration:
   - `apps/sirinx-site/scripts/check.mjs`
   - `apps/sirinx-site/tests/line-integration.spec.ts`

## Verification After Rollback

Run:

```bash
pnpm --filter @sirinx/site build && pnpm --filter @sirinx/site check
git diff --check
```

If browser UAT remains in scope, run:

```bash
pnpm --filter @sirinx/site test:line
```

## External Rollback

No external rollback is needed because this work does not enable:
- LINE webhook.
- LINE message automation.
- LINE rich menu.
- Production analytics.
- CRM/customer data storage.
- Deployment or push.
