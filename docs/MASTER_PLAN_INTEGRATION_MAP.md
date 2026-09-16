# Master Plan Integration Map

## The Flow

```
Source -> Verify -> Reverse_Engineer -> Spec -> Architecture -> Knowledge_Vault -> Build_Packet -> Validate -> Receipt -> Handoff
```

Every project must enter through this flow. No skipping phases.

## Reusable Reverse Engineering Packet

The canonical packet templates now live in:

- `docs/reverse_engineering/GHOSTCLAW_REVERSE_ENGINEERING_BUILD_PACKET.md`
- `docs/reverse_engineering/build_packet.template.md`
- `docs/reverse_engineering/build_packet.template.yaml`
- `docs/specs/reverse-engineering-workflow/SPEC_TEMPLATE.md`
- `openspec/changes/reverse-engineering-workflow/`

Use these artifacts when a source needs to become an implementation plan. The output must remain research/spec/packet only until Hermes opens a separate build lease.

## How Registries Support Each Phase

| Phase | Registry Support | Key Action |
|-------|-----------------|------------|
| **Source** | Project Registry | Identify project scope, domain, constraints, and retrieval keys |
| **Verify** | Knowledge Vault Index | Locate existing docs, evidence, prior receipts, and related work |
| **Reverse_Engineer** | Route Matrix | Assign `research_reverse_engineering` route; identify primary agent |
| **Spec** | Domain Pack Index | Apply project-specific rules, design tokens, brand copy, constraints |
| **Architecture** | Agent Registry | Identify architect lane (Opus); pull architecture patterns |
| **Knowledge_Vault** | Knowledge Vault Index + Retrieval Protocol | Retrieve only needed artifacts; create mission envelope |
| **Build_Packet** | Route Matrix | Assign build lane (Codex) and reviewer (OpenCode); scope the lease |
| **Validate** | Agent Registry | Assign Validator agent; run schema, lint, and receipt checks |
| **Receipt** | Policy Layer | Enforce receipt requirements; verify lease closure and validation |
| **Handoff** | Agent Registry | Hermes control plane takes over; writes final report; closes queue item |

## Action Tier Decision Tree

```
Is the action read-only (inspect, search, diff)?
  YES -> Tier A (no lease needed)
  NO -> Is the action limited to doc/config (YAML, markdown, JSON, env)?
    YES -> Tier B (lease + diff + receipt)
    NO -> Is the action code or script (source files, validators)?
      YES -> Tier C (lease + diff + validator + receipt)
      NO -> Is the action high-impact (install, deploy, migrate, send)?
        YES -> Tier D (blocked by default; Policy Guardian approval required)
        NO -> Tier X (forbidden; do not attempt)
```

## Agent Lane Decision Matrix

| Task Type | Primary | Reviewer | Architect | Validator |
|-----------|---------|----------|-----------|-----------|
| `project_bootstrap` | Hermes | OpenCode | Opus | Validator |
| `research_reverse_engineering` | Researcher | OpenCode | Opus | Validator |
| `architecture_design` | Opus | OpenCode | — | Validator |
| `spec_writing` | Hermes | OpenCode | Opus | Validator |
| `frontend_ui` | Codex | OpenCode | Opus | Validator |
| `backend_api` | Codex | OpenCode | Opus | Validator |
| `public_site_ui` | Codex | OpenCode | Opus | Validator |
| `dashboard_ui` | Codex | OpenCode | Opus | Validator |
| `documentation` | Hermes | OpenCode | — | Validator |
| `policy_config` | Policy Guardian | OpenCode | — | Validator |
| `queue_operation` | Hermes | OpenCode | — | Validator |
| `code_review` | OpenCode | — | — | Validator |
| `data_migration` | Codex | OpenCode | Opus | Validator |
| `incident_response` | Hermes | Policy Guardian | Opus | Validator |

## Lane Isolation Rules

- No agent can be both requester and approver on the same task.
- Codex is the only builder unless a separate lease grants mutation rights to another agent.
- OpenCode reviews but never mutates.
- Hermes routes but never mutates source files.
- Policy Guardian approves D-tier but never executes.
- Validator validates but never builds or routes.
