# Website Quality BRD

Status: local implementation support
Target: `apps/sirinx-site`
Public site: `https://www.sirinx.co/`
Mode: local-only, no deploy, no push, no production mutation

## Business Objective

Improve the public SIRINX website so Thai solar customers can quickly understand the company, trust the contact path, and reach the team through LINE Official without breaking the existing website contact behavior.

## Business Outcomes

- Higher trust through clearer company, service, and contact context.
- Lower friction for initial solar assessment requests.
- Obvious LINE Official path with QR scan, Add Friend, and Chat actions.
- Website remains ready for future quote form, ROI calculator, CRM, and automation without enabling those production systems yet.

## Audience

- Homeowners and business owners evaluating Solar Carport, Rooftop Solar, BESS, and EV Charger projects.
- SIRINX internal reviewers validating website changes before deployment.
- Future Codex/Hermes lanes preparing quote, ROI, CRM, and LINE automation.

## Scope

In scope:
- Homepage CTA clarity.
- Dedicated `/line` LINE Official landing page.
- Dedicated `/contact` page with LINE, email, and preparation checklist.
- Dedicated `/trust-center` page with approval, evidence, data, and rollback boundaries.
- Dedicated `/projects` page with project-proof policy and no fabricated case studies.
- Dedicated `/quote` readiness page with no form submit or data storage.
- Dedicated `/roi-calculator` page with browser-only estimate logic, clear assumptions, no guaranteed savings claim, no form submit, no storage, no network call, and no CRM write.
- Footer and floating contact CTA coverage.
- Static SEO/AEO metadata and safe structured contact context.
- Accessibility labels for LINE QR and floating contact controls.
- Local verification commands and rollback path.

Out of scope until explicit approval:
- Deploy, push, production analytics, LINE webhook, CRM/customer data storage, MongoDB writes, customer messaging, paid provider calls, public tunnels, and package installs.

## Success Metrics

- Local homepage, `/line`, and `/contact` routes build and pass static checks.
- Local `/trust-center` and `/projects` routes build and pass static checks.
- Local `/quote` and `/roi-calculator` routes build and pass static checks.
- Desktop and mobile Playwright UAT pass for LINE contact flows.
- QR image renders with Thai alt text.
- Existing inquiry/contact behavior remains available.
- No hardcoded secrets or production mutation paths are introduced.

## Risks

- Floating widgets can cover content on small screens.
- QR image can fail remotely or create layout shift.
- Contact copy can imply backend processing that does not exist yet.
- Future CRM or automation work could accidentally cross approval gates.

## Current Local Evidence

- Audit: `docs/website/SIRINX_WEBSITE_QUALITY_AUDIT.md`
- Static site source: `apps/sirinx-site/src`
- Site check: `pnpm --filter @sirinx/site build && pnpm --filter @sirinx/site check`
- UAT: `pnpm --filter @sirinx/site test:line`
