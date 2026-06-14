# Connector Capability Registry

Date: 2026-05-26
Status: local-only registry ready

## Purpose

Connector Capability Registry records which plugin surfaces are visible to Gateway Agent and which owner lane should review them. It does not activate connectors, call MCP servers, call paid APIs, read secrets, or send messages.

## Local API

```text
GET /api/connector-registry
POST /api/connector-registry/dry-run
```

Both routes return deterministic local JSON only.

## Owner Lane Map

| Owner | Connectors |
| --- | --- |
| shogun | Superpowers |
| planner | ClickUp, Figma, Canva |
| backend | OpenAI Developers |
| scribe | Notion, Google Drive, Spreadsheets, Documents, Presentations |
| qa | Computer Use, Chrome, Browser |
| devops | GitHub |
| security | Supabase |

## Boundary

Every connector record is non-activating:

```text
externalWrites=false
canActivate=false
canExecuteExternally=false
canRunMcp=false
canReadSecrets=false
requiresApproval=true
```

Telegram screenshots and plugin mentions are operator context only. They are not approval to activate connectors or send messages.

## Stop Point

```text
CONNECTOR REGISTRY READY LOCAL-ONLY - WAITING FOR HUMAN APPROVAL
```
