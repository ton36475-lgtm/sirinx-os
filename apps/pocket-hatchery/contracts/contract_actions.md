# Pocket Hatchery Contract Actions

## Safe Actions (Green)

| Action | Description | Risk |
| --- | --- | --- |
| `mintCreature(catalog_id, to)` | Mint a creature from fixed catalog to recipient. Public path uses WAX Cloud Wallet. | Low |
| `hatch(creature_id)` | Advance egg to hatchling when incubation deadline reached. | Low |
| `nurture(creature_id)` | Add bond points; deterministic progress. | Low |
| `train(creature_id)` | Advance juvenile to adult after task threshold. | Low |
| `ascend(creature_id)` | Advance adult to elder after time/reputation threshold. | Low |
| `pause()` / `unpause()` | Owner emergency stop. Required for release gate. | Low |
| `shelter(creature_id, vault)` | Move creature to vault without state loss. | Low |

## Blocked Actions (Red)

| Action | Why Blocked |
| --- | --- |
| `lootBoxMint()` | Paid randomness = gambling risk. |
| `gambleForRarity()` | Chance-based rarity upgrade = gambling. |
| `cashOut()` | Real-money prize pool / cash-out = financial regulation risk. |
| `mintWithSecretSeed()` | Requires exposing signer seed. |

## Signer Policy

- `waxwing` signer is office-internal only during Sprint 1.
- Public demo uses WAX Cloud Wallet / My Cloud Wallet.
- No private key, seed phrase, or session token is stored in repo or memory.
