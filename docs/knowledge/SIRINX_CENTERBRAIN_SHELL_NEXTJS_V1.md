# SIRINX CenterBrain Shell Next.js v1

Status: local-only shell ready
Date: 2026-05-27

## Purpose

CenterBrain Shell is a separate Next.js + Tailwind UI layer for the existing SIRINX local command center. It consumes the proven dev-control API contract instead of replacing `apps/dev-dashboard` or `services/dev-control-api`.

## Local Surfaces

```text
apps/centerbrain-shell
GET  /api/centerbrain-hub
POST /api/centerbrain-hub/sync/dry-run
```

The shell proxies only to the local dev-control API at `http://127.0.0.1:8711` by default.

## Guardrails

- No agent command execution.
- No connector activation.
- No real MCP startup.
- No package install from the UI.
- No paid API call.
- No deploy, push, or publish.
- No secret read or print.
- No device remote control.

## Verification

```bash
pnpm centerbrain-shell:test
pnpm centerbrain-shell:check
```

## Stop Point

```text
CENTERBRAIN SHELL READY - LOCAL ONLY - WAITING FOR UI SMOKE APPROVAL
```
