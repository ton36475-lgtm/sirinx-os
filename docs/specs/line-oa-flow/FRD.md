# LINE Official Account Flow FRD

Status: local implementation support
Target: `apps/sirinx-site`

## Functional Requirements

### LINE-FR-001 Central Config

The site must define LINE Official data in one local config source.

Acceptance:
- `apps/sirinx-site/src/config/lineOfficial.json` contains display name, short link, basic ID, premium ID target, QR image URL, Add Friend URL, Chat URL, default message, and purpose.
- Build output copies the config to `dist/config/lineOfficial.json`.
- Static check validates canonical values.

### LINE-FR-002 QR Panel

The site must render a QR panel where users expect contact.

Acceptance:
- Homepage floating panel includes QR.
- `/line` includes prominent QR.
- `/contact` includes QR.
- QR alt text is `QR Code สำหรับเพิ่มเพื่อน LINE Official ของ SIRINX`.

### LINE-FR-003 Add Friend and Chat

The site must expose Add Friend and Chat actions.

Acceptance:
- Add Friend opens `https://lin.ee/S97R6nj` or canonical Add Friend URL.
- Chat opens `https://line.me/R/oaMessage/%40304zrttj`.
- Links that open external LINE targets use safe rel attributes.

### LINE-FR-004 Floating Contact Cluster

The site must group LINE Official with existing contact behavior.

Acceptance:
- Existing inquiry/contact path is preserved.
- Desktop LINE group appears beside the existing inquiry button.
- Mobile shows a compact contact button and bottom sheet.
- Panel open/close functions are defensive and do not throw if markup is missing.

### LINE-FR-005 Tracking Placeholders

The site must use no-op tracking placeholders only.

Acceptance:
- Events are emitted to an existing safe tracker if present.
- If no tracker exists, events are logged locally only.
- No production analytics endpoint is called.

Required events:
- `line_floating_open`
- `line_qr_view`
- `line_add_friend_click`
- `line_chat_click`
- `line_shortlink_click`
- `quote_cta_click`
- `contact_cluster_open`
- `website_bot_open`
- `website_bot_line_group_open`

### LINE-FR-006 Closed Gates

The site must clearly keep future automation closed.

Acceptance:
- `/contact` states quote form, ROI calculator, CRM, webhook, and production analytics require separate approval.
- No customer data is stored by the static site.
- No webhook or CRM endpoint exists in this implementation.
