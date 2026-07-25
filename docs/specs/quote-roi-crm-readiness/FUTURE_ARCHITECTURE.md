# Quote ROI CRM Future Architecture

Status: future-ready local specification
Target: SIRINX website and GhostClaw OS lead architecture

## Architecture Principle

Every future conversion feature must pass through:

```text
Intent -> Local Validation -> Human Review -> Exact Approval Gate -> External Write/Send
```

No feature in this spec is active in production.

## Quote Form

Future role:
- Capture assessment intent.
- Normalize fields.
- Attach uploaded bill/site photo metadata only after approval.
- Create a local preview before any CRM write.

Gate:
- `APPROVE_QUOTE_FORM_PRODUCTION_SUBMIT_<target>_<date>`

## ROI Calculator

Future role:
- Estimate payback and bill reduction ranges.
- Explain assumptions.
- Route user to engineering review.

Gate:
- `APPROVE_ROI_CALCULATOR_PRODUCTION_RELEASE_<target>_<date>`

## Lead CRM

Future role:
- Receive validated lead payload.
- Store lead source, service intent, and contact status.
- Keep PII logging redacted.

Gate:
- `APPROVE_CRM_CUSTOMER_DATA_STORAGE_<target>_<date>`

## PDF Proposal

Future role:
- Generate reviewed proposal artifacts from approved assumptions.
- Include validity period, exclusions, and engineering review status.

Gate:
- `APPROVE_PDF_PROPOSAL_GENERATION_<target>_<date>`

## LINE Rich Menu

Future role:
- Present assessment actions in LINE.
- Link to quote flow, project proof, and contact page.

Gate:
- `APPROVE_LINE_RICH_MENU_UPDATE_<target>_<date>`

## LINE Message Automation

Future role:
- Draft replies and classification.
- Route sensitive or customer-visible sends to human approval.

Gate:
- `APPROVE_LINE_MESSAGE_AUTOMATION_<target>_<date>`

## LINE Webhook

Future role:
- Receive LINE events for approved automation.
- Validate signature.
- Store minimal event metadata only after approval.

Gate:
- `APPROVE_LINE_WEBHOOK_ACTIVATION_<target>_<date>`

## Stagehand UAT

Future role:
- Run browser UAT against local routes and synthetic fixtures.
- Verify quote/ROI/contact flows before deployment.

Gate:
- `APPROVE_LOCAL_BROWSER_UAT_<target>_<date>`

## CRUD Verifier

Future role:
- Verify create/read/update/delete behavior in test database only.
- Use synthetic fixtures.

Gate:
- `APPROVE_LOCAL_UAT_CRUD_MONGODB_<target>_<date>`

## Trust Center

Future role:
- Publish company facts, safety policies, warranties, process notes, and evidence-backed trust content.

Rule:
- No fake reviews, fake ratings, or unverifiable certification claims.

## Product Catalog

Future role:
- Present service/product families such as Solar Carport, Rooftop Solar, BESS, EV Charger, and AI Energy Management.

Rule:
- Product claims must link to source or internal review evidence.

## Project Proof CMS

Future role:
- Publish approved project proof, photos, and case studies.

Rule:
- No customer-identifying content without explicit customer approval and evidence receipt.
