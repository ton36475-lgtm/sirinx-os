# Architecture

## Components

| Component | Purpose | External Calls | Mutation Risk |
| --- | --- | --- | --- |
| CSV templates | Import-ready sheet rows for local planning | none | local file only |
| Airtable schema | Base/table/field definition for manual import | none | local file only |
| n8n workflow | Disabled import draft with mock data nodes | none by default | local file only |
| Static dashboard | Browser UI for mock data review | none | read-only local page |
| Validation script | Checks structure, safety markers, and parseability | none | writes local report |
| A2A receipts | Mission evidence and checksums | none | local runtime files |

## Data Flow

```text
Niche candidate -> score -> IP precheck -> design brief -> QC -> listing draft -> owner action gate -> manual live tracking -> analytics iteration
```

## Trust Boundary

The automation can create planning data and drafts only. Marketplace publishing, ads spend, trademark clearance, legal judgment, and external posting are outside the system and require separate owner action.

## Failure Model

- Red IP risk blocks the design lane.
- Yellow IP risk creates a revise task.
- QC failure returns the design to revision.
- Missing validation evidence blocks local completion.
- Dirty repo state blocks automatic commit.
