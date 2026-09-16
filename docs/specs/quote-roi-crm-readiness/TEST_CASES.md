# Quote ROI CRM Readiness Test Cases

Status: future-ready local specification
Target: SIRINX website and GhostClaw OS lead architecture

## Static Governance Check

Command:

```bash
pnpm --filter @sirinx/site build && pnpm --filter @sirinx/site check
```

Expected:
- Static site builds.
- Existing homepage, `/line`, and `/contact` checks pass.
- Website quality, LINE OA, and quote/ROI/CRM readiness specs are present.
- Required future-gate snippets are present.

## Browser UAT

Command:

```bash
pnpm --filter @sirinx/site test:line
```

Expected:
- Existing LINE/contact UAT remains covered.
- `/quote` has a no-storage readiness validator with 5 checklist options and browser-only status updates.
- `/quote` has a CRM handoff readiness section marked as closed and containing no input fields or submit behavior.
- `/roi-calculator` has browser-only ROI estimate inputs, result output, disclaimer copy, and a no-storage readiness validator with 4 checklist options.
- ROI calculator smoke checks must verify no form submit, no browser storage, no network call, no CRM path, and no guaranteed-outcome claim.
- `/quote` and `/roi-calculator` readiness interactions leave `localStorage` and `sessionStorage` counts unchanged.
- Current expected result: `42` tests passed across desktop and mobile projects.
- No quote form submit, live ROI calculator, CRM, webhook, database write, customer data storage, or production analytics feature is required until implementation is approved.

## Negative Closed-Gate Checks

Commands:

```bash
pnpm --filter @sirinx/site build && pnpm --filter @sirinx/site check
pnpm --filter @sirinx/site test:closed-gates
```

Expected:
- `/quote` and `/roi-calculator` do not include form submit surfaces.
- Static pages do not link to `/api/` endpoints or third-party script sources.
- Built JavaScript does not include browser storage, browser network calls, analytics beacons, analytics SDKs, Supabase runtime wiring, or MongoDB connection strings.
- The only allowed outbound LINE behavior remains user-clicked static links and QR image rendering.
- Unit tests prove representative forbidden examples fail while static LINE links and QR image URLs remain allowed.

## Secret And Customer Data Scan

Command:

```bash
rg -n --hidden -S "(sk-[A-Za-z0-9]|ghp_[A-Za-z0-9]|xox[baprs]-|AKIA[0-9A-Z]{16}|-----BEGIN (RSA|OPENSSH|EC|DSA|PRIVATE) KEY-----|mongodb(\\+srv)?://[^[:space:]]+)" apps/sirinx-site docs/specs docs/runbooks docs/website
```

Expected:
- No matches.

## Closed-Gate Review

Checklist:
- Quote form production submit remains blocked.
- ROI calculator production release remains blocked.
- CRM/customer data storage remains blocked.
- `/quote` readiness validator remains browser-only and does not store customer data.
- `/roi-calculator` readiness validator remains browser-only and does not calculate or guarantee ROI.
- Database migration/write remains blocked.
- LINE webhook remains blocked.
- LINE automated live-send remains blocked.
- Production analytics remains blocked.
- PDF proposal generation from customer data remains blocked.
- Stagehand UAT and CRUD verifier execution remain blocked unless exact local gates are approved.

## Night Watch

Command:

```bash
pnpm night-watch
```

Expected:
- Read `.hermes/logs/night-watch-latest.md`.
- If status is `WARN`, record degraded services and stop for approval.
