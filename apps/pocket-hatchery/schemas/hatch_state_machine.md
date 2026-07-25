# Pocket Hatchery Hatch/Evolve State Machine

## Overview

State transitions are **deterministic** and triggered by observable, on-chain or off-chain conditions. There is no paid randomness, loot box, or gambling mechanic.

## States

```text
[egg] -> [hatchling] -> [juvenile] -> [adult] -> [elder]
```

## Transitions

| From | To | Trigger | Verifiable Condition |
| --- | --- | --- | --- |
| `egg` | `hatchling` | `hatch()` | `block.timestamp >= incubation_deadline` |
| `hatchling` | `juvenile` | `nurture()` | `bond_points >= threshold` AND `task_count >= threshold` |
| `juvenile` | `adult` | `train()` | `completion_tasks >= threshold` AND no cooldown active |
| `adult` | `elder` | `ascend()` | `time_held_days >= threshold` AND `reputation_score >= threshold` |

## Guards

- Transitions cannot be reversed.
- A creature can be `paused` by the contract owner; while paused, no transitions occur.
- A user can `shelter` a creature (transfer to vault) without losing state.
- Burning a creature is explicit and emits `CreatureBurned(creature_id, reason)`.

## No-Randomness Policy

- No `random()`, `VRF`, or oracle entropy is used to determine outcomes.
- Rarity is assigned at mint time from a fixed catalog and does not change.
- Rewards, if any, are deterministic multiples of input effort, not chance.
