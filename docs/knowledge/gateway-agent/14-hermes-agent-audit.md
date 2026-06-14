# 14 - Hermes Agent Messaging Audit

Status: local-only audit and manual restart approval packet

## Contract

Hermes Agent Messaging Audit summarizes evidence for Telegram, LINE, WhatsApp, and Discord gateway readiness. It reuses the external-gate evidence pattern and keeps action execution outside the API and UI.

## Routes

```text
GET  /api/hermes-agent-audit
POST /api/hermes-agent-audit/approval/dry-run
```

## CenterBrain Shell

The CenterBrain Shell renders:

- gateway readiness matrix
- missing evidence status
- blocked actions
- manual restart command display when evidence is complete

## Blocked Actions

- Hermes gateway restart from API/UI
- Telegram/LINE/WhatsApp/Discord sends
- secret read/print
- provider switch
- real MCP execution
- external connector activation

## Verification

```bash
pnpm hermes-agent-audit:test
pnpm centerbrain-shell:test
pnpm centerbrain-shell:check
```
