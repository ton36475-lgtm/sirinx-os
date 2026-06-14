# SIRINX CenterBrain Hub v1

Status: local-only control plane ready
Mode: A2A2 adaptive sync hub
Date: 2026-05-27

## Purpose

CenterBrain Hub v1 connects the existing SIRINX local control layers into one governed hub for AI nodes, device nodes, connector lanes, and stack lanes. It is a status, evidence, and dry-run planning layer only.

## Local API

```text
GET /api/centerbrain-hub
POST /api/centerbrain-hub/sync/dry-run
```

Both routes return JSON only. They do not activate Figma, Canva, ClickUp, Supabase, GitHub, Browser, Chrome, MCP, messaging gateways, mobile push, PC pairing, provider APIs, or deploy actions.

## Nodes

AI nodes come from Agent Driver:

```text
codex
claude-code
hermes-agent
codex-app
openclaw
opencode
copilot-cli
droid
pi
```

Device nodes:

```text
mac: active local host
pc: planned manual pairing
mobile: planned control client
```

Stack lanes:

```text
Next.js: future shell
Tailwind: future design system
HTML: current dashboard markup
JavaScript: current dashboard runtime
Go: future agent runtime
Node.js Local API: active API contract
A2A2 Adaptive Sync: active evidence loop
```

## Sync Handshake

```text
discover -> classify -> dry-run -> evidence -> approval -> manual-activation
```

## Blocked Actions

- deploy
- push
- publish
- external connector activation
- real MCP execution
- paid API call
- secret read or print
- customer message send
- production database write
- Telegram send
- LINE send
- connector auto-run
- device remote control
- mobile push notification
- package install

## Next Safe Step

Build a separate Next.js/Tailwind shell only after the current local dashboard contract stays green. The existing HTML/JavaScript dashboard remains the active CenterBrain surface for v1.

## Stop Point

```text
CENTERBRAIN HUB READY LOCAL-ONLY - WAITING FOR HUMAN APPROVAL
```
