# LatentMAS Gateway

Node.js service wrapping the LatentMAS Rust orchestrator for integration with SIRINX OS.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health |
| GET | `/ready` | Rust CLI + Python backend readiness |
| GET | `/version` | Version info |
| GET | `/status` | Subsystem status with gates |
| POST | `/run` | Run a single question (dry-run by default) |
| POST | `/bench` | Run benchmark sweep (dry-run by default) |
| GET | `/doctor` | Diagnostic check |
| GET | `/audit` | Recent audit events |

## Safety

- **Dry-run by default** — all inference blocked unless `LATENTMAS_LIVE_ENABLED=true`
- Audit log for every action
- `correlation_id` on every request (auto-generated if not provided via `X-Correlation-Id` header)
- No secrets exposed
- No external writes
- No customer messaging
- Local GPU only — never public

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LATENTMAS_GATEWAY_PORT` | `3700` | HTTP port |
| `LATENTMAS_GATEWAY_HOST` | `localhost` | Bind host |
| `LATENTMAS_BIN` | `../../research/latentmas/target/debug/katgpt-latentmas` | Rust CLI path |
| `LATENTMAS_PYTHON_PATH` | `../../research/latentmas/python` | Python backend path |
| `LATENTMAS_LIVE_ENABLED` | `false` | Enable live inference (requires human approval) |

## Start

```bash
node services/latentmas-gateway/server.mjs
```

## Integration with dev-control-api

This service is designed to be registered in `dev-control-api` as a subsystem
status endpoint, following the same pattern as other SIRINX OS services.