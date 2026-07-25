# Ads Andromeda / ADS Queen Prompt Pack

Use `templates.json` as the canonical local prompt source for ADS Queen campaign assets.

## Asset Types

- `poster`: 3 static poster prompt templates
- `cover`: 3 wide cover/rich-menu prompt templates
- `video_storyboard`: 3 short video storyboard prompt templates

## Required Controls

- Preserve the exact Thai text lock from `packages/asset-registry/ads-andromeda/text-locks.json`.
- Do not create fake chat screens, fake testimonials, fake customer data, or platform-confusing UI.
- Do not publish, send, generate paid media, or spend ad budget from these prompts without a separate approval gate.

## Validate

Run:

```bash
node packages/asset-registry/ads-andromeda/scan-prohibited-phrases.mjs
```

The validator renders sample prompts, checks category counts, verifies Thai text locks, and blocks prohibited phrases or typo variants.
