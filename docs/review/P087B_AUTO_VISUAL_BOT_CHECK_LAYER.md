# P087B Auto Visual Bot Check Layer

Status: local-safe implementation
Parent: `P087_COMPUTER_USE_AUTO_REVIEW_GATE`
Mode: `READ_ONLY_BOT_SIMULATION`

## Purpose

P087B replaces the remaining low-risk visual and bot behavior review wait with local browser automation. It inspects the built SIRINX website through Playwright, writes evidence, and feeds a machine-readable verdict into release readiness.

It does not approve deploy, push, Cloudflare mutation, LINE webhook activation, CRM/customer data storage, live messaging, provider calls, or secret access.

## Command

```bash
pnpm --filter @sirinx/site auto-review:visual-bot
```

Output:

```text
reports/review/p087b/auto_visual_bot_result.json
reports/review/p087b/auto_visual_bot_receipt.json
```

## Checks

- Visual regression with PNG pixel diff. If a baseline is missing, the current screenshot is stored, but the run returns `baseline_initialized_needs_second_run`; it must not pass in the same run.
- Accessibility bot using `axe-core`. If `axe-core` is unavailable, the accessibility check fails; heuristic fallback must not be reported as a pass.
- Internal broken-link crawler; LINE deep links are pattern-checked only and not opened.
- Console/page error scan.
- Mobile interactive overlap sweep.
- Lighthouse automated check using the local Lighthouse CLI. If Lighthouse is unavailable or cannot run, the check fails; surrogate scores are not allowed.
- SEO metadata and JSON-LD validation.
- Form dry-run safety; no submit and no customer data write.
- Cross-browser smoke for Chromium, WebKit, and Firefox. Missing browser engines fail with an explicit `engine not installed` error; dependency skips are not accepted as evidence.

## Verdicts

- `auto_review_pass_bot_verified`: all required bot checks passed and blocked actions remain closed.
- `auto_review_blocked_findings_attached`: a required check failed or a high/critical finding exists.
- `baseline_initialized_needs_second_run`: one or more visual baselines were missing and were initialized; run P087B again after reviewing the created baseline files.

Deploy remains a separate human approval decision.
