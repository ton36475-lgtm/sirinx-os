# Pocket Hatchery Read-Only Viewer

## Concept

Static, read-only creature viewer that loads `apps/pocket-hatchery/schemas/sample_creatures.json` at build time.

## Route

`/pocket-hatchery`

## Features

- List all sample creatures with family, rarity, stage, and deterministic flag.
- Show evolution chain.
- No wallet mutation; connect button routes to WAX Cloud Wallet OAuth only.
- No paid randomness.

## Implementation Status

- [x] Sample data exists.
- [x] Wallet flow documented.
- [ ] Next.js page component (pending packet_010).
