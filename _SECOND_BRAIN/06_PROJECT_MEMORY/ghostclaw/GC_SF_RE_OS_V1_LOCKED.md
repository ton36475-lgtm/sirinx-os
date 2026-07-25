# GHOSTCLAW_SENIOR_FULLSTACK_REVERSE_ENGINEERING_OS_V1_LOCKED
# Receipt - Selected Master Plan V1

## Status
- **Locked**: YES
- **Selected Date**: 2026-07-01
- **Refresh Date**: 2026-07-02
- **Selected As**: ONLY_MASTER_PLAN
- **Approval Mode**: APPROVE_ALL_SAFE_LOCAL_SPEC_WORK_ONLY
- **Previous Plans**: Archived under /plans/archive/
- **First Packet**: P000A_REPO_INTAKE_READONLY

## Final Selected Plan

`GHOSTCLAW_SENIOR_FULLSTACK_REVERSE_ENGINEERING_OS_V1` is the only master
plan. It replaces scattered sub-plans and combines research, source
verification, safe reverse engineering, OpenSpec, knowledge vault sync,
full-stack build planning, policy gates, validation, receipts, handoff, and
wisdom extraction into one operating loop.

## Core Loop

```
Source → Verify → Reverse Engineer → Spec → Architecture
→ Knowledge Vault → Build Packet → Validate → Receipt → Handoff → Learn
```

## Selected Phases
1. Source Intake
2. Source Verification  
3. Reverse Engineering Map
4. OpenSpec Proposal
5. Architecture Design
6. Knowledge Vault Sync
7. Full-Stack Build
8. Policy Gate
9. Validation
10. Receipt
11. Handoff
12. Wisdom Extraction

## Approval Semantics

`approve all` means safe local spec work only. It does not approve installing
repositories, running external scripts, connecting providers, configuring API
keys, reading secrets, deploying, pushing, browser bypass, protected scraping,
OSINT execution against real targets, credential testing, or GPU inference.

Allowed automatically:

- read existing project docs
- summarize repo shape
- classify source reliability
- create reverse-engineering canvas
- create OpenSpec proposal, design, tasks, and acceptance docs
- create architecture, API, database, frontend, validation, receipt, handoff,
  and AI Second Brain notes

Still gated:

- install, clone, run external scripts, provider/model calls, API keys, deploy,
  push, cloud mutation, live Telegram/LINE/customer send, browser automation on
  real targets, dark web/OSINT execution, credential/security testing, and GPU
  live inference

## Worker Map
- **Hermes Commander**: Intent intake + dispatch
- **Policy Guardian**: Risk control
- **OpenSpec Layer**: Source of truth before code
- **AI Second Brain**: Knowledge persistence
- **Codex Builder**: File mutation (gated)
- **OpenCode Reviewer**: Read-only audit
- **Validator Worker**: Test + lint + receipt
- **9Router**: Model routing
- **Logto**: Auth/RBAC boundary
- **n8n**: Workflow automation
- **video-use**: Content pipeline
- **OpenClaw**: Mobile companion node
- **GPU/H100**: Compute burst (gated)

## Android / Mobile Node Lock

Hermes-agent Android is a companion/control node only. It may view mission
status, receive short commands, send approval signals, view receipts, and
monitor worker progress. It is not a root executor and must not mutate source,
deploy, push, install all repos, read secrets, or run external scripts blindly.

## Build Order (Mandatory)
1. Backend Core
2. Database / Domain Schema
3. Service Logic
4. API Contract
5. API Route / Handler
6. API Client Wiring
7. Frontend State / Hooks
8. Components
9. Pages (one by one)
10. Local UAT
11. Validation
12. Receipt
13. Commit Gate Review

## Hard Blocks (Always Applied)
- secret_read
- auto_push
- auto_deploy
- telegram_live_send_without_gate
- provider_paid_call_without_gate
- network_bypass
- fake_sni
- tls_validation_disable
- credential_extraction
- protected_site_scraping

## First Packet Lock

`P000A_REPO_INTAKE_READONLY` starts the system. It inspects current project
shape, summarizes stack, detects risk, and prepares the OpenSpec entrypoint
without changing product source files.

## Artifact Checklist (10 Required)
- [x] source_verification.md
- [x] reverse_engineering_canvas.md
- [x] openspec/proposal.md
- [x] openspec/design.md
- [x] openspec/tasks.md
- [x] openspec/acceptance.md
- [x] architecture_map.md
- [x] api_contract.md
- [x] validation_plan.md
- [x] receipt.json
- [x] handoff.md

## Model Router Reference
- primary_local_coding_agent: gemma4:12b-mlx (pending pull)
- fast_small_task_agent: gemma4:e4b-mlx
- legacy_coder_fallback: qwen2.5-coder
- cloud_escalation: policy_selected (gated)

## Note on "The Agency" Reference
- User-provided July 2026 source says 232 specialized agents across 16
  divisions. Treat this as drift-prone and verify against the current source
  before any import.
- Used as: pattern reference for agent roster taxonomy.
- NOT installed - used for architecture research only.

## Current P000A Evidence

- Source list: `docs/research/source_list.md`
- Source reliability: `docs/research/source_reliability_table.md`
- Open questions: `docs/research/open_questions.md`
- Source verification: `docs/research/source_verification.md`
- Repo intake canvas: `docs/reverse_engineering/repo_intake_canvas.md`
- Reverse-engineering canvas: `docs/reverse_engineering/reverse_engineering_canvas.md`
- OpenSpec change: `openspec/changes/gc-sf-re-os-v1-p000a/`
- Architecture map: `docs/architecture/architecture_map.md`
- Validation plan: `docs/validation/validation_plan.md`
- Receipt: `.ghostclaw_runtime/evidence/GC-SF-RE-OS-V1-20260701-001.receipt.json`
- Handoff: `handoff/GC-SF-RE-OS-V1-20260701-001.handoff.md`

---
*Generated: GC-SF-RE-OS-V1-LOCKED*
