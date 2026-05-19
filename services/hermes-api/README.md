# services/hermes-api

Status: Phase 1 contract designed
Date: 2026-05-20

## Purpose

`hermes-api` is the proposed command gateway for SIRINXDev Unified Project OS.

It is not implemented yet. The current contract boundary is locked in `docs/knowledge/SIRINX_HERMES_INBOX_CONTRACT_2026-05-20.md` before runtime code is written.

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

Implement pure request normalization and tests only. Do not connect Telegram, LINE, Solis, Cloudflare, GitHub, Supabase, or arbitrary shell execution.
