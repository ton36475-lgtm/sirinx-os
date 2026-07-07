# Quote ROI CRM Readiness Rollback Plan

Status: future-ready local specification
Target: SIRINX website and GhostClaw OS lead architecture

## Rollback Scope

Rollback removes only the future-readiness spec pack and checker references. It must not touch unrelated website, LINE, UAT CRUD MongoDB, or GhostClaw work.

## Local Rollback Steps

1. Remove the spec directory:

```text
docs/specs/quote-roi-crm-readiness/
```

2. Remove quote/ROI/CRM readiness entries from:

```text
apps/sirinx-site/scripts/check.mjs
docs/website/SIRINX_WEBSITE_QUALITY_AUDIT.md
```

3. Re-run:

```bash
pnpm --filter @sirinx/site build && pnpm --filter @sirinx/site check
git diff --check
```

## External Rollback

No external rollback is needed because this spec pack does not:
- Deploy.
- Push.
- Create a quote form endpoint.
- Release an ROI calculator.
- Store customer data.
- Write CRM records.
- Activate LINE webhook.
- Send LINE messages.
- Generate PDF proposals.
- Connect MongoDB or Supabase.
- Run Stagehand UAT or CRUD verifier writes.
