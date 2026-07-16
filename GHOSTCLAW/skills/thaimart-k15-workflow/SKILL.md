---
name: thaimart-k15-workflow
description: ThaiMart K01-K15 operational workflow engine — 15 capabilities from context lock to lifecycle orchestration with human approval gates and auto Tier A/B execution.
version: 2.0.0
---

# ThaiMart K01-K15 Workflow Engine

## Operating Principle
คนกำหนดทิศทาง · AI ช่วยร่างและจัดระบบ · คนตรวจและอนุมัติ · Tier A/B อัตโนมัติ · Tier D/X บล็อก

## K01-K15 Capability Map

| K | Capability | Auto? | Gate |
|---|-----------|-------|------|
| K01 | Brand & Commerce Context Registry | ✅ Draft | Brand Owner sign-off |
| K02 | Project Isolation (RBAC, own-store) | ✅ Setup | PDPA purpose lock |
| K03 | Omnichannel Repurposing | ✅ Generate | Channel QA + approval |
| K04 | AI Draft Studio | ✅ Draft | Human selects final |
| K05 | Insight Hub | ✅ Aggregate | Read-only-first |
| K06 | Stakeholder Reporting | ✅ Draft | Owner approves send |
| K07 | Plan-before-Production | ✅ Draft | Brief approval |
| K08 | Scheduled Operations | ✅ Read/draft | External write = approve |
| K09 | Secure Connector Registry | ❌ Admin | Default-deny, vault |
| K10 | Two-Pass Quality Gate (QA1+QA2) | ✅ Check | QA fail = REWORK |
| K11 | Human Authority & Decision Ledger | ❌ Human | requester ≠ approver |
| K12 | Repetitive Work Automation | ✅ Template | No self-publish |
| K13 | Evidence Learning Loop | ✅ Analyze | Human selects insight |
| K14 | Channel-Native Adaptation | ✅ Adapt | Platform checklist |
| K15 | Unified Lifecycle Orchestration | ✅ Track | Audit receipt |

## End-to-End State Machine

```
INTAKE → CONTEXT_LOCKED → PLANNED → DRAFTED → CHANNEL_ADAPTED
→ QA1_REVIEW → QA2_REVIEW → WAITING_APPROVAL
→ READY_TO_APPLY → APPLIED → MONITORING → REPORTED → ARCHIVED
```

Failure paths:
- QA1 fail → back to DRAFTED
- QA2 fail → back to DRAFTED or BLOCKED
- Approval rejected/expired → REJECTED
- Integration error → FAILED/DLQ

## ThaiMart Adapter Status

```yaml
thaimart_adapter:
  status: disabled_pending_contract
  official_api: unknown
  auth_mode: unknown
  webhooks: unknown
  reads: []
  writes: []
  rate_limit: unknown
  own_store_only: true
  fail_closed: true
```

**Rule**: `unknown` behaves like `denied`. No ThaiMart network call until contract gate passes.

## Implementation Files

| File | Purpose |
|------|---------|
| `services/dev-control-api/src/thaimart-k-workflow-engine.mjs` | State machine + approval gates |
| `services/dev-control-api/routes/thaimart-workflow.mjs` | API routes |
| `packages/types/src/ghostclaw-governance.mjs` | Tier classifier shared |

## API Endpoints

```bash
# Status
curl http://localhost:8711/api/thaimart/workflow/status

# Create project
curl -X POST http://localhost:8711/api/thaimart/workflow/create \
  -H 'Content-Type: application/json' \
  -d '{"id":"SRX-TM-2026-001","type":"catalog"}'

# Advance state
curl -X POST http://localhost:8711/api/thaimart/workflow/advance \
  -H 'Content-Type: application/json' \
  -d '{"workflow":{"state":"QA1_REVIEW"},"event":"approve"}'
```

## QA1 Checklist (Content & Brand)
- ตรงกับ objective และ audience
- ใช้ Context Pack version ที่ระบุ
- น้ำเสียงเป็น SIRINX ไม่ใช่ AI ทั่วไป
- ไม่อ้างเกินหลักฐาน
- CTA ชัดและเหมาะกับช่องทาง
- ไม่อ้าง Official Partner โดยไม่มีหลักฐาน

## QA2 Checklist (Facts & Safety)
- ชื่อสินค้า, SKU, spec ตรงกับข้อมูลหลัก
- ราคา/สต็อก มี timestamp
- ลิงก์, เบอร์, campaign code ถูกต้อง
- ไม่มี PII, secret, internal note
- ลิขสิทธิ์/โลโก้/ภาพ ผ่านตรวจ
- แสดง diff + rollback ก่อน external write

## Daily Operating Cadence

| Time | Action | Auto? |
|------|--------|-------|
| 09:00 | Read-only pulse (orders, stock drift) | ✅ Tier A |
| ระหว่างวัน | Draft content, channel adaptation | ✅ Tier B |
| ก่อนเผยแพร่ | QA1 → QA2 → approval | ❌ Human |
| สิ้นวัน | Reconcile, archive receipts | ✅ Tier B |

## Forbidden Actions
- bypass login, anti-bot, session scraping
- self-publish, self-price, self-stock, self-chat
- อ้าง partner status โดยไม่มีหลักฐาน
- รับประกัน KPI โดยไม่มี baseline

## Pitfalls
- ThaiMart connector MUST stay `disabled_pending_contract` until contract
- E02 evidence (Seller Center profile) contains PII — use redacted derivative only
- Approval expires when price/stock/source data changes
- `reserved > on_hand` must be rejected in inventory
