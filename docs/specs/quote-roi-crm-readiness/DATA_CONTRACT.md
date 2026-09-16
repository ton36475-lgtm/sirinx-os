# Quote ROI CRM Readiness Data Contract

Status: future-ready local specification
Target: SIRINX website and GhostClaw OS lead architecture

## Current Contract

Current implementation stores no quote, ROI, CRM, or customer data. The website routes users to LINE Official and contact options only.

## Future Quote Payload

Synthetic/local shape:

```json
{
  "leadSource": "sirinx-site",
  "contactPreference": "line",
  "projectType": "solar-carport",
  "province": "Phitsanulok",
  "monthlyBillRange": "10000-30000",
  "usageProfile": "daytime-business",
  "siteType": "commercial-parking",
  "hasBillFile": false,
  "hasSitePhotos": false,
  "notes": "synthetic local test only",
  "consent": false
}
```

Rules:
- `consent=false` in all synthetic examples.
- Do not include real names, phone numbers, LINE user IDs, emails, bills, addresses, or photos in docs or logs.
- Production payload storage requires explicit CRM/customer data approval.

## Future ROI Payload

Synthetic/local shape:

```json
{
  "monthlyBillRange": "10000-30000",
  "usageProfile": "daytime-business",
  "projectType": "rooftop-solar",
  "includeBess": false,
  "includeEvCharger": false,
  "estimateOnly": true
}
```

Rules:
- Outputs are ranges only.
- No guaranteed savings or financial promise.
- Engineering review is required before proposal.

## Future CRM Handoff Payload

Synthetic/local shape:

```json
{
  "source": "sirinx-site",
  "stage": "new-assessment-request",
  "projectType": "solar-carport",
  "consentRecorded": false,
  "piiRedactedInLogs": true,
  "externalWriteApproved": false
}
```

Rules:
- `externalWriteApproved` must be `false` until an exact approval gate exists.
- CRM write must produce an evidence receipt.
- Logs must redact PII.
- Current website readiness content must not render customer-data fields or accept a payload.
- Any UI describing CRM handoff must remain static and marked as a closed gate until CRM/customer data storage is explicitly approved.

## Blocked Fields

The following must not be stored or logged in this phase:
- Real customer name.
- Phone number.
- Email address.
- LINE user ID.
- Electricity bill file.
- Site photos.
- Exact address.
- Payment data.
- Production CRM record ID.

## Required Future Gates

- Quote form production submission approval.
- ROI calculator production release approval.
- CRM/customer data storage approval.
- Database migration/write approval.
- LINE webhook approval.
- LINE live-send approval.
- Production analytics approval.
- PDF proposal generation and send approval.
