# Decision Rule - Reverse Engineering To Build

Mission: `GC-SF-RE-OS-V1-20260701-001`

## Rule

Every input must pass through:

```text
Source -> Verify -> Reverse Engineer -> Spec -> Architecture
-> Knowledge Vault -> Build Packet -> Validate -> Receipt -> Handoff -> Learn
```

## Meaning

Reverse engineering is a comprehension and planning process. It maps
architecture, data flow, API, UX, auth, state, workers, storage, and risk into a
spec-first build packet.

## Boundary

Reverse engineering is not bypass, credential extraction, protected scraping,
malware reversing, dark web execution, or source theft.

## Build Gate

Build starts only after OpenSpec, architecture, API contract, validation plan,
file lease, and receipt requirements are satisfied for one scoped target.
