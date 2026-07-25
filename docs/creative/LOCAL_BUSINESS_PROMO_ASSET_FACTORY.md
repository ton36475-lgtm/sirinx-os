# Local Business Promo Asset Factory

## Purpose

Create reusable public marketing prompts for local business visuals while preserving Thai spelling accuracy and preventing hidden system details from leaking into assets.

## Covered Projects

| Project | Text Lock | Outputs |
|---|---|---|
| hiazoom_salapao | เฮียซูมซาลาเปา | poster, social post |
| lungbank_charcoal_red_pork | ข้าวหมูแดงลุงแบงค์ เตาถ่าน | poster, social post |
| tam_mia_sang | ตามเมียสั่ง | poster, social post |
| tree_sale_yangna | tree_sale_yangna | poster, social post |

## Files

- `prompts/local-business/templates.json`
- `packages/asset-registry/local-business/text-locks.json`
- `packages/asset-registry/local-business/public-marketing-checklist.md`
- `packages/asset-registry/local-business/validate-local-business-pack.mjs`

## Rules

- Use exact locked text in every generated asset.
- Public marketing only.
- No fake chat UI.
- No hidden backend info.
- No cyberpunk, cartoon, or anime style unless a later scoped packet explicitly asks for it.
- No paid generation, posting, or customer send without owner approval.

## Validation

Run:

```bash
node packages/asset-registry/local-business/validate-local-business-pack.mjs
./node_modules/.bin/vitest run packages/asset-registry/local-business/validate-local-business-pack.test.mjs
```
