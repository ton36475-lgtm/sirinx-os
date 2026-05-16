# SIRINX Public Solar Website Restore Report

Status: Restored to public Solar Carport website
Date: 2026-05-16

## Restore Decision

Use this split:

```text
PUBLIC WEBSITE = ton36475-lgtm/sirinx
PRIVATE OPS / DEV = sirinx-os governance and controlled AI operations
AGENT WARROOM = sirinx-solar-energy/sirinx-app or dev/internal only
```

The public homepage must not use the cream controlled-AI-operations page and must not use the 47 Ronin / AI-WarRoom homepage.

## Source Repository

Restore source:

```text
https://github.com/ton36475-lgtm/sirinx
```

Local restore checkout:

```text
/Users/sirinx/restore-sources/ton36475-lgtm-sirinx
```

Source baseline:

```text
48a93d3 feat: ship sirinx governed multi-agent handoff and safety layer
```

Local restore commit:

```text
9a8ba5e fix: prepare public solar site for sirinx.co
8253877 fix: harden solar calculator and public analytics
```

## Production Deployment

Cloudflare Pages project:

```text
sirinx-co
```

Deployment:

```text
8a643ab0-f64b-4cea-9b86-5888c601eeb7
https://8a643ab0.sirinx-co.pages.dev
3952deb7
https://3952deb7.sirinx-co.pages.dev
```

Public domain:

```text
https://www.sirinx.co -> HTTP 200
https://sirinx.co     -> HTTP 301 -> https://www.sirinx.co/
```

## Public Routes Verified

```text
/              -> Solar Carport homepage
/solar-carport -> Solar Carport detail page
/assessment    -> Solar assessment page
/projects      -> project / track-record page
/contact       -> contact page
/admin         -> no admin dashboard exposed
```

## Acceptance Verified

The live `www.sirinx.co` homepage shows:

- SIRINX logo
- SOLAR DIGITAL AGENTIC positioning
- Solar Carport hero
- Thai headline: `เปลี่ยนที่จอดรถ`
- Thai continuation: `เป็นโรงไฟฟ้าพลังงานแสงอาทิตย์`
- CTA: `ขอใบเสนอราคา Solar Carport`
- Secondary CTA: `ดูผลงานจริง`
- Assessment content
- Project / track-record content
- Solar + BESS / AI EMS / EV Charging content
- Floating chat assistant
- Dark premium cyan / teal / gold UI

The live site does not show:

- `SIRINX - Controlled AI Operations`
- `AI operating systems for serious work`
- `Company website`
- Cloudflare readiness / preflight / DNS-pending status copy
- 47 Ronin / AI-WarRoom homepage

## Restore Changes

Changed in the restore checkout:

```text
client/index.html
client/src/App.tsx
client/src/components/FloatingChatWidget.tsx
client/public/_headers
client/public/_redirects
client/public/__manus__/debug-collector.js
```

Purpose:

- Set canonical URL to `https://www.sirinx.co/`.
- Hide admin dashboard routes from the public surface.
- Add Cloudflare Pages SPA fallback for direct URLs.
- Add baseline security headers for the static deployment.
- Remove public Manus debug collector asset from production output.
- Add client-side fallback response for the floating chat widget when no backend API is present.

## Validation

Commands run:

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm build
pnpm dlx wrangler pages deploy dist/public --project-name sirinx-co --branch main
```

Build result:

```text
pnpm check -> passed
pnpm build -> passed
Cloudflare Pages deploy -> passed
```

Live checks:

```text
https://www.sirinx.co              -> HTTP 200
https://www.sirinx.co/assessment   -> HTTP 200
https://www.sirinx.co/projects     -> HTTP 200
https://sirinx.co                  -> HTTP 301
```

Playwright screenshot artifacts:

```text
/tmp/sirinx-live-restore-home-desktop.png
/tmp/sirinx-live-restore-home-mobile.png
/tmp/sirinx-live-restore-assessment-desktop.png
/tmp/sirinx-live-restore-chat-mobile.png
```

No `.env` values were read. No secrets were printed.

## Solar Calculator Debug Pass

Date: 2026-05-16

Scope:

```text
/assessment Solar + BESS Engineering Calculator
/pricing ROI Calculator
/contact CTA handoff from assessment result
public analytics fail-soft behavior on static Cloudflare Pages
```

Fixes applied in the restore checkout:

- Exported the Solar calculator engine for direct regression tests.
- Added guardrails for zero or near-zero roof capacity so the result never renders `NaN` or `Infinity`.
- Added explicit warning for sites with too little installable Solar PV area.
- Fixed the roof-capacity warning text that previously displayed a raw translation expression.
- Fixed monthly production chart labels to render translated month names instead of translation keys.
- Prevented static public pages from emitting analytics tRPC transport errors when no backend API is attached.

Regression coverage added:

```text
client/src/test/SolarAssessmentCalculator.test.ts
```

Verified scenarios:

- Factory bill-based sizing with normal roof area.
- Hotel / high night-usage sizing with BESS enabled.
- Tiny roof area edge case with finite output and roof-limited warning.
- IRR helper returns finite output for a profitable cash flow.
- Desktop assessment flow reaches result and quote CTA.
- Desktop tiny-roof assessment flow shows the installable-area warning.
- Desktop pricing ROI slider changes recommendation from Start to Enterprise.
- Mobile assessment flow reaches BESS result.

Validation commands:

```bash
pnpm test
pnpm check
pnpm build
pnpm dlx wrangler pages deploy dist/public --project-name sirinx-co --branch main
```

Validation result:

```text
pnpm test  -> 15 files passed, 152 tests passed
pnpm check -> passed
pnpm build -> passed
Cloudflare Pages deploy -> passed
```

Live checks:

```text
https://www.sirinx.co/         -> HTTP 200
https://www.sirinx.co/assessment -> HTTP 200
https://www.sirinx.co/pricing    -> HTTP 200
```

Playwright screenshot artifacts:

```text
/tmp/sirinx-solar-calculator-tests/assessment-desktop-result.png
/tmp/sirinx-solar-calculator-tests/assessment-tiny-roof.png
/tmp/sirinx-solar-calculator-tests/pricing-roi-desktop.png
/tmp/sirinx-solar-calculator-tests/assessment-mobile-bess.png
/tmp/sirinx-solar-calculator-live-tests/assessment-live.png
/tmp/sirinx-solar-calculator-live-tests/pricing-live.png
```

No `.env` values were read. No secrets were printed.
