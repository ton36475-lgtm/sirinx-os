# SIRINX Local Full-Stack Setup

Status: local setup ready
Date: 2026-05-16

## Scope

This document covers local backend and frontend startup only.

Included services:

- Dev Control API backend
- Developer Command Center frontend
- Solar Intelligence app
- `sirinx.co` local static site

Not included:

- Cloudflare deployment
- DNS mutation
- Git push
- Real customer messaging
- Paid API calls
- Reading or creating real secrets

## Install

From the repository root:

```bash
cd /Users/sirinx/sirinx-os
pnpm install --frozen-lockfile
```

The lockfile is expected to be current. If it is not current, stop and review the dependency change before updating it.

## Start Everything

```bash
pnpm stack:start
```

This starts all local services in the background and writes logs under:

```text
ops/logs/
```

PID files are stored under:

```text
ops/pids/
```

## URLs

```text
Developer Command Center: http://127.0.0.1:8710
Dev Control API health:  http://127.0.0.1:8711/health
Solar Intelligence:      http://127.0.0.1:8720
Solar health:            http://127.0.0.1:8720/health
sirinx.co local site:    http://127.0.0.1:8730
```

## Control Commands

```bash
pnpm stack:status
pnpm stack:restart
pnpm stack:stop
pnpm stack:open
```

Foreground mode for debugging:

```bash
pnpm stack:foreground
```

## Individual Commands

Backend:

```bash
pnpm dev:api
```

Developer Command Center:

```bash
pnpm dev:dashboard
```

Solar Intelligence:

```bash
pnpm solar:dev
```

Public site:

```bash
pnpm site:dev
```

## Verification

Run before considering the local system ready:

```bash
pnpm verify
pnpm solar:check
pnpm solar:test
pnpm site:check
pnpm dashboard:e2e
```

Expected result:

- Syntax checks pass.
- Solar TypeScript checks pass.
- Solar tests pass.
- `sirinx.co` static build passes.
- Dashboard E2E passes in local mode.
- No source reads from `.env`.
- No cloud mutation.

## Safety Defaults

The local example environment keeps risky operations disabled:

```text
CLOUDFLARE_MUTATION_ENABLED=false
CUSTOMER_MESSAGE_SEND_ENABLED=false
PAID_API_CALLS_ENABLED=false
PUBLIC_AI_EXPOSURE_ENABLED=false
DESTRUCTIVE_MCP_TOOLS_ENABLED=false
```

Only `.env.example` should be committed. Real `.env` files remain ignored and must not be printed or copied into logs.
