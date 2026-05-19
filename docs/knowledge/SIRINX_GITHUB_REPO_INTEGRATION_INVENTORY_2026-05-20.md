# SIRINX GitHub Repository Integration Inventory

Date: 2026-05-20
Mode: read-only audit clone inventory
Owner inspected: `ton36475-lgtm`
Audit root: `/Users/sirinx/restore-sources/github-audit`
External writes: none
Secrets read or printed: none

## Purpose

This note records the current GitHub repository inventory that can feed SIRINX OS, Command Center, Hermes, marketing automation, mobile companion planning, and future internal subdomains.

The decision is deliberate: do not bulk-merge old repositories into `sirinx-os` or the public website. Each repository is treated as a source of bounded extraction tasks. Code moves only after scope, ownership, tests, and secret/file safety are clear.

## Source Of Truth Rules

| Area | Source | Rule |
| --- | --- | --- |
| Public website | `/Users/sirinx/restore-sources/ton36475-lgtm-sirinx` and GitHub `ton36475-lgtm/sirinx` | Protected. Do not overwrite the live homepage or deploy without exact approval. |
| GitHub audit clones | `/Users/sirinx/restore-sources/github-audit/*` | Read-only references for integration planning. |
| Command Center | `/Users/sirinx/sirinx-os` | Integration map lives in local API/dashboard. |
| External SaaS | GitHub, Cloudflare, Telegram, LINE, Solis, Supabase | No write until exact target and gate evidence exist. |

## Repositories

| Repo | Head | Priority | Lane | Status | Integration target |
| --- | --- | --- | --- | --- | --- |
| `sirinx` | `41dced7` | P0 | public-website | source-of-truth-mirror | Public website diff/reference mirror only. |
| `sirinx-solar-energy` | `d3ea5dc` | P1 | solar-ops | candidate-review | Extract admin, customer, contractor, Cloudflare worker, Supabase, SEO, and agent-warroom patterns. |
| `oz-corp-omega-dual-node` | `e8dfa8c` | P1 | agent-runtime | quarantine-reference | Extract agent orchestration, Hermes/OpenClaw, LINE/Telegram, SEO, and solar dashboard concepts by module only. |
| `automated-marketing-agency` | `50d3054` | P2 | marketing-automation | candidate-review | Extract campaign, CRM, webhook, lead, SEO, and Drizzle patterns after schema mapping. |
| `chokma-growth-os` | `b42e11c` | P2 | growth-crm | candidate-review | Extract acquisition and CRM patterns after brand/domain cleanup. |
| `automation-dashboard` | `cedaf00` | P3 | dashboard-patterns | reference-only | UI reference only; avoid duplicating the current Command Center stack. |
| `automation-documentation` | `8af073a` | P3 | documentation | documentation-reference | SOP wording reference only. |
| `automation-system-backend` | `2e3dae7` | P3 | backend-patterns | reference-only | Backend deployment notes and webhook pattern reference only. |
| `automation-mobile-app` | `cd2eecb` | P3 | mobile | blocked-sensitive-file | Mobile QR/app ideas only after signing-file policy review. |
| `ghost-claw-os` | `35d19f2e` | P3 | creative-factory | blocked-sensitive-file | Creative Factory and asset-memory docs only; do not import build/signing artifacts. |
| `oz_mobile_app` | `cb43ce4` | P3 | mobile-agent-ui | reference-only | Mobile agent UI and terminal ideas after Codex Mobile pairing stabilizes. |
| `sirinx-co` | `046ad37` | P4 | legacy-public-site | archive | Archive only; not a public homepage source. |

## Safety Findings

Filename-only sensitive scan found these blockers:

| Repo | Finding | Rule |
| --- | --- | --- |
| `automation-mobile-app` | `android-release.keystore` filename exists | Do not read, copy, or commit signing material. |
| `ghost-claw-os` | `android-release.keystore` filename exists | Do not read, copy, or commit signing material. |
| `sirinx` | `secrets/.gitignore` exists | Treat `secrets/` as protected. |
| `sirinx-solar-energy` | `.env.example` files exist | Examples are allowed to list filenames only; do not inspect real `.env` values. |

No `.env` values, tokens, private keys, or keystore contents were read or printed during this inventory.

## Command Center Integration Added

Local API:

- `GET /api/github-integration`
- Source module: `/Users/sirinx/sirinx-os/services/dev-control-api/src/github-integration.mjs`
- Mode: `read-only-audit-clones`
- `externalWrites=false`
- `productionWrites=false`
- `customerVisible=false`

Dashboard:

- New panel: `GitHub Integration Map`
- Shows repository count, lane count, P0/P1 count, blocked count, read-only mode, repository cards, and next actions.
- Does not expose production secrets, production endpoints, or write controls.

## Validation

Commands passed locally:

```bash
pnpm verify
pnpm dashboard:e2e
pnpm external-gates:check
git diff --check
```

Runtime smoke:

```bash
curl -fsS http://127.0.0.1:8711/api/github-integration
```

Observed shape:

```json
{
  "status": "inventory-ready",
  "mode": "read-only-audit-clones",
  "repos": 12,
  "lanes": 12,
  "externalWrites": false,
  "p0": 1,
  "p1": 2,
  "blocked": 2
}
```

## Integration Decision

Use this sequence:

1. Keep `sirinx` as public website source mirror and review diffs only.
2. Extract `sirinx-solar-energy` workflows into Command Center plans first because it is closest to the solar operation domain.
3. Extract `oz-corp-omega-dual-node` agent and messaging ideas only through small module-specific tasks because it is large and experimental.
4. Compare `automated-marketing-agency` and `chokma-growth-os` lead/CRM schemas against current SIRINX lead entities before importing any code.
5. Keep mobile repos blocked until signing-file and credential policies are reviewed.
6. Keep `sirinx-co` archived; do not restore it as the public website.
