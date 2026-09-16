# P089D Desktop Panel Focus Patch - 2026-07-07

Status: `LOCAL_PATCH_READY_FOR_SCOPED_COMMIT_PUSH_PREVIEW_REDEPLOY_GATE`

Mode: `LOCAL_PATCH_ONLY_NO_COMMIT_NO_PUSH_NO_DEPLOY`

P089C found that deployed preview desktop panels became hidden/inert after close, but browser focus stayed on the hidden panel close button. This local patch fixes the source behavior and adds a regression test. It does not commit, push, redeploy preview, promote production, mutate DNS, send messages, or read secrets.

## Changed Files

- `/Users/sirinx/sirinx-os/apps/sirinx-site/src/app.js`
- `/Users/sirinx/sirinx-os/apps/sirinx-site/tests/line-integration.spec.ts`

## Implementation

- Added `restoreFocus(controlId)` helper.
- `closeLinePanel()` now restores focus to `#line-trigger` when the LINE panel was actually open and is closed directly.
- `closeInquiryPanel()` now restores focus to `#inquiry-trigger` when the inquiry panel was actually open and is closed directly.
- Panel switching suppresses intermediate focus restoration so opening one panel does not jump focus back to the other trigger.
- Responsive mobile cleanup suppresses focus restoration so hidden desktop controls are not focused during layout changes.

## TDD Evidence

### Red

Command:

```bash
pnpm --filter @sirinx/site build && pnpm exec playwright test apps/sirinx-site/tests/line-integration.spec.ts -g "desktop contact panels return focus" --config=apps/sirinx-site/playwright.config.mjs
```

Result before patch: failed.

Failure: expected `.line-button` to be focused after closing `#line-panel`; received inactive.

### Green

Same command after patch: passed.

Result: `2 passed`.

## Validation

| Check | Result |
|---|---|
| `pnpm --filter @sirinx/site test:server` | PASS, 1 file / 3 tests |
| `pnpm --filter @sirinx/site test:line` | PASS, 110 tests |
| `git diff --check -- apps/sirinx-site/src/app.js apps/sirinx-site/tests/line-integration.spec.ts` | PASS |
| `node scripts/secret-scan.mjs` | PASS, no findings |

Known unrelated blocker:

`pnpm --filter @sirinx/site check` currently fails because `docs/website/SIRINX_WEBSITE_MANUAL_REVIEW_RESULT_TEMPLATE_2026-07-03.md` is missing the required governance snippet `pending human input`. This appears tied to the later deploy approval state and is outside the two-file focus patch. I did not patch that governance checker or template in P089D.

## Actions Not Performed

- No commit
- No push
- No preview redeploy
- No production deploy
- No DNS mutation
- No R2/D1/KV mutation
- No LINE webhook activation
- No CRM/customer storage write
- No live send
- No provider/model call
- No secret read/print

## Next Gate

Open `P089E_SCOPED_COMMIT_PUSH_PREVIEW_REDEPLOY_APPROVAL_PACKET` if you want this patch committed, pushed, deployed to a new Cloudflare Pages preview, and then verified with a fresh P089C run.

Exact approval token:

`APPROVE_P089E_COMMIT_PUSH_PREVIEW_REDEPLOY_SIRINX_SITE_FOCUS_PATCH_2026-07-07`
