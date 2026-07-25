# GHOSTCLAW_AGENCY_IMPORT_COMPACT_V1 Receipts

This folder contains local-safe receipts for the Agency Agents compact import
lane.

## Receipts

- `p000_agency_catalog_intake.receipt.json`: read-only catalog intake and local
  path inspection.
- `p001_create_ghostclaw_agency_adapter.receipt.json`: adapter documentation
  and manifest creation under leased paths.

## Receipt Rules

Receipts must record:

- mission id
- packet id
- changed files
- validation commands
- security flags
- PASS/WARN/FAILED/BLOCKED status
- next safe action

No receipt may contain secrets, `.env` values, private customer data, provider
keys, cookies, or raw external prompt dumps.
