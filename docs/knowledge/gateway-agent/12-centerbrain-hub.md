# CenterBrain Hub

Status: local-only A2A2 adaptive sync hub

## Purpose

CenterBrain Hub joins Gateway Agent, Connector Registry, Agent Driver, and device planning into one local command-center layer. It is not a live connector orchestrator. It is a local evidence and dry-run surface.

## Local API

```text
GET /api/centerbrain-hub
POST /api/centerbrain-hub/sync/dry-run
```

## Active Inputs

- Agent Driver for AI node classifications.
- Connector Registry for Figma, Canva, ClickUp, Supabase, GitHub, Browser, Chrome, and related connector lanes.
- Local dashboard/API for current HTML and JavaScript control surface.
- A2A2 evidence loop for dry-run sync state.

## Stack Policy

- Current v1 surface: HTML, JavaScript, Node.js local API.
- Planned next shell: Next.js and Tailwind.
- Planned worker lane: Go.
- No package install or app scaffold from CenterBrain v1.

## Device Policy

- Mac is the only active local host.
- PC requires a pairing evidence packet.
- Mobile requires a control-client approval packet.
- No remote control, push notifications, or cross-device sync activation from the API.

## Stop Point

```text
CENTERBRAIN HUB READY LOCAL-ONLY - WAITING FOR HUMAN APPROVAL
```
