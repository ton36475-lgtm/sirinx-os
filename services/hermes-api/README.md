# services/hermes-api

Status: Phase 1 dry-run normalizer implemented
Date: 2026-05-20

## Purpose

`hermes-api` is the proposed command gateway for SIRINXDev Unified Project OS.

The current contract boundary is locked in `docs/knowledge/SIRINX_HERMES_INBOX_CONTRACT_2026-05-20.md`. Phase 1 implements only a dry-run normalizer and preview path.

## Proposed Ingress

```http
POST /hermes/inbox
```

Required behavior:

- validate request shape
- authenticate source with signed metadata or approved local session
- classify intent
- apply policy-core decision
- write non-secret audit event
- return dry-run plan unless execution is explicitly approved

Phase 1 implementation should start with a local dry-run preview route before any external connector source is enabled.

Current local preview route:

```http
POST /api/hermes-inbox/dry-run
```

This route is served by `services/dev-control-api` and imports `services/hermes-api/src/inbox.mjs`. It returns `externalWrites=false` for all outcomes.

## Forbidden In Phase 1

- no Telegram/LINE send
- no Cloudflare write
- no database migration
- no Solis API call
- no arbitrary shell execution
- no secret value logging

## Locked Design Artifact

- `docs/knowledge/SIRINX_HERMES_INBOX_CONTRACT_2026-05-20.md`

## Next Implementation Step

Add dashboard presentation for Hermes inbox dry-run results if needed. Do not connect Telegram, LINE, Solis, Cloudflare, GitHub, Supabase, or arbitrary shell execution.
