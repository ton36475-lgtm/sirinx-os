# PROJECT_STATE

Date: 2026-06-28
Repo: `/Users/sirinx/sirinx-os`
Branch: `staging/godmode-master-os-v2`
Runtime mode: local control plane, dry-run only
Canonical protocol: `AGENTS.md`
Last verified baseline: `28b8ea1 chore(staging): GhostClaws GodMode Mission Control integration`

## Current Truth

- `www.sirinx.co` remains the protected public company website.
- **Pocket Hatchery is the flagship MVP** under GhostClaws Agent Factory v4.
- Public wallet path: WAX Cloud Wallet / My Cloud Wallet.
- `waxwing` signer remains office-internal only during Sprint 1.
- No gambling, paid random loot box, cash-out, or real-money prize pool mechanics.
- Public website source is `/Users/sirinx/restore-sources/ton36475-lgtm-sirinx`.
- Command Center source is this repo: `/Users/sirinx/sirinx-os`.
- GitHub repo integration inventory is local-only through `GET /api/github-integration`.
- Lead qualification is local-only through `GET /api/lead-health` and model `2026-05-20.lead-qualification.v2`.
- Lead event audit preview is local-only through `GET /api/lead-event-audit` and `POST /api/lead-event-audit/preview`; it stores no raw contact values and performs no CRM/Supabase/production writes.
- Lead CRM handoff comparison is local-only through `GET /api/lead-crm-contract`; database/CRM writes remain disabled.
- Solar ops entity mapping from `sirinx-solar-energy` is local-only through `GET /api/solar-ops-contract`; it does not apply Supabase schema, copy mock PII, or deploy Cloudflare workers.
- `oz-corp-omega-dual-node` safe-command and continuity-memory ideas are mapped as docs-only policy; no runtime command runner or worker is imported.
- Policy decision status is local-only through `GET /api/policy-core` and engine `2026-05-20.policy-core.v1`.
- Hermes inbox dry-run preview is local-only through `POST /api/hermes-inbox/dry-run`.
- Hermes inbox `approval_required` decisions are queued locally in `GET /api/approval-queue`.
- Approval queue evidence snapshots are local-only through `GET /api/approval-evidence` and `POST /api/approval-evidence/write`.
- Pending work ledger is local-only through `GET /api/pending-work` and `pnpm pending-work:check`; it reports `hiddenBacklog=false`, strict gate order, and `externalWrites=false`.
- Command Center displays Hermes inbox policy dry-run results through the `Policy Dry-Run Preview` panel.
- Command Center displays lead event audit lane, risk flags, external handoff blocks, and evidence checklist inside the Lead Backend panel.
- External writes remain blocked by default.
- Release/handoff/live-start/known-issues docs are locked locally at root for future operators.
- Root operating files are subordinate to `AGENTS.md`; if they conflict, the stricter safety rule applies.

## Services

| Service | URL/Port | Status | External Writes | Notes |
| --- | --- | --- | --- | --- |
| dev-control-api | `http://127.0.0.1:8711` | local when `pnpm dashboard:run` is active | blocked | API reports `dryRunOnly=true` and `externalWrites=false`. |
| dev-dashboard | `http://127.0.0.1:8710` | local when `pnpm dashboard:run` is active | blocked | Command Center UI for local review. |
| pocket-hatchery | `apps/pocket-hatchery/` | local scaffold | blocked | Testnet-first; no real signer or randomness. |
| public website | `https://www.sirinx.co` | production site, protected | approval required | Do not change from this repo without exact public-site task. |
| Hermes gateway | local runtime | readable through external gate check | approval required for messages | Pairing/send gates remain manual. |
| Solis telemetry | not active | blocked | blocked | Requires consent, credential storage, and station mapping. |

## Current Gates

| Gate | Status | Evidence | Next Action |
| --- | --- | --- | --- |
| Codex Mobile QR/MFA | blocked manual | `docs/knowledge/external-gates/evidence/codex-mobile-qr-mfa.md` expected | Human operator pairs Mac host with phone. |
| SIRINX OS GitHub publish | **pushed to `staging/godmode-master-os-v2`** | commit `28b8ea1` | Await PR/merge approval. |
| Telegram/LINE | blocked credential/recipient | evidence template under `docs/knowledge/external-gates/evidence/` | Confirm recipient/channel and rotate/store token before smoke send. |
| Solis API | blocked consent/credential | evidence template under `docs/knowledge/external-gates/evidence/` | Confirm consent, read-only credentials, and station mapping. |
| Cloudflare Bot Management | optional official review | current CSP mitigation documented | Review dashboard/API rule only if replacing CSP mitigation. |
| Pocket Hatchery testnet deploy | blocked R0 | `apps/pocket-hatchery/ops/release_gate_evidence.md` | Approve R0 gate individually. |

