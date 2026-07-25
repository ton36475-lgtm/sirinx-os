# P089C Remote Preview UAT - 2026-07-07

Status: `P089C_REMOTE_PREVIEW_UAT_BLOCKED_WITH_FINDINGS`

Mode: `READ_ONLY_REMOTE_PREVIEW_VERIFICATION`

This packet verifies the Cloudflare Pages preview deployed by P089. It does not redeploy, promote to production, mutate DNS, mutate R2/D1/KV, activate LINE webhooks, write CRM/customer storage, send customer messages, call providers, push Git, or read/print secrets.

## Targets

| Target | Result |
|---|---|
| `https://8689060d.sirinx-co.pages.dev` | Reachable |
| `https://staging-godmode-master-os-v2.sirinx-co.pages.dev` | Reachable |

Source commit: `3e5420c82d762ed94e87af59e4b727af7dc95496`

## Passed Checks

| Check | Result |
|---|---|
| Both preview URLs reachable | PASS |
| Routes return HTTP 200 | PASS, 14/14 route loads |
| Routes render `<main>` | PASS, 14/14 |
| Routes render one `<h1>` | PASS, 14/14 |
| Homepage desktop loads | PASS |
| Mobile viewport loads | PASS at 390x844 |
| Initial hidden `#line-panel` state | PASS: `aria-hidden=true`, `inert=true`, focus attempt did not enter panel |
| Initial hidden `#inquiry-panel` state | PASS: `aria-hidden=true`, `inert=true`, focus attempt did not enter panel |
| LINE panel opens | PASS |
| Inquiry panel opens | PASS |
| LINE CTA hrefs present | PASS: `https://lin.ee/S97R6nj`, `https://line.me/R/oaMessage/%40304zrttj` |
| Inquiry CTA hrefs present | PASS: `/contact`, `/line`, `mailto:contact@sirinx.co` |
| Mobile contact sheet opens/closes | PASS |
| POST/PUT/PATCH/DELETE attempts | PASS: none detected |
| Console/page errors | PASS: none detected |
| Live send/customer message | PASS: none performed |
| Cloudflare/R2/D1/KV/DNS mutation | PASS: none performed |
| CRM/customer storage write | PASS: none performed |
| Production deploy state | PASS: still blocked |

Routes checked on both preview targets:

```text
/
/line/
/contact/
/trust-center/
/projects/
/quote/
/roi-calculator/
```

## Blocking Finding

### `HIDDEN_PANEL_RETAINS_FOCUS_AFTER_CLOSE`

Severity: `high`

After closing the desktop contact panels on the deployed preview, focus remains on the hidden panel's close button. The affected panels are:

- `#line-panel`
- `#inquiry-panel`

This reproduces on both preview URLs.

Evidence after close:

```json
{
  "aria_hidden": "true",
  "inert": true,
  "class_open": false,
  "trigger_expanded": "false",
  "active_element_tag": "BUTTON",
  "active_element_class": "close-button",
  "active_element_inside_panel": true
}
```

Interpretation: the panel becomes hidden/inert, but focus is not returned to the opener or another safe visible element. This blocks P089C from passing.

## Blocked Actions Confirmed Not Performed

- Production deploy
- Preview redeploy
- DNS mutation
- R2/D1/KV mutation
- LINE webhook activation
- CRM/customer storage
- Live send
- Provider/model call
- Secret read/print
- Git push

## Output Artifact

- `/Users/sirinx/sirinx-os/reports/review/p089c/remote_preview_uat_receipt.json`

## Next Safe Gate

Patch the desktop panel close behavior so `closeLinePanel()` returns focus to `#line-trigger` and `closeInquiryPanel()` returns focus to `#inquiry-trigger`, then create a new scoped commit/push/preview deploy gate before rerunning P089C.

Do not open P090 production deploy discussion yet.
