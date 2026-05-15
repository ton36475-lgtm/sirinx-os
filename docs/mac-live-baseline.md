# Mac Live Baseline

Generated from the current recovery pack on 2026-05-12.

## Known Good State

- Mac mini live test: passed.
- SIRINX Live Agent Studio MVP: works locally.
- Operating protocol: `AGENTS.md`.
- Current mode: Production Hardening.

## Local Constraints

- No deploy.
- No Git push.
- No cloud mutation.
- No edits to real `.env`.
- No real secrets.
- No paid API calls.
- No customer messages.
- No public exposure for local AI, admin routes, MCP servers, n8n, Grafana, Ollama, vLLM, MySQL, or Redis.

## Freeze Checklist

- [ ] Confirm local dashboard loads.
- [ ] Confirm control API returns health.
- [ ] Confirm all external actions remain dry-run.
- [ ] Confirm `.env.example` has only placeholders.
- [ ] Confirm no public URL is configured for internal apps.
- [ ] Record human approval before staging work begins.
