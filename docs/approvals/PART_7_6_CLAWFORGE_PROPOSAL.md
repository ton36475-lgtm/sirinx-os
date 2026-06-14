# Part 7.6 ClawForge Proposal

Status: local-only proposal.

## Objective

Prepare SIRINX Mission Control demo-video-as-code artifacts that can later generate a short evidence video after explicit approval.

## Current Local Artifacts

- `examples/clawforge/sirinx-mission-control-demo.yaml`
- `packages/clawforge-adapter/src/validateDemoSpec.mjs`
- `scripts/run-clawforge-dry-run.mjs`
- `skills/sirinx-clawforge-demo-video/SKILL.md`
- `docs/integrations/CLAWFORGE_ADAPTER_PLAN.md`

## Safety Gates

- YAML must remain `mode: validate-only`.
- Allowed targets are `localhost` and `127.0.0.1`.
- No billing, secret, API key, private message, customer data, or external upload scenes.
- Real video generation requires a separate approval command.

## Verification

```bash
node scripts/run-clawforge-dry-run.mjs
pnpm clawforge:dry-run
```

## Stop Point

PART 7.6 CLAWFORGE ADAPTER READY — LOCAL ONLY — WAITING FOR VIDEO GENERATION APPROVAL
