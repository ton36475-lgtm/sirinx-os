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
- PC is a planned LAN worker node for local-only marketing dry-runs and autocut preparation.
- PC requires a pairing evidence packet before any sync. The packet must include hostname, local IP, reachable local ports, allowed folders, operator owner, and blocked external actions.
- Mobile requires a control-client approval packet.
- No remote control, push notifications, or cross-device sync activation from the API.

## LAN PC Marketing Worker

Allowed before separate approval:

- Build GHOSTCLAW Autoflow task packets.
- Prepare local marketing briefs, checklists, asset manifests, and evidence reports.
- Prepare autocut cut lists, caption drafts, render-intent packets, and upload checklists.
- Prepare a Gemini Daily Report packet for manual Gemini CLI review.

Blocked until separate approval:

- Running Gemini CLI automatically.
- Running Autoflow against a live platform.
- Rendering, exporting, or uploading Autocut output.
- Publishing, scheduling, boosting, or buying ads.
- Sending LINE, Telegram, email, SMS, DM, or customer replies.
- Reading secrets, tokens, cookies, `.env` files, browser sessions, or credential backups.
- Remote desktop/device control from CenterBrain.

## Marketing Automation Lanes

```text
gemini-daily-report      manual review packet only
ghostclaw-autoflow       dry-run task planner only
autocut-prep             dry-run cut list and asset manifest only
online-marketing-platform blocked adapter intent only
```

## Stop Point

```text
CENTERBRAIN HUB READY LOCAL-ONLY - WAITING FOR HUMAN APPROVAL
```
