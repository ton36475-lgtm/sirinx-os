---
name: sirinx-clawforge-demo-video
description: Prepare and validate SIRINX ClawForge demo video scripts without generating or uploading video.
---

# SIRINX ClawForge Demo Video Skill

Use this skill only for local demo video planning and validation.

## Allowed

- Read `examples/clawforge/*.yaml`.
- Validate that targets are localhost or demo-safe local URLs.
- Produce local approval notes.
- Run `node scripts/run-clawforge-dry-run.mjs`.

## Blocked Without Explicit Approval

- Running real `clawforge` video generation.
- Capturing screens with secrets, billing, API keys, private messages, or customer data.
- Uploading video.
- Publishing to Devpost or social channels.
- Calling external APIs or real MCP servers.

## Stop Point

PART 7.6 CLAWFORGE ADAPTER READY — LOCAL ONLY — WAITING FOR VIDEO GENERATION APPROVAL
