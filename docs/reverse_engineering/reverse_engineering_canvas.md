# Reverse Engineering Canvas - Master Template

Mission: `GC-SF-RE-OS-V1-20260701-001`

## Definition Lock

Reverse engineering in this system means decomposing a repo, tool, product,
workflow, screenshot, or document to understand architecture, data flow, API,
UX, auth, state, workers, storage, security boundaries, and policy risk.

It converts that understanding into a spec, build plan, OpenSpec packet,
knowledge note, and senior full-stack implementation map.

It does not mean bypassing systems, extracting credentials, defeating anti-bot
controls, scraping protected sites, reverse malware work, stealing source code,
or running OSINT/dark web/security workflows without explicit scope.

## Analysis Lanes

| Lane | Questions | Output |
|---|---|---|
| Architecture | What are the bounded contexts, apps, services, packages, queues, and runtime surfaces? | `docs/architecture/architecture_map.md` |
| Data Flow | What data enters, where is it stored, and what leaves? | API and domain schema drafts |
| API | What contracts must exist before frontend wiring? | `docs/api/api_contract.md` |
| Auth | What identity/RBAC boundary is needed? | Logto/Auth lane proposal |
| State | What client/server state must be modeled? | `docs/frontend/frontend_state_and_pages.md` |
| Workers | Which agent/worker lanes operate and under what leases? | worker map and handoff |
| Storage | What storage is local, cloud, or user-controlled? | database/domain plan |
| Security | What actions are green/yellow/red? | policy and validation plan |
| Knowledge | What should return to the Second Brain? | project memory and wisdom notes |

## Current P000A Finding

The repo is already a broad agentic monorepo with many local command-center,
dashboard, policy, and agent artifacts. The correct next step is not installing
more tooling. It is consolidating the master plan into OpenSpec and building
only after source verification, architecture, API contract, validation, and
receipt gates are present.
