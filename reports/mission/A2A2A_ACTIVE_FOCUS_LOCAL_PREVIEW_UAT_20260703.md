# A2A2A Active Focus Local Preview UAT - 2026-07-03

## Status

PASS: `sirinx.co` and AGM AutoFlow were checked through local-only preview surfaces.

## Local URLs

- SIRINX site preview: `http://127.0.0.1:18732`
- AGM AutoGlow dashboard: `http://127.0.0.1:18733`

## Command Checks

| Command | Status | Duration ms |
|---|---:|---:|
| `pnpm --filter @sirinx/site build` | PASS | 296 |
| `pnpm --filter @agm/site build` | PASS | 274 |
| `/Users/sirinx/.hermes/node/bin/node apps/agm-site/scripts/browser-smoke.mjs --json .ghostclaw_runtime/a2a2a/evidence/A2A2A-P062-AGM-SITE-SMOKE-20260703.json` | PASS | 4487 |

## SIRINX Site Route Checks

| Route | HTTP | Missing snippets |
|---|---:|---|
| `/` | 200 | none |
| `/quote/` | 200 | none |
| `/roi-calculator/` | 200 | none |

## AGM AutoGlow Dashboard Checks

- Home: HTTP 200, missing snippets: none
- API: HTTP 200, brand: `AGM AUTOGLOW`, schema present: yes

## Focus Boundary

- Active: `sirinx.co`, AGM AutoFlow
- Paused/out-of-focus: Kusala, Phitsanulok News

## Closed Gates

- commit
- push
- deploy
- cloudflare_r2_mutation
- provider_call
- telegram_live_send
- customer_data_external_routing
- secret_or_env_read
- key_value_print
- install

## Next Safe Action

Use the local URLs for human review, then open a separate explicit local commit gate if this active-focus slice should be committed.
