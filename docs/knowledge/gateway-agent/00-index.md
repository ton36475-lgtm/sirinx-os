# Gateway Agent Knowledge Index

Date: 2026-05-26
Status: local-only control contract
Scope: Codex, Hermes TUI, Gemini CLI, A2A2LoopSync, and 47 Ronin lane routing

## Purpose

Gateway Agent is the coordinator above the existing Local Vibe Coding Agent. It does not replace the Vibe Agent, Hermes Inbox, SOC monitor, truth protocol, or external gate runner. It reads those local contracts and turns a human goal into safe part assignments, evidence requirements, and an approval stop point.

## Local API

```text
GET /api/gateway-agent
POST /api/gateway-agent/plan/dry-run
```

Both routes are local-only and non-executing. They return JSON state and dry-run plans only.

## Integrated Flow

```text
Human Goal
-> Gateway Agent
-> Local Vibe Coding Agent
-> 47 Ronin lane assignment
-> Hermes Inbox dry-run
-> A2A2LoopSync evidence packet
-> Knowledge split
-> Verify
-> Approval Packet
-> Stop
```

## Knowledge Split

- `01-runtime-contract.md`: runtime lanes and status rules.
- `02-a2a2loopsync.md`: work loop, knowledge loop, and packet barrier.
- `03-agent-team-parts.md`: owner split for the implementation team.
- `04-cli-boundaries.md`: Codex, Hermes TUI, Gemini CLI, and A2A boundaries.
- `05-approval-gates.md`: blocked actions and approval stop rules.
- `06-ai-team-pairing.md`: all-team local pairing contract and messaging boundary.
- `07-connector-registry.md`: local plugin capability registry and owner lane map.
- `08-local-rag-turbovec.md`: full repo safe-text RAG prototype and optional turbovec runtime boundary.
- `09-hermes-image-edit.md`: caption-bound image-to-image edit contract and acceptance packet.
- `10-agent-launch-gate.md`: Ollama launch command registry, manual smoke gate, and no-auto-execute policy.
- `11-agent-driver.md`: local smoke driver, result classifications, and no-real-agent-work boundary.
- `12-centerbrain-hub.md`: A2A2 adaptive sync hub for AI nodes, devices, connectors, and stack lanes.
- `13-centerbrain-shell.md`: Next.js + Tailwind shell that consumes the existing local CenterBrain API.
- `14-hermes-agent-audit.md`: Hermes messaging gateway audit and manual restart approval packet.
- `15-repo-intake-gate.md`: third-party Git repo and skill intake gate before clone, install, postinstall, or execution.
- `16-team-runtime-bridge.md`: local-only Hermes team, Qwen OpenRouter, Antigravity, and A2A2A runtime bridge.
- `17-openrouter-qwen-adapter.md`: server-side OpenRouter Qwen adapter dry-run contract.
- `18-spec-first-swarm.md`: live `.hermes` state, spec-first workflow docs, approval phrase, and no-code-before-spec gate.
- `19-adaptive-command-gateway.md`: Telegram fast ACK, structured parser, queue preview, mission object, and no-send/no-provider dry-run gate.

## Verification

```bash
pnpm gateway-agent:test
pnpm ai-team-pairing:test
pnpm connector-registry:test
pnpm local-rag:test
pnpm hermes-image-edit:test
pnpm hermes-agent-audit:test
pnpm agent-launch-gate:test
pnpm agent-driver:test
pnpm centerbrain-hub:test
pnpm repo-intake-gate:test
pnpm team-runtime-bridge:test
pnpm openrouter-qwen-adapter:test
pnpm spec-first-swarm:test
pnpm adaptive-command-gateway:test
pnpm centerbrain-shell:test
pnpm dashboard:e2e
pnpm wiring:check
pnpm audit:secrets
```
