# SIRINX Hermes Agent Messaging Audit v1

Status: local-only audit and approval packet ready
Date: 2026-05-27

## Purpose

Hermes Agent Messaging Audit v1 checks non-secret readiness evidence for Telegram, LINE, WhatsApp, and Discord before any manual Hermes gateway restart is considered.

The lane produces local status and dry-run approval packets only. It does not restart Hermes, send messages, activate connectors, start MCP, read secrets, or print tokens.

## Local API

```text
GET  /api/hermes-agent-audit
POST /api/hermes-agent-audit/approval/dry-run
```

The CenterBrain Shell proxies these routes as local JSON surfaces.

## Approval Boundary

Manual restart command text is displayed only when gateway evidence is complete:

```bash
hermes gateway status
hermes gateway restart
```

The UI/API never executes those commands.

## Guardrails

- No Telegram, LINE, WhatsApp, or Discord send smoke.
- No `.env`, token, channel secret, cookie, session, or credential value read/print.
- No provider switch, connector activation, real MCP, deploy, push, publish, or paid API call.
- Unsafe evidence containing secret-like content blocks the audit.

## Verification

```bash
pnpm hermes-agent-audit:test
pnpm centerbrain-shell:test
pnpm centerbrain-shell:check
pnpm audit:secrets
```

## Stop Point

```text
HERMES MESSAGING AUDIT READY - MANUAL GATEWAY RESTART APPROVAL REQUIRED
```
