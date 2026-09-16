# Figma Layout Brief: Thaimart Automation Operator Review Surface

Status: local brief only, not created in Figma
Date: 2026-07-09
Source spec: `docs/specs/thaimart-automation/`
Safety mode: local-safe design planning

## Design Goal

Design an operator review surface for the future Thaimart local dry-run export
flow. The UI should help an operator inspect product mapping, stock mapping,
approval gates, validation errors, blocked actions, and receipt evidence before
any worker execution or marketplace mutation is approved.

This brief is a design plan only. It does not create a Figma file, does not
claim a legal/commercial partnership, and does not authorize production action.

## Recommended Figma File Name

SIRINX Thaimart Automation Review Surface - Local Dry Run v1

## Primary Audience

- SIRINX operator reviewing a dry-run export preview.
- Hermes Commander reviewing gates and stop conditions.
- Codex Builder verifying local output and test results.
- OpenCode Auditor checking evidence before any exact gate.

## Visual Direction

- Overall tone: technical, premium, operational, controlled.
- Base palette: SIRINX dark navy and slate.
- Accent palette: electric blue for SIRINX system state, restrained orange for
  Thaimart target state, green only for verified local-safe pass states, amber
  for gates requiring review, red for blocked external actions.
- Typography: compact dashboard hierarchy, not marketing hero scale.
- Style: dense but legible operations interface, 8px spacing scale, no decorative
  orbs, no fake production status.
- Motion note: use subtle state transitions for panel expand/collapse and gate
  status changes only; no motion that implies an action already executed.

## Branding Guardrail

The provided Thaimart and sirinx.co partnership image is a visual reference
only. Do not use partnership claims, official co-branding language, or customer
facing launch copy unless legal/business evidence is approved separately.

Safe wording:

- "Thaimart automation planning"
- "Local dry-run preview"
- "Marketplace target mapping"
- "Pending exact approval"

Avoid wording:

- "Official partnership live"
- "Published to Thaimart"
- "Automation complete"
- "100% automatic live operation"

## Frame Set

### Frame 1: Desktop Review Dashboard

Size: 1440 x 1024

Sections:

1. Header
   - Title: "Thaimart Export Dry-Run Review"
   - Status pill: "Local preview only"
   - Gate pill: "Worker execution closed"
   - Evidence link area.

2. Source Summary
   - Synthetic product count.
   - Approval rows count.
   - Seed status.
   - Last validation time.

3. Product Mapping Table
   - SIRINX SKU.
   - SIRINX title.
   - Thaimart category target.
   - Price target.
   - Stock target.
   - Mapping status.

4. Validation Panel
   - Required field checks.
   - PII checks.
   - Secret-like value checks.
   - Unknown mapping warnings.

5. Gate Matrix
   - Local seed validation: pass.
   - Telegram/LINE recipient evidence: incomplete.
   - Worker execution: closed.
   - Render/export: closed.
   - Marketplace mutation: closed.
   - Deploy/push: closed.

6. Export Preview Artifacts
   - `product-export.json`
   - `stock-export.json`
   - `mapping-report.json`
   - `validation-report.json`
   - `receipt.md`

7. Stop Rule Banner
   - "No Telegram send, worker execution, marketplace mutation, deploy, push,
     or secret read without a separate exact gate."

### Frame 2: Mobile Review Sheet

Size: 390 x 844

Sections:

1. Compact header with status.
2. Product summary card.
3. Gate status list.
4. Validation result list.
5. Evidence button row.
6. Stop rule at bottom.

Mobile behavior:

- Keep QR/visual assets out of this flow unless a separate LINE task needs them.
- Prioritize gate clarity over full tables.
- Use stacked rows with clear pass, review, blocked states.

### Frame 3: Future Approval Modal

Size: 640 x 720

Purpose:

Show what an exact gate must contain before any action is allowed.

Fields:

- Gate phrase.
- Exact allowed command.
- Target.
- Evidence path.
- Rollback owner.
- Forbidden adjacent actions.
- Confirmation that secrets are not printed.

Default state:

- Disabled action button.
- Label: "Exact gate missing"

## Component List

- Status pill.
- Gate pill.
- Evidence link row.
- Mapping table row.
- Validation check row.
- Blocked action banner.
- Artifact list item.
- Approval modal.
- Audit timeline item.

## Copy Deck

Primary headline:

```text
Thaimart Export Dry-Run Review
```

Subheadline:

```text
ตรวจ mapping, validation, gate และ receipt ก่อนอนุมัติ action ถัดไป
```

Stop rule:

```text
ยังไม่มีการส่ง Telegram, รัน worker, publish ไป Thaimart, deploy, push หรืออ่าน secret
```

Gate helper:

```text
ต้องมี exact gate พร้อม command, target, evidence และ rollback ก่อน action จริง
```

## Interaction Notes

- Clicking an artifact opens a read-only preview panel in the future app.
- Clicking a gate opens the gate detail modal.
- The approval modal stays disabled unless all exact gate fields are present.
- The UI must never display secret values.
- The UI must mark production and customer-data actions as closed by default.

## Accessibility Requirements

- Every status pill must have a text label, not color alone.
- Tables must have visible column labels.
- Buttons must have accessible names.
- Blocked action warnings must be readable at mobile width.
- Avoid low-contrast blue-on-slate text.

## Handoff Notes For Figma Creation

Use this brief to create Figma frames only after a separate exact Figma external
write gate. If no Figma gate is present, keep this Markdown brief as the source
of truth.

## External Creation Gate

To create this in Figma later, use a separate gate with this shape:

```text
APPROVE_FIGMA_CREATE_THAIMART_REVIEW_BRIEF_20260709
Allowed action: create one Figma design file or page from /Users/sirinx/sirinx-os/docs/planning/thaimart-automation/FIGMA_LAYOUT_BRIEF_20260709.md
Target: one approved Figma workspace/file
Evidence: /Users/sirinx/sirinx-os/docs/planning/thaimart-automation/FIGMA_LAYOUT_BRIEF_20260709.md
Rollback owner: sirinx
Forbidden adjacent actions: production deploy, worker execution, marketplace mutation, Telegram send, GitHub issue creation, ClickUp task creation, secret print
```
