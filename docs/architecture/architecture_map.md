# Architecture Map - GhostClaw Senior Full-Stack Reverse Engineering OS V1

Mission: `GC-SF-RE-OS-V1-20260701-001`

## Master Architecture

```text
User / Android Hermes-agent / Telegram / Local Command
  -> Hermes Single Inbox
  -> Policy Guardian
  -> Source Intake + Verification
  -> Reverse Engineering Engine
  -> OpenSpec Source of Truth
  -> AI Second Brain / Knowledge Vault
  -> Task Packet Queue
  -> File Lease Manager
  -> Worker Dispatch
     - Codex Builder
     - OpenCode Reviewer
     - Validator Worker
     - Agency Agents Registry
     - 9Router Model Gateway
     - Logto Auth/RBAC Lane
     - n8n Workflow Lane
     - video-use Content Lane
     - Stagehand Local UAT Lane
     - OpenClaw / Hermes Android Companion Node
     - Optional GPU / Float16 Compute Lane
  -> Validation / Receipt / Audit
  -> Handoff Packet
  -> Knowledge Extraction Back to Second Brain
```

## Local Repo Architecture Observed

- `apps/`: product and dashboard surfaces.
- `services/`: local APIs, Hermes API, gateway, orchestration services.
- `packages/`: shared policy, content, security, logging, UI, and type modules.
- `docs/`: knowledge, architecture, runbooks, specs, research, and validation.
- `openspec/`: spec-first change proposals.
- `.ghostclaw_runtime/`: local runtime evidence and receipts.
- `_SECOND_BRAIN/`: local knowledge vault.

## Architecture Rule

No frontend/page implementation starts before the backend/domain model, service
logic, API contract, API route, API client, and state/hooks layers are defined
for the selected build target.
