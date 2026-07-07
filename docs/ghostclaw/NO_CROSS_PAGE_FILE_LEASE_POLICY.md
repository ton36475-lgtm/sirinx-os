# No Cross-Page File Lease Policy

Mission ID: `GC-MAXPLUS-GLM52-LAYERED-LOCK-20260630-001`

## Policy

Only one page file may be leased and edited in a page packet. A page packet must
finish validation and write a receipt before another page lock opens.

## Page Candidates

- `apps/centerbrain-shell/app/god-mode/page.tsx`
- `apps/centerbrain-shell/app/page.tsx`
- `apps/centerbrain-shell/app/pocket-hatchery/page.tsx`
- `apps/solar-intelligence/src/ui/page.ts`

## Lock Requirements

Each page lease requires:

- `lease_id`
- `mission_id`
- `layer_id`
- `file_path`
- `owner_agent`
- `created_at`
- `expires_at`
- `expected_action`

Release requires:

- page receipt
- validation status
- git diff stat proving one-page scope
- checksum

If any other page changes during the packet, stop and write a conflict receipt.
