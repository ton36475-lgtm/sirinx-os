# ADS Andromeda / ADS Queen Asset Factory

Status: local prompt factory only. No publishing, customer send, paid image/video generation, ad spend, or live campaign action is authorized by this document.

## Purpose

Create reusable Thai-first campaign prompts for ADS Queen while protecting exact spelling, brand text locks, and compliance boundaries.

## Files

- `prompts/ads-andromeda/templates.json`
- `prompts/ads-andromeda/README.md`
- `packages/asset-registry/ads-andromeda/text-locks.json`
- `packages/asset-registry/ads-andromeda/scan-prohibited-phrases.mjs`

## Workflow

1. Select one template by `id`.
2. Render with local campaign context only.
3. Run the prohibited phrase scanner.
4. Review Thai spelling manually.
5. Generate assets only after a separate model/media generation gate.
6. Publish or send only after a separate public-output approval gate.

## Guardrails

- Exact Thai text lock must be preserved.
- Fake chat UI, fake testimonials, fake review cards, and customer screenshots are blocked.
- Claims must stay service-oriented and must not imply guaranteed wealth, zero risk, or impossible outcomes.
- Templates are for assets only; they do not authorize ads account changes, LINE broadcasts, CRM writes, or spend.
