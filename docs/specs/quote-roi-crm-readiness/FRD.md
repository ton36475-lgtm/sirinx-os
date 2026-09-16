# Quote ROI CRM Readiness FRD

Status: future-ready local specification
Target: SIRINX website and GhostClaw OS lead architecture

## Functional Requirements

### QRC-FR-001 Quote Form Readiness

The future quote form must collect only assessment data needed for Solar Carport, Rooftop Solar, BESS, and EV Charger evaluation.

Future fields:
- Contact preference.
- Project type.
- Province or service area.
- Monthly electricity bill range.
- Installation location type.
- Available roof, carport, or land area notes.
- Optional file upload request for electricity bill and site photos.

Current phase acceptance:
- Document fields only.
- Do not create a production submit endpoint.
- Do not store customer data.
- Direct customers to LINE Official or `/contact` until implementation is approved.

### QRC-FR-002 ROI Calculator Readiness

The future ROI calculator must produce estimates, not guarantees.

Future inputs:
- Monthly bill range.
- Daytime usage profile.
- Roof/carport availability.
- Estimated system size range.
- Optional EV/BESS interest.

Future outputs:
- Estimated payback range.
- Estimated bill reduction range.
- Suggested next assessment step.
- Disclaimer that engineering review is required.

Current phase acceptance:
- No calculator is implemented.
- No financial promise or guaranteed saving claim is added.
- No analytics or lead storage is connected.

### QRC-FR-003 Lead CRM Handoff Readiness

The future CRM handoff must be approval-gated and auditable.

Future behavior:
- Normalize lead payload.
- Validate consent and source.
- Redact unnecessary PII in logs.
- Store only after explicit CRM/customer data approval.
- Emit local evidence receipt.

Current phase acceptance:
- CRM/customer data storage remains blocked.
- No database or CRM write is introduced.
- `/quote` may show CRM handoff readiness content only when it is static, no-storage, and clearly marked as a closed gate.
- The CRM handoff readiness section must not include input fields, file uploads, form submit, storage calls, network calls, or production analytics.
- The section must explain consent, data minimization, human review before CRM handoff, evidence after approval, and blocked database connection.

### QRC-FR-004 PDF Proposal Readiness

The future proposal system must generate customer-facing PDFs only after review.

Future behavior:
- Use approved project assumptions.
- Include disclaimers and validity period.
- Require human review before sending.

Current phase acceptance:
- No PDF is generated from customer data.
- No external send is performed.

### QRC-FR-005 LINE Automation Readiness

LINE rich menu, message automation, and webhook integrations must remain separate approval gates.

Current phase acceptance:
- LINE Official links and QR remain static website links only.
- No webhook endpoint is activated.
- No automated messages are sent.

### QRC-FR-006 UAT And CRUD Verifier Readiness

Future Stagehand UAT and CRUD verifier work must use synthetic data.

Current phase acceptance:
- Stagehand/browser automation beyond existing local Playwright tests is not added.
- CRUD verifier writes remain blocked.
- MongoDB and database connections remain blocked.

### QRC-FR-007 Trust And Content Readiness

Future Trust Center, product catalog, and project proof CMS must avoid fake claims.

Current phase acceptance:
- Document the content model.
- Do not fabricate reviews, ratings, certifications, project records, or performance claims.
