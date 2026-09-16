# LINE Official Account Test Cases

Status: local implementation support
Target: `apps/sirinx-site`

## Config Validation

Command:

```bash
pnpm --filter @sirinx/site build && pnpm --filter @sirinx/site check
```

Expected:
- `dist/config/lineOfficial.json` exists.
- Canonical display name, basic ID, short link, Add Friend URL, Chat URL, QR URL, premium ID target, default message, and purpose are present.

## Browser UAT

Command:

```bash
pnpm --filter @sirinx/site test:line
```

Expected:
- Desktop and mobile tests pass.
- Homepage LINE CTA routes to `/line`.
- `/line` QR image is visible with explicit width/height and high fetch priority.
- `/line` QR fallback copy appears if the QR image enters an error state.
- `/line` Add Friend and Chat links are visible.
- `/contact` LINE CTA, Chat CTA, QR, and email CTA are visible.
- `/contact` QR image is visible with explicit width/height and high fetch priority.
- Desktop floating LINE panel opens and closes, and the trigger updates `aria-expanded`.
- Mobile bottom sheet opens and closes with transform-based motion, and the trigger updates `aria-expanded`.
- LINE shortlink, Add Friend, Chat, quote CTA, and contact-panel actions carry no-op tracking placeholders only.

## Safety Checks

Command:

```bash
rg -n --hidden -S "(mongodb(\\+srv)?://|sk-[A-Za-z0-9]|ghp_[A-Za-z0-9]|xox[baprs]-|-----BEGIN (RSA|OPENSSH|EC|DSA|PRIVATE) KEY-----)" apps/sirinx-site docs/specs/line-oa-flow docs/runbooks
```

Expected:
- No matches.

## Manual UAT

Checklist:
- Scan QR from desktop with phone.
- Tap Add Friend on mobile.
- Tap Chat on mobile.
- Confirm existing inquiry panel still opens.
- Confirm desktop and mobile contact controls announce expanded/collapsed state.
- Confirm no backend form submit is present.
- Confirm no tracking placeholder calls a production analytics endpoint.
- Confirm `/line`, `/contact`, and homepage load without console errors.
- Confirm QR fallback copy is understandable if the LINE QR CDN is unavailable.
