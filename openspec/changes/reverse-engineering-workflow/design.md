# Design: Reverse Engineering Workflow

## Architecture

The workflow is a documentation and packet-generation lane. It produces artifacts that later builder lanes can consume without needing full chat history or raw source dumps.

```mermaid
flowchart TD
  A[Source] --> B[Verify]
  B --> C[Reverse_Engineer]
  C --> D[Spec]
  D --> E[Architecture]
  E --> F[Knowledge_Vault]
  F --> G[Build_Packet]
  G --> H[Validate]
  H --> I[Receipt]
  I --> J[Handoff]
```

## Boundaries

- Researcher owns source inventory, verification, and extraction.
- Policy Guardian owns blocked action review.
- Validator owns local proof.
- Hermes owns next packet routing.
- Codex only builds after a separate file lease.

## Validation

The local validator checks required files, required flow phases, required Build Packet fields, and risky instruction patterns.
