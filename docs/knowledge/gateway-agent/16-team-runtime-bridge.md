# 16 - Team Runtime Bridge

Status: READY LOCAL-ONLY

This Gateway Agent extension connects local AI Team Pairing to Qwen 3.7 Max on OpenRouter and an Antigravity CLI watch lane.

## Runtime Lanes

- Codex Control: active local implementation and verification
- Hermes Agent Team: manual only, blocked until 64k context window
- Qwen 3.7 Max OpenRouter: model-routing approval lane only
- Antigravity CLI Watch: source-required watch lane only
- A2A2A Evidence Loop: local provenance and approval packets

## API

- `GET /api/team-runtime-bridge`
- `POST /api/team-runtime-bridge/plan/dry-run`

## Safety Contract

The bridge never:

- executes Antigravity CLI
- installs packages
- reads or prints OpenRouter keys
- calls paid APIs
- starts Hermes team routing
- starts MCP servers
- sends messages
- deploys, pushes, or publishes

## Next Approval

Required approval before real model use:

`OpenRouter Qwen 3.7 Max provider call approval`

Stop point:

`TEAM RUNTIME BRIDGE READY - LOCAL ONLY - WAITING FOR MODEL ROUTING APPROVAL`

