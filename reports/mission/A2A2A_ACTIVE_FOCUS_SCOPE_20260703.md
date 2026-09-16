# A2A2A Active Focus Scope - 2026-07-03

## Status

PASS: active focus is narrowed to `sirinx.co` and AGM AutoFlow.

## Active Focus

| Focus | Packages / Paths | Purpose |
|---|---|---|
| `sirinx.co` | `@sirinx/site`, `apps/sirinx-site` | Protected public SIRINX website and review-gated public surface |
| AGM AutoFlow | `@agm/site`, `@sirinx/agm-autoglow-dashboard`, `@sirinx/autoglow-core` | AGM public creative site plus AutoFlow/AutoGlow local delivery workflow |

## Paused / Out Of Focus

| Project | Paths | Reason |
|---|---|---|
| Kusala | `apps/kusala-site`, `.ghostclaw_runtime/a2a2a/project_queues/kusala` | Operator narrowed active focus to `sirinx.co` and AGM AutoFlow only |
| Phitsanulok News | `apps/phitsanulok-news`, `services/news-api`, `packages/types/phitsanulok-news`, `.ghostclaw_runtime/a2a2a/project_queues/phitsanulok_news` | Operator narrowed active focus to `sirinx.co` and AGM AutoFlow only |

## Commit Gate Impact

The active local commit gate excludes Kusala, Phitsanulok News, news API, merch, prompt packs, and non-focus lanes. Those files are not deleted; they are simply outside the current project focus.

## Policy

No deletion, commit, push, deploy, provider call, Telegram live send, Cloudflare/R2 mutation, secret value print, key printing, or `.env` read was performed.
