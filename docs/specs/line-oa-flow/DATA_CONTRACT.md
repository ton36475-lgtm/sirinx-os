# LINE Official Account Data Contract

Status: local implementation support
Target: `apps/sirinx-site`

## Config Source

Path:

```text
apps/sirinx-site/src/config/lineOfficial.json
```

## Required Shape

```json
{
  "displayName": "SIRINX โซล่าเซลล์",
  "shortLink": "https://lin.ee/S97R6nj",
  "basicId": "@304zrttj",
  "premiumIdTarget": "@sirinx",
  "qrImageUrl": "https://qr-official.line.me/gs/M_304zrttj_GW.png?oat_content=qr",
  "addFriendUrl": "https://line.me/R/ti/p/%40304zrttj",
  "chatUrl": "https://line.me/R/oaMessage/%40304zrttj",
  "defaultMessage": "สวัสดีครับ สนใจให้ SIRINX ประเมินระบบ Solar Carport / Rooftop Solar / BESS / EV Charger เบื้องต้นครับ",
  "purpose": "ส่งบิลค่าไฟ รูปพื้นที่ ขอประเมิน Solar Carport / Rooftop Solar / BESS / EV Charger และ AI Energy Management"
}
```

## Consumers

- Homepage floating contact.
- `/line` page.
- `/contact` page.
- Static verification script.
- Future quote/ROI/CRM specs.

## Validation Rules

- URLs must use `https`.
- Basic ID must remain `@304zrttj`.
- QR URL must remain the official LINE QR image URL.
- No tokens, channel secrets, webhook secrets, or access tokens are allowed.
- Default message is display/copy context only; the current static site does not send it automatically.

## Future Fields

Future automation may add:
- `richMenuId`
- `webhookEndpoint`
- `analyticsEventMap`
- `crmLeadSource`

These are blocked until explicit approval for LINE webhook, production analytics, and CRM/customer data storage.
