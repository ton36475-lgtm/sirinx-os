# Full-Stack Godmode Bundle

Status: compatibility pointer; this file is not a Hermes skill entrypoint.

The canonical bundle is:

`configs/hermes/skill-bundles/full-stack-godmode.yaml`

Its six progressive-disclosure skills are:

1. `repo-intake-quarantine`
2. `codebase-cartographer`
3. `authorized-reverse-engineering`
4. `system-design-architect`
5. `senior-fullstack-builder`
6. `evidence-verifier`

In this bundle, godmode means deeper engineering rigor and evidence. It never
means unrestricted authority. Wildcard targets, generic approve-all wording,
and action-only deploy tokens are invalid.

Implementation, install, provider calls, live sends, Git pushes, preview
deploys, production deploys, and rollback are separate actions. Each external
action needs a task-specific gate that names the exact target, scope, operation,
approver, approval time, and expiry. Secret reads are prohibited.

Run the deterministic local bundle checks with:

```bash
node --test tests/skills/full-stack-godmode/*.test.mjs
```

Passing local checks proves the bundle structure and policy fixtures only. It
does not prove runtime activation, provider execution, or deployment.
