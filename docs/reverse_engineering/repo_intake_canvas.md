# Repo Intake Canvas - P000A_REPO_INTAKE_READONLY

Mission: `GC-SF-RE-OS-V1-20260701-001`

## Purpose

Inspect the current project shape, summarize stack, detect risk, and prepare an
OpenSpec entrypoint without changing product source files.

## Repo Shape

- Monorepo: yes.
- Package manager: pnpm.
- Primary language/runtime: Node.js / JavaScript / TypeScript, with some Python
  helper scripts.
- Workspaces: apps, services, packages.
- Project style: local-first command center and agentic build OS.
- Existing safety posture: approval-gated, dry-run-first, receipt-heavy.

## Detected Stack

- Frontend/app surfaces:
  - local developer dashboards
  - centerbrain shell
  - SIRINX site
  - content / enterprise / live agent studio surfaces
- Backend/service surfaces:
  - dev-control API
  - Hermes API
  - API gateway
  - LatentMAS gateway
- Tooling:
  - pnpm workspace
  - Vitest
  - Playwright
  - OpenSpec docs
  - GhostClaw A2A runtime files
  - Obsidian/Second Brain docs

## Risk Boundary

Green:

- read local docs
- summarize current repo
- create planning docs
- create OpenSpec drafts
- create validation plan, receipt, handoff, and brain notes

Yellow:

- code mutation after exact file lease and approval
- OpenCode review after provider/session gate
- 9Router/model gateway config after provider gate
- Logto/n8n/video-use/Stagehand/OpenClaw local setup after exact scoped gate

Red:

- secrets, `.env`, API keys, push, deploy, cloud mutation, production database
  migration, live customer sends, protected scraping, bypass workflows, dark web
  execution, credential extraction, blind install-all repos, GPU live inference

## First Safe Packet

`P000A_REPO_INTAKE_READONLY` is complete when source verification, reverse
engineering canvas, OpenSpec entrypoint, validation plan, receipt, and handoff
exist and parse/check cleanly.

## Next Packets

1. `P000B_SOURCE_VERIFICATION`
2. `P001_REVERSE_ENGINEERING_CANVAS`
3. `P002_OPENSPEC_PROPOSAL`
4. `P003_ARCHITECTURE_MAP`
5. `P004_BUILD_PACKET_BACKEND_CORE`
