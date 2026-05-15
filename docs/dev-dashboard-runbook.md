# Developer Command Dashboard Runbook

## Purpose

`dev.sirinx.co` is the internal Developer Command Center for SIRINX OS. This scaffold is local-only and uses dry-run control actions until explicit approval is recorded.

## Local Start

```bash
node services/dev-control-api/server.mjs
node apps/dev-dashboard/server.mjs
```

Open:

```text
http://localhost:8710
```

## Required Gates

- CI passed.
- Secret scan clean.
- No internal URLs in public bundles.
- No localhost leaks in public deploy targets.
- Cloudflare Edge Gate passed before public deployment.
- Rollback path documented.
- Human approval present for staging or production writes.

## Never Auto Deploy

- `dev.sirinx.co`
- `studio.sirinx.co`
- `n8n.sirinx.co`
- `grafana.sirinx.co`
- API admin routes
- LiteLLM admin
- Dify admin
- Ollama
- vLLM
- MySQL
- Redis
- MCP servers

## Rollback Notes

1. Disable the deployment target.
2. Revert the last deployment.
3. Turn on emergency stop flags.
4. Confirm public sites remain safe.
5. Write an incident note.
