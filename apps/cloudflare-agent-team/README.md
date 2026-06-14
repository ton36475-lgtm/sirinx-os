# SIRINX Cloudflare Agent Team

Status: LOCAL MOCK PROTOTYPE - NOT DEPLOYABLE

This folder reserves the future Cloudflare Edge Agent Team app for SIRINXDev Unified Agent-Native OS v8.2.

## Current Boundary

- No Cloudflare dependencies installed.
- No Worker deployed.
- No Cloudflare resources created.
- No secrets required.
- `wrangler.toml.example` is documentation only.
- Local mock runner: `pnpm cloudflare-agent-team:demo`
- Local tests: `pnpm cloudflare-agent-team:test`

## Initial Agents

- `EdgeOrchestratorAgent`
- `ComplianceGuardAgent`
- `EvidencePackagerAgent`
- `ResearchAgent`
- `SEOAEOAgent`
- `DeploymentPlannerAgent`
- `NotificationDraftAgent`
- `MemoryWriterAgent`

## Required Gate

Local mock implementation is approved only for `CF_LOCAL_AGENT_PROTOTYPE_001`.

Deployment, DNS, Access policy writes, D1/R2/Queue/Vectorize creation, AI Gateway mutation, Remote MCP registration, and secrets remain blocked behind `PRE_APPROVAL_PACKET_CLOUDFLARE_DEV`.
