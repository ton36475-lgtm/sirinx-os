# Reverse Engineering Spec Template

## Problem

What needs to be understood, rebuilt, improved, or converted into a GhostClaw build packet?

## Users

- Founder/operator:
- Builder:
- Reviewer:
- Validator:

## Scope

### In Scope

- Source inventory.
- Verification checklist.
- Architecture and data-flow extraction.
- Spec and acceptance criteria.
- Local-safe Build Packet.
- Receipt and handoff.

### Out of Scope

- Live deploy, push, production mutation, provider call, and cloud mutation.
- Private customer data.
- Unauthorized third-party scanning.
- Credential handling.

## Requirements

| ID | Requirement | Priority | Validation |
|---|---|---|---|
| RE-001 | Capture allowed source list and access rights. | P0 | Source table complete |
| RE-002 | Distill architecture, data flow, contracts, UI, storage, and policy risks. | P0 | Packet sections complete |
| RE-003 | Produce exact allowed/forbidden file lease candidates. | P0 | Build packet lease present |
| RE-004 | Include local validation commands and receipt path. | P0 | Validator passes |
| RE-005 | Preserve blocked action list. | P0 | Policy checklist passes |

## Acceptance Criteria

- The packet is actionable by Codex without loading full chat history.
- The first build packet has exact files and validation commands.
- The reviewer can identify what was inferred versus confirmed.
- The validator can prove no blocked method is required.
