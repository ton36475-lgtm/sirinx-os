# LINE Official Website Integration Runbook

Status: local-only runbook
Target: `apps/sirinx-site`

## Purpose

Provide repeatable local steps to validate the SIRINX LINE Official website integration without enabling webhook, automation, analytics, CRM, or production writes.

## Canonical LINE Data

- Display name: `SIRINX โซล่าเซลล์`
- Basic ID: `@304zrttj`
- Premium ID target: `@sirinx`
- Short link: `https://lin.ee/S97R6nj`
- Add Friend URL: `https://line.me/R/ti/p/%40304zrttj`
- Chat URL: `https://line.me/R/oaMessage/%40304zrttj`
- QR image URL: `https://qr-official.line.me/gs/M_304zrttj_GW.png?oat_content=qr`

## Local Verification

1. Verify config exists:

```bash
sed -n '1,200p' apps/sirinx-site/src/config/lineOfficial.json
```

2. Build and validate:

```bash
pnpm --filter @sirinx/site build && pnpm --filter @sirinx/site check
```

3. Run LINE browser UAT:

```bash
pnpm --filter @sirinx/site test:line
```

4. Confirm no LINE token or channel secret patterns:

```bash
rg -n --hidden -S "(sk-[A-Za-z0-9]|ghp_[A-Za-z0-9]|xox[baprs]-|-----BEGIN (RSA|OPENSSH|EC|DSA|PRIVATE) KEY-----)" apps/sirinx-site docs/specs/line-oa-flow docs/runbooks
```

Expected result is no matches.

## Manual QR Review

- Open local site preview.
- Open homepage, `/line`, `/contact`, `/trust-center`, `/projects`, `/quote`, and `/roi-calculator`.
- Confirm `/line` and `/contact` preload the QR image and keep a stable square QR area before scan.
- Confirm each route includes the floating LINE Official group beside the existing website inquiry path.
- Confirm QR fallback copy is present in the markup for LINE CDN image failure.
- Scan QR with a phone.
- Confirm Add Friend opens the SIRINX LINE Official account.
- Confirm Chat opens the LINE chat target.
- Confirm LINE ID is shown as `@304zrttj`.
- Confirm floating contact buttons expose expanded/collapsed state to assistive technology.
- Confirm mobile contact sheet moves with transform-based animation and does not cover required CTAs after close.

## Event Placeholder Review

The current site may emit no-op/local tracking events only:

- `line_floating_open`
- `line_qr_view`
- `line_add_friend_click`
- `line_chat_click`
- `line_shortlink_click`
- `quote_cta_click`
- `contact_cluster_open`
- `website_bot_open`
- `website_bot_line_group_open`

These events must not call a production analytics endpoint unless that integration is explicitly approved.

## Future Approval Gates

Required separate approvals:

- Deploy website changes.
- Enable LINE webhook.
- Enable LINE message automation.
- Configure LINE rich menu.
- Connect production analytics.
- Store leads in CRM or database.
- Use real customer data.
- Send external messages.

## Rollback

Use:

```text
docs/specs/line-oa-flow/ROLLBACK_PLAN.md
```

No external rollback is required for local-only changes.