## Current Integration Workstreams

| Workstream | Status | Source |
| --- | --- | --- |
| GitHub repo inventory | done local | `services/dev-control-api/src/github-integration.mjs` |
| **GhostClaws GodMode Mission Control** | **pushed to staging** | `apps/centerbrain-shell/`, `services/dev-control-api/src/centerbrain-hub.mjs` |
| **Pocket Hatchery MVP scaffold** | **done local** | `apps/pocket-hatchery/`, `WORKSPACE_SCAFFOLD/` |
| Solar ops extraction | contract locked | `SIRINX_SOLAR_OPS_EXTRACTION_PLAN_2026-05-20.md`, `SIRINX_SOLAR_OPS_ENTITY_CONTRACT_2026-05-20.md` |
| Agent runtime extraction | docs locked | `SIRINX_AGENT_RUNTIME_EXTRACTION_PLAN_2026-05-20.md` |
| Safe command and memory policy | docs locked | `SIRINX_SAFE_COMMAND_MEMORY_POLICY_2026-05-20.md` |
| Marketing/CRM schema comparison | contract locked | `SIRINX_MARKETING_CRM_SCHEMA_COMPARISON_2026-05-20.md`, `SIRINX_LEAD_CRM_HANDOFF_CONTRACT_2026-05-20.md` |
| Lead qualification v2 | done local | `services/dev-control-api/src/lead-qualification.mjs` |
| Lead event audit preview | done local | `services/dev-control-api/src/lead-event-audit.mjs`, `GET /api/lead-event-audit` |
| Lead audit Command Center view | done local | `apps/dev-dashboard/src/app.js`, `apps/dev-dashboard/src/index.html` |
| Lead CRM handoff contract | done local | `services/dev-control-api/src/lead-crm-contract.mjs`, `GET /api/lead-crm-contract` |
| Solar ops entity contract | done local | `services/dev-control-api/src/solar-ops-contract.mjs`, `GET /api/solar-ops-contract` |
| policy-core v1 | done local | `packages/policy-core/src/index.mjs`, `GET /api/policy-core` |
| Hermes inbox contract | design locked | `docs/knowledge/SIRINX_HERMES_INBOX_CONTRACT_2026-05-20.md` |
| Hermes inbox dry-run normalizer | done local | `services/hermes-api/src/inbox.mjs`, `POST /api/hermes-inbox/dry-run` |
| Approval evidence snapshots | done local | `services/dev-control-api/src/approval-evidence.mjs`, `pnpm approval-evidence:dry-run` |
| Pending work ledger | done local | `services/dev-control-api/src/pending-work.mjs`, `GET /api/pending-work`, `pnpm pending-work:check` |
| Hermes external adapters | blocked | connector evidence required before any adapter execution |

## Verification Commands

Use these before commit-ready status:

```bash
pnpm verify
pnpm exec vitest run services/dev-control-api/src/lead-qualification.test.mjs
pnpm lead-event-audit:test
pnpm lead-crm-contract:test
pnpm solar-ops-contract:test
pnpm policy-core:test
pnpm policy-core:api-test
pnpm hermes-inbox:test
pnpm approval-evidence:test
pnpm pending-work:test
pnpm pending-work:check
pnpm dashboard:e2e
pnpm external-gates:check
python3 -m unittest discover -s WORKSPACE_SCAFFOLD/tests -v
python3 WORKSPACE_SCAFFOLD/scripts/status_report.py --root .
git diff --check
```

## Stop Rules

- Stop before deploy, DNS route, Cloudflare write, database migration, GitHub push, Telegram/LINE send, Solis API use, or production lead creation unless exact approval exists.
- Do not read `.env` values.
- Do not read or copy keystore/signing material.
- Do not write raw chat logs into memory.
- Do not treat this file as permission to bypass `AGENTS.md`.
