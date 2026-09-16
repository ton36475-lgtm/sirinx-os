# API Contract Draft - Master Build Path

Mission: `GC-SF-RE-OS-V1-20260701-001`

## Status

Draft only. No route implementation is approved by this packet.

## Contract Principles

- Every build packet must freeze request and response shapes before page work.
- Routes must call service/domain logic; routes must not duplicate domain logic.
- Client code must use the frozen contract and must not import server-only code.
- Error response shape must be explicit before UI wiring.
- No API key, secret, token, or customer credential belongs in docs, examples,
  receipts, client code, or OpenSpec tasks.

## Future Contract Template

```text
Endpoint:
Method:
Auth boundary:
Request schema:
Response schema:
Error schema:
Idempotency:
Rate limits:
Audit event:
Validation command:
Receipt path:
```

## Current P000A Finding

The first packet does not select or implement an endpoint. The next build packet
must choose a single backend/domain slice and create a concrete API contract
before route or frontend work begins.
