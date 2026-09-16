# Thaimart Automation BRD

Status: local specification from operator-provided images
Date: 2026-07-09
Target: SIRINX OS Thaimart automation planning
Mode: documentation only, no Telegram send, no worker execution, no deploy, no push, no production mutation

## Source Inputs

- Image 1: reverse engineering and automation workflow diagram for Thaimart.com.
- Image 2: strategic collaboration visual reference for Thaimart and sirinx.co.
- Existing local evidence:
  - `scripts/seed_test.mjs`
  - `memory/live/products.json`
  - `memory/live/approvals.json`
  - `docs/receipts/THAIMART_APPROVE_EXPORT_GATE_READINESS_20260709.md`

## Business Objective

Create a governed, local-first specification for a future Thaimart product
automation pipeline that can synchronize product data, stock, orders, shipment
status, chat responses, invoices, and reports only after exact gates are
approved and verified.

The immediate output is a spec pack. It is not a live integration, not a
partnership claim, not a worker execution approval, and not a production deploy.

## Business Outcomes

- Turn the visual workflow into actionable requirements for a future build.
- Separate confirmed local repo state from inferred target architecture.
- Define the data contract required before product, stock, order, customer,
  shipment, invoice, and chat sync can be implemented.
- Define approval gates for Telegram, worker execution, export generation,
  production deploy, push, and external marketplace mutation.
- Prepare a future local dry-run export flow using synthetic data only.
- Preserve governance, rollback, audit, and no-secret rules.

## Confirmed Current State

- A local seed script exists for synthetic Thaimart automation testing.
- Local seed data includes one synthetic product and one approval gate row.
- `THAIMART_LIVE_PUBLISH` appears in the seed script.
- Focused discovery did not find a dedicated Thaimart export worker command.
- External gate runner reports readiness only and cannot execute external work.
- Telegram gateway is configured as dry-run-first with live send closed.

## Inferred Target Architecture From Image

The workflow diagram proposes these future capabilities:

- Reverse engineering and knowledge extraction.
- Authentication and authorization layer.
- Core automation engine.
- Data mapping between SIRINX and Thaimart entities.
- Product, stock, order, price, promotion, chat, shipment, invoice, status, and
  report sync.
- Logistics integration with Flash, Kerry, and Thailand Post.
- SEO and marketing boost layer.
- Governance for compliance, logs, rollback, and API rate limits.
- KPI targets for sales, time saving, error reduction, response time, and
  on-time fulfillment.

These are target requirements only. They are not confirmed as implemented.

## Scope

In scope now:

- Requirement extraction from the images.
- Local spec pack creation.
- Data mapping design.
- Worker and gate design.
- Export flow design.
- Evidence receipt for image intake.
- Local verification of documentation and safe boundaries.

Out of scope until exact separate approval:

- Telegram live send.
- Telegram webhook activation.
- LINE push/reply send.
- Worker execution.
- Queue payload execution.
- Export file generation from real data.
- Thaimart API, session, browser, or seller center mutation.
- Production deploy.
- Git push or merge.
- Cloudflare, Supabase, database, CRM, or customer data mutation.
- Provider calls or paid API usage.
- Secret reads, secret printing, or `.env` inspection.

## Users

- Operator: approves gates, reviews evidence, owns production risk.
- Hermes Commander: control plane, queue, receipt, and approval routing.
- Codex Builder: local docs, specs, tests, and future scoped implementation.
- OpenCode Auditor: read-only review and evidence validation.
- Business user: future product operator reviewing sync/export outputs.
- Customer service user: future chat/order/shipment support reviewer.

## Success Criteria

- Spec pack exists under `docs/specs/thaimart-automation/`.
- Requirements are separated into functional, data, gate, worker, and export
  flow documents.
- Every external or production action remains gated.
- No secret, customer data, production API key, or live marketplace action is
  introduced.
- Future implementer can build a local dry-run worker from the spec without
  guessing the entity model.

## Risks

- The images may describe an intended business plan rather than existing code.
- Official Thaimart API availability is not confirmed in the local repo.
- Session-based seller center automation may violate platform terms if not
  approved and reviewed.
- Partnership wording in visual assets may be misleading without legal/business
  evidence.
- Product, order, customer, invoice, and chat data can contain PII and must not
  be logged or stored without explicit approval.
- Logistics integrations may require contracts, credentials, and rate limits.
- Automated price/stock/order updates can cause business loss if mappings are
  wrong.

## Governance Position

The current safe state is documentation only. Broad approval language is
recorded as operator intent, but executable approval still requires a specific
target, exact command, evidence path, rollback owner, and forbidden adjacent
actions.
