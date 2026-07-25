# Model Router Review Runbook

Applies to: `decolua/9router`

## Purpose

Assess model-router gateway capability without connecting providers, reading
keys, or making paid calls.

## Allowed Steps

1. Read public repo docs or local copied docs.
2. Extract provider, model, routing, fallback, and logging claims.
3. Draft provider allowlist and model allowlist.
4. Draft cost ceiling and no-secret-logging controls.
5. Record assessment receipt.

## Blocked Steps

- install
- provider API call
- reading or printing keys
- public endpoint exposure
- multi-account routing
- customer data routing

## Exit Criteria

Status may be `PASS` only when the assessment is documentation-only and all
runtime actions remain behind an explicit gate.
