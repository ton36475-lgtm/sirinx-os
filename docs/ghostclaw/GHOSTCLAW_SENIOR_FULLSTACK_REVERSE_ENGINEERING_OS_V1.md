# GHOSTCLAW Senior Full-Stack Reverse Engineering OS V1

Mission: `GC-SF-RE-OS-V1-20260701-001`  
Status: `LOCKED`  
Selected as: `ONLY_MASTER_PLAN`  
Approval mode: `APPROVE_ALL_SAFE_LOCAL_SPEC_WORK_ONLY`  
First packet: `P000A_REPO_INTAKE_READONLY`

## Purpose

Unify GhostClaw/Hermes/Codex work into one operating system for research,
source verification, safe reverse engineering, OpenSpec, knowledge vault sync,
full-stack build packets, policy gates, validation, receipts, handoff, and
wisdom extraction.

## Operating Formula

```text
Source -> Verify -> Reverse Engineer -> Spec -> Architecture
-> Knowledge Vault -> Build Packet -> Validate -> Receipt -> Handoff -> Learn
```

## Core Rules

- No Spec -> No Build
- No Receipt -> No Handoff
- No Gate -> No Mutation
- No API Contract -> No Frontend
- No Policy -> No Tool Install

## Allow Auto

- read existing project docs
- source verification
- reverse-engineering canvas
- OpenSpec artifacts
- architecture map
- API contract draft
- database schema plan
- frontend plan
- validation plan
- AI Second Brain notes
- receipts
- handoff

## Gated

- code mutation
- file writes outside approved report/spec/receipt surfaces
- external tool install
- external repo clone
- provider config change
- model gateway connection
- OpenClaw device connection
- n8n workflow import
- video rendering
- cloud/GPU launch
- auth runtime migration

## Blocked

- read `.env`
- read secrets or API keys
- paid provider calls
- cloud mutation
- deploy
- push
- production database migration
- live Telegram/LINE/customer send
- background camera or mic
- anti-bot or Cloudflare bypass
- protected site scraping
- credential extraction
- dark web execution
- offensive security tooling
- blind install-all repos

## Worker Map

| Worker | Layer | Gate |
|---|---|---|
| Hermes | commander, single inbox, queue, receipt | Green |
| Policy Guardian | risk control | Green |
| OpenSpec | source-of-truth before build | Green |
| AI Second Brain | knowledge memory and decision rules | Green |
| Codex Builder | source mutation after file lease | Yellow |
| OpenCode Reviewer | read-only review, one packet lag | Green |
| Validator Worker | test, lint, schema, receipt | Green |
| Agency Agents | curated role registry | Yellow |
| 9Router | model routing/provider abstraction | Yellow/Red |
| Logto | auth/RBAC identity boundary | Yellow |
| n8n | workflow automation lane | Yellow |
| video-use | content render pipeline | Yellow |
| Stagehand | local/staging UAT only | Yellow |
| OpenClaw / Android Hermes-agent | companion/control node | Yellow |
| GPU / Float16 | compute burst | Red |

## Build Order

1. Backend Core
2. Database / Domain Schema
3. Service Logic
4. API Contract
5. API Route / Handler
6. API Client Wiring
7. Frontend State / Hooks
8. Components
9. Pages one by one
10. Local UAT
11. Validation
12. Receipt
13. Commit Gate Review

## P000A Outputs

- `docs/research/source_list.md`
- `docs/research/source_reliability_table.md`
- `docs/research/open_questions.md`
- `docs/research/source_verification.md`
- `docs/reverse_engineering/repo_intake_canvas.md`
- `docs/reverse_engineering/reverse_engineering_canvas.md`
- `openspec/changes/gc-sf-re-os-v1-p000a/`
- `docs/architecture/architecture_map.md`
- `docs/api/api_contract.md`
- `docs/database/domain_schema.md`
- `docs/frontend/frontend_state_and_pages.md`
- `docs/validation/validation_plan.md`
- `_SECOND_BRAIN/06_PROJECT_MEMORY/ghostclaw/project_memory.md`
- `_SECOND_BRAIN/05_EXTRACTED_WISDOM/decision_rules/reverse_engineering_to_build.md`
- `.ghostclaw_runtime/evidence/GC-SF-RE-OS-V1-20260701-001.receipt.json`
- `handoff/GC-SF-RE-OS-V1-20260701-001.handoff.md`

## Next Packet

`P000B_SOURCE_VERIFICATION`
