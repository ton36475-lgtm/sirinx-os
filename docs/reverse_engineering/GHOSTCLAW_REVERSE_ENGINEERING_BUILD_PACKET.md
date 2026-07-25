# GhostClaw Reverse Engineering Build Packet

## Purpose

Turn a repo, tool, workflow, screenshot, or document into an implementation-ready packet without unsafe probing, protected scraping, credential handling, or live system mutation.

## Canonical Flow

`Source -> Verify -> Reverse_Engineer -> Spec -> Architecture -> Knowledge_Vault -> Build_Packet -> Validate -> Receipt -> Handoff`

## Operating Rules

- Research only until a separate build lease is opened.
- Use public, owner-provided, or locally available sources only.
- Do not scan third-party systems, defeat access controls, handle credential material, or process customer data.
- Convert large raw input into distilled notes before adding long-term memory.
- Every Build Packet must include scope, assumptions, target artifacts, blocked actions, validation commands, receipt path, and handoff owner.

## Required Artifacts

| Phase | Artifact | Path |
|---|---|---|
| Source | Source inventory | `docs/reverse_engineering/source_inventory.md` or packet section |
| Verify | Verification checklist | `docs/reverse_engineering/validation_checklist.md` |
| Reverse_Engineer | Component and data-flow map | packet section |
| Spec | Requirement/spec template | `docs/specs/reverse-engineering-workflow/SPEC_TEMPLATE.md` |
| Architecture | ADR template | `docs/reverse_engineering/adr_template.md` |
| Knowledge_Vault | Memory update plan | packet section |
| Build_Packet | Markdown + YAML templates | `docs/reverse_engineering/build_packet.template.*` |
| Validate | Local validation checklist | `docs/reverse_engineering/validation_checklist.md` |
| Receipt | Receipt template | `docs/reverse_engineering/receipt_template.json` |
| Handoff | Handoff protocol | `docs/reverse_engineering/handoff_protocol.md` |

## Build Packet Minimum

1. Mission ID and owner.
2. Source list and access rights.
3. Verification result and unknowns.
4. Extracted architecture, data flow, API contracts, UI states, and policy risks.
5. Spec summary and acceptance criteria.
6. Build sequence with exact file lease candidates.
7. Validation commands that can run locally without new installs.
8. Receipt and handoff instructions.

## Stop Conditions

- Source requires login, paid access, scraping, private customer data, or credentials.
- The requested output enables bypassing access controls or impersonation.
- A build step requires deploy, push, migration, provider call, or cloud mutation without a separate gate.
