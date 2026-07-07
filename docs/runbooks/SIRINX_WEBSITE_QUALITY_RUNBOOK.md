# SIRINX Website Quality Runbook

Status: local-only runbook
Target: `apps/sirinx-site`

## Purpose

Provide repeatable local steps to review, verify, and prepare the SIRINX website quality changes before any deployment approval.

## Safety Boundary

Allowed:
- Read files.
- Edit local source and docs.
- Run existing local checks.
- Run local browser UAT already configured in the repo.
- Append concise Obsidian brain-sync pulse.

Blocked without explicit approval:
- Deploy.
- Push.
- Production analytics.
- LINE webhook.
- CRM/customer data storage.
- MongoDB connection or write.
- Customer messaging.
- Package install.
- Public tunnel.
- Paid provider call.
- Secret read or print.

## Local Review Steps

1. Inspect current state:

```bash
git status --short -- apps/sirinx-site docs/website docs/specs docs/runbooks
```

2. Build and static-check the site:

```bash
pnpm --filter @sirinx/site build && pnpm --filter @sirinx/site check
```

This check must fail if the static site introduces a form submit surface, `/api/`
endpoint link, third-party script source, browser storage, browser network call,
production analytics SDK/beacon, Supabase runtime wiring, or MongoDB connection
string before the matching approval gate is opened.

The same check also verifies that every built public route carries the floating
contact cluster with LINE Official QR/Add Friend/Chat and the existing website
inquiry path.

3. Run browser UAT:

```bash
pnpm --filter @sirinx/site test:line
```

4. Run local preview server regression:

```bash
pnpm --filter @sirinx/site test:server
```

This check confirms source-route local preview injects the floating contact
cluster without duplicating the homepage cluster.

5. Run closed-gate regression tests:

```bash
pnpm --filter @sirinx/site test:closed-gates
```

6. Check diff hygiene:

```bash
git diff --check
```

7. Run scoped secret-pattern scan:

```bash
rg -n --hidden -S "(sk-[A-Za-z0-9]|ghp_[A-Za-z0-9]|xox[baprs]-|AKIA[0-9A-Z]{16}|-----BEGIN (RSA|OPENSSH|EC|DSA|PRIVATE) KEY-----|mongodb(\\+srv)?://[^[:space:]]+)" apps/sirinx-site docs/website docs/specs docs/runbooks
```

Expected result for the scan is no matches.

8. Run Night Watch only as observation:

```bash
pnpm night-watch
```

Read:

```text
.hermes/logs/night-watch-latest.md
```

If status is `WARN`, record the exact degraded services and stop for approval.

## Manual UAT Checklist

- Homepage loads.
- `/line` loads.
- `/contact` loads.
- `/trust-center` loads.
- `/projects` loads.
- `/quote` loads and does not submit customer data.
- `/roi-calculator` loads and does not perform live ROI calculation.
- `/quote` readiness checklist changes status locally from 0/5 to ready copy and no form exists.
- `/roi-calculator` readiness checklist changes status locally from 0/4 to ready copy and no form exists.
- Quote and ROI checklist interactions do not change `localStorage` or `sessionStorage`.
- Floating LINE panel opens and closes.
- Floating contact cluster appears on homepage, `/line`, `/contact`, `/trust-center`, `/projects`, `/quote`, and `/roi-calculator`.
- Existing inquiry path still opens.
- Mobile bottom sheet opens and closes.
- QR scans from a phone.
- Add Friend opens LINE.
- Chat opens LINE.
- No form submits customer data.

## Evidence Paths

- Audit: `docs/website/SIRINX_WEBSITE_QUALITY_AUDIT.md`
- Website specs: `docs/specs/website-quality`
- LINE specs: `docs/specs/line-oa-flow`
- Future readiness specs: `docs/specs/quote-roi-crm-readiness`
- Test file: `apps/sirinx-site/tests/line-integration.spec.ts`
- Static check: `apps/sirinx-site/scripts/check.mjs`

## Stop Conditions

Stop before deployment if:
- Any local check fails.
- Night Watch reports `WARN`.
- QR does not render or scan.
- Existing inquiry path breaks.
- Any secret-like pattern appears.
- Any production, webhook, analytics, CRM, or database path is introduced without approval.
