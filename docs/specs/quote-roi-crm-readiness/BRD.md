# Quote ROI CRM Readiness BRD

Status: future-ready local specification
Target: SIRINX website and GhostClaw OS lead architecture
Mode: local-only, no deploy, no push, no production mutation

## Business Objective

Prepare SIRINX for a governed quote, ROI, and lead handoff flow that can later turn website and LINE interest into structured assessment work without creating a production form, CRM write, database write, LINE webhook, or analytics integration in this phase.

## Business Outcomes

- Customers understand what information is needed for a solar assessment.
- The future quote flow can collect only necessary assessment fields.
- The future ROI calculator can provide clearly labeled estimates without guaranteed savings claims.
- The future CRM handoff can stay auditable, reversible, and approval-gated.
- Future PDF proposal and LINE automation work has a documented boundary before implementation.

## Scope

In scope now:
- Quote form architecture notes.
- ROI calculator architecture notes.
- Lead CRM handoff contract notes.
- PDF proposal preparation notes.
- LINE rich menu, LINE message automation, and LINE webhook readiness notes.
- Stagehand UAT and CRUD verifier readiness notes.
- Trust Center, product catalog, and project proof CMS readiness notes.
- Synthetic/local-only test strategy.

Out of scope until explicit approval:
- Real quote form submission.
- Production analytics.
- CRM/customer data storage.
- LINE webhook activation.
- Automated LINE messages.
- PDF proposal generation from customer data.
- Database migrations or writes.
- MongoDB or Supabase connection.
- Public tunnel, deploy, push, package install, or provider call.

## Audience

- SIRINX operators reviewing the next website conversion sprint.
- Codex/Hermes implementers preparing future local-safe tasks.
- Auditors checking that customer data and production automation remain gated.

## Success Criteria

- Future quote, ROI, CRM, PDF, LINE automation, UAT, Trust Center, catalog, and project proof requirements are documented.
- Static checker requires this spec pack.
- Verification commands remain local.
- No production integration is enabled.

## Risk Controls

- Do not claim guaranteed ROI, savings, zero downtime, certifications, or reviews.
- Use synthetic data in examples.
- Keep every data write behind an exact approval gate.
- Keep every external send behind an exact approval gate.
- Require rollback notes before any future implementation.
