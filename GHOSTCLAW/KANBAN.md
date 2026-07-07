# GHOSTCLAW Kanban Board

**Last Updated:** 2026-06-30T11:30 UTC
**Repo:** /Users/sirinx/sirinx-os
**Branch:** staging/godmode-master-os-v2

---

## TODO

| Card ID | Mission | Task | Tier | Assigned |
|---|---|---|---|---|
| RECEIPT-CLEANUP-001 | A2A2A | Backfill historical receipt checksums as a separate cleanup lane | B | Receipt_Auditor |

## IN_PROGRESS

| Card ID | Mission | Task | Tier | Status | Receipt |
|---|---|---|---|---|---|
| REVIEW-001 | Combined local-safe run | Reports/receipts awaiting operator review before local commit | A/B | REVIEW | combined_merch_hermes_macmini_20260630 |

## BLOCKED

| Card ID | Mission | Reason | Safe Alternative | Next Action |
|---|---|---|---|---|
| CRON-ACTIVATE-001 | Hermes Scheduler | launchd/crontab activation is a system mutation | Use local runner and templates only | Open an exact launchd/crontab activation gate after review |
| TELEGRAM-LIVE-001 | Hermes Control Plane | live Telegram broadcast/send is external messaging | Keep reports as local drafts | Open an exact live-send gate for commander-only delivery |
| AMAZON-LIVE-001 | Merch Dashboard | Amazon live publish/control automation is blocked | Use owner manual review/action | Owner performs marketplace action manually after IP/policy review |

## REVIEW

| Card ID | Mission | Task | Validator | Status |
|---|---|---|---|---|
| RECEIPT-CLEANUP-001 | A2A2A | Historical receipts without checksum | Receipt_Auditor | separate cleanup lane |

## DONE

| Card ID | Mission | Task | Completed At | Receipt |
|---|---|---|---|---|
| P0 | A2A2A | Full local inspection | 2026-06-30T00:44Z | evidence/phase_0_observe |
| P1 | A2A2A | Worker registry (18 workers) | 2026-06-30T10:30Z | worker-registry.json v3.0.0 |
| P7 | A2A2A | Kimi Worker Lane docs | 2026-06-30T10:25Z | docs/knowledge/KIMI_K2_7_CODE |
| P8 | A2A2A | MoA-Gated Brainstorm docs | 2026-06-30T10:25Z | docs/knowledge/GHOSTCLAWS_SUB_AGENT_TEAM |
| P9 | A2A2A | LatentMAS dual-plane docs + manifest | 2026-06-30T10:25Z | .ghostclaw_runtime/latent/manifest.json |
| P10 | A2A2A | Skill Creator / Zero Prompting SKILL.md | 2026-06-30T10:00Z | skills/ghostclaw-agent-ghostclaws |
| P11 | A2A2A | GitHub Toptrend Research Worker | 2026-06-30T10:06Z | GHOSTCLAW/research/github-toptrend |
| P12 | A2A2A | EdgeOne Makers Readiness | 2026-06-30T10:06Z | docs/knowledge/EDGEONE_MAKERS |
| CRON-001 | Hermes | Cronjob heartbeat monitor created | 2026-06-30T10:36Z | job 2195036d7ed5 |
| MACM2-001 | Hermes Mac mini M2 | Local-safe command system, registry aliases, scheduler runner, templates | 2026-06-30T11:30Z | `.ghostclaw_runtime/reports/FINAL_REPORT_HERMES_FULL_AUTO_MAC_MINI_M2.md` |
| SWARM-001 | Hermes Swarm | Local-safe supervisor/subagent docs, packets, schemas, dispatcher surfaces | 2026-06-30T11:30Z | `FINAL_REPORT_GHOSTCLAW_FULLAUTO_HERMES_SWARM.md` |
| MERCH-001 | Merch Dashboard | Dashboard/schema/templates/n8n/prompts/QC/calendar validated | 2026-06-30T11:30Z | `docs/knowledge/merch_automation_dashboard_v1/reports/FINAL_REPORT.md` |

---

## Rules
- Every mission packet must create or update a Kanban card
- Every mutation must link to receipt_id
- BLOCKED cards must include blocked_reason, safe_alternative, next_safe_action
- DONE cards must include validation evidence
