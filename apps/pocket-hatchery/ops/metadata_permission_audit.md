# Pocket Hatchery Metadata Permission Audit

Date: 2026-06-29
Mode: local-only evidence, no deploy, no real wallet write

## Evidence Summary

- Metadata manifest schema exists at `apps/pocket-hatchery/schemas/metadata_manifest.schema.json`.
- Creature catalog sample data exists at `apps/pocket-hatchery/schemas/sample_creatures.json`.
- Sample creatures are deterministic and do not depend on paid randomness, loot boxes, cash-out, or hidden prize mechanics.
- Metadata URI values are display-only in the read-only viewer.
- No metadata upload, IPFS pin mutation, chain mutation, or remote storage write was executed.

## Local Permission Rules

| Surface | Permission | Status |
| --- | --- | --- |
| `metadata_manifest.schema.json` | schema definition only | allowed local |
| `sample_creatures.json` | sample catalog input | allowed local |
| `/pocket-hatchery` route | read-only render | allowed local |
| IPFS pinning | external write | blocked |
| on-chain metadata update | chain write | blocked |
| signer material | private credential | blocked |

## Local Verification

```text
python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_pocket_hatchery_v4
./node_modules/.bin/vitest run apps/centerbrain-shell/src/lib/pocket-hatchery.test.ts
```

## Boundaries

- local-only evidence.
- no deploy.
- no real wallet write.
- no IPFS pin write.
- no chain mutation.
- no hidden loot table.
- no paid randomness.
- no cash-out mechanic.
