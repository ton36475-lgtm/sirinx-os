# services/hermes-api

Status: Phase 1 docs-only scaffold
Date: 2026-05-20

## Purpose

`hermes-api` is the proposed command gateway for SIRINXDev Unified Project OS.

It is not implemented yet. This scaffold records the contract boundary before runtime code is written.

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

## Forbidden In Phase 1

- no Telegram/LINE send
- no Cloudflare write
- no database migration
- no Solis API call
- no arbitrary shell execution
- no secret value logging

## Next Design Artifact

Create `docs/knowledge/SIRINX_HERMES_INBOX_CONTRACT_2026-05-20.md` before implementation.
