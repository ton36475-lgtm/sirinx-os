# OpenSpec Spec-Driven Workflow Assessment

Tool: `Fission-AI/OpenSpec`
Lane: `SPEC_DRIVEN_WORKFLOW`
Default Gate: `GREEN_FOR_REFERENCE`, `YELLOW_FOR_IMPORT`

## Source Snapshot

OpenSpec is positioned as a spec-driven workflow for AI coding assistants. The
current upstream release observed during planning was newer than the reposted
claim, so GhostClaw should treat social post versions as drift-prone.

## GhostClaw Fit

Useful for:

- proposal-before-code workflow
- separating requirements, design, specs, and tasks
- reducing AI coding drift
- aligning Hermes/Codex packet planning with acceptance criteria

Blocked by default:

- installing OpenSpec
- rewriting existing GhostClaw spec folders
- replacing current receipt gates
- letting generated specs override Policy Guardian

## Recommended Adoption

Adopt the workflow concept first: explore, propose, apply. Use it as a planning
pattern, not a required dependency, until a separate install/import gate exists.
