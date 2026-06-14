# ClawForge Adapter Plan

Current status: validate-only local package.

Purpose:

```text
Mission Control local demo -> YAML script -> validation -> approval -> optional MP4 generation
```

Current implementation:

- Example script: `examples/clawforge/sirinx-mission-control-demo.yaml`
- Adapter package: `packages/clawforge-adapter/`
- Local validator: `scripts/run-clawforge-dry-run.mjs`
- Skill guide: `skills/sirinx-clawforge-demo-video/SKILL.md`
- Approval proposal: `docs/approvals/PART_7_6_CLAWFORGE_PROPOSAL.md`
- No real ClawForge execution.
- No MP4 generation.
- No upload.
- No external network.

Approval required before:

- running `clawforge examples/clawforge/sirinx-mission-control-demo.yaml`
- recording real browser screens
- exporting MP4
- uploading to Devpost or social channels
