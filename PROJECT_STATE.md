# PROJECT_STATE

Date: 2026-05-20
Repo: `/Users/sirinx/sirinx-os`
Branch: `codex/urgent-backlog-execution`
Runtime mode: local control plane, dry-run only
Canonical protocol: `AGENTS.md`
Last verified baseline before Phase 0/1 file stack: `fc2ec47 feat: add repo extraction workstreams`

## Current Truth

- `www.sirinx.co` remains the protected public company website.
- Public website source is `/Users/sirinx/restore-sources/ton36475-lgtm-sirinx`.
- Command Center source is this repo: `/Users/sirinx/sirinx-os`.
- GitHub repo integration inventory is local-only through `GET /api/github-integration`.
- Lead qualification is local-only through `GET /api/lead-health` and model `2026-05-20.lead-qualification.v2`.
- Policy decision status is local-only through `GET /api/policy-core` and engine `2026-05-20.policy-core.v1`.
- Hermes inbox dry-run preview is local-only through `POST /api/hermes-inbox/dry-run`.
- Hermes inbox `approval_required` decisions are queued locally in `GET /api/approval-queue`.
- Approval queue evidence snapshots are local-only through `GET /api/approval-evidence` and `POST /api/approval-evidence/write`.
- Command Center displays Hermes inbox policy dry-run results through the `Policy Dry-Run Preview` panel.
- External writes remain blocked by default.
- Root operating files are subordinate to `AGENTS.md`; if they conflict, the stricter safety rule applies.

## Services

| Service | URL/Port | Status | External Writes | Notes |
| --- | --- | --- | --- | --- |
| dev-control-api | `http://127.0.0.1:8711` | local when `pnpm dashboard:run` is active | blocked | API reports `dryRunOnly=true` and `externalWrites=false`. |
| dev-dashboard | `http://127.0.0.1:8710` | local when `pnpm dashboard:run` is active | blocked | Command Center UI for local review. |
| public website | `https://www.sirinx.co` | production site, protected | approval required | Do not change from this repo without exact public-site task. |
| Hermes gateway | local runtime | readable through external gate check | approval required for messages | Pairing/send gates remain manual. |
| Solis telemetry | not active | blocked | blocked | Requires consent, credential storage, and station mapping. |

## Current Gates

| Gate | Status | Evidence | Next Action |
| --- | --- | --- | --- |
| Codex Mobile QR/MFA | blocked manual | `docs/knowledge/external-gates/evidence/codex-mobile-qr-mfa.md` expected | Human operator pairs Mac host with phone. |
| Telegram/LINE | blocked credential/recipient | evidence template under `docs/knowledge/external-gates/evidence/` | Confirm recipient/channel and rotate/store token before smoke send. |
| Solis API | blocked consent/credential | evidence template under `docs/knowledge/external-gates/evidence/` | Confirm consent, read-only credentials, and station mapping. |
| Cloudflare Bot Management | optional official review | current CSP mitigation documented | Review dashboard/API rule only if replacing CSP mitigation. |
| Mobile signing | blocked sensitive-file policy | GitHub integration docs | Do not read or copy keystore files. |

## Current Integration Workstreams

| Workstream | Status | Source |
| --- | --- | --- |
| GitHub repo inventory | done local | `services/dev-control-api/src/github-integration.mjs` |
| Solar ops extraction | docs locked | `SIRINX_SOLAR_OPS_EXTRACTION_PLAN_2026-05-20.md` |
| Agent runtime extraction | docs locked | `SIRINX_AGENT_RUNTIME_EXTRACTION_PLAN_2026-05-20.md` |
| Marketing/CRM schema comparison | docs locked | `SIRINX_MARKETING_CRM_SCHEMA_COMPARISON_2026-05-20.md` |
| Lead qualification v2 | done local | `services/dev-control-api/src/lead-qualification.mjs` |
| policy-core v1 | done local | `packages/policy-core/src/index.mjs`, `GET /api/policy-core` |
| Hermes inbox contract | design locked | `docs/knowledge/SIRINX_HERMES_INBOX_CONTRACT_2026-05-20.md` |
| Hermes inbox dry-run normalizer | done local | `services/hermes-api/src/inbox.mjs`, `POST /api/hermes-inbox/dry-run` |
| Approval evidence snapshots | done local | `services/dev-control-api/src/approval-evidence.mjs`, `pnpm approval-evidence:dry-run` |
| Hermes external adapters | blocked | connector evidence required before any adapter execution |

## Verification Commands

Use these before commit-ready status:

```bash
pnpm verify
pnpm exec vitest run services/dev-control-api/src/lead-qualification.test.mjs
pnpm policy-core:test
pnpm policy-core:api-test
pnpm hermes-inbox:test
pnpm approval-evidence:test
pnpm dashboard:e2e
pnpm external-gates:check
git diff --check
```

## Stop Rules

- Stop before deploy, DNS route, Cloudflare write, database migration, GitHub push, Telegram/LINE send, Solis API use, or production lead creation unless exact approval exists.
- Do not read `.env` values.
- Do not read or copy keystore/signing material.
- Do not write raw chat logs into memory.
- Do not treat this file as permission to bypass `AGENTS.md`.
