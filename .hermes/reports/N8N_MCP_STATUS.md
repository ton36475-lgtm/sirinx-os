# n8n / n8n-mcp Status

## Timestamp
2026-05-28 01:01:03 +07

## Local Observations
- `n8n` command: missing
- Port `5678`: listening on `127.0.0.1:5678`
- Listener owner: `OrbStack`
- HTTP check: `200 OK`
- `n8n-mcp` command: `/opt/homebrew/bin/n8n-mcp`

## Interpretation
- A web service is reachable at `http://127.0.0.1:5678`, likely via OrbStack, but the local shell does not expose an `n8n` command.
- `n8n-mcp` is installed on the Mac host, but it was not started or registered with Hermes in this pass.
- No n8n API key, webhook secret, or workflow credential was read.

## Official Docs Constraints
- n8n npm installation requires Node.js between `20.19` and `24.x`, inclusive.
- Current host Node is `v26.0.0`, which is outside that npm-supported range for n8n.
- Therefore, any future local n8n install should use an isolated runtime such as Docker/OrbStack, a compatible Node version, or a documented existing n8n container.

## Blocked Until Approval
- Install n8n locally: requires `APPROVE_N8N_LOCAL_INSTALL`.
- Register `n8n-mcp` in Hermes: requires `APPROVE_HERMES_N8N_MCP_REGISTER`.
- Read or write n8n credentials: blocked; use `.hermes/secrets/n8n.env` only after explicit approval and never paste secrets into chat.

## Safe Next Step
Create a read-only n8n capability manifest from non-secret command help and service status only. Do not connect to workflows or mutate n8n until the MCP permission mapping is approved.

## V4 Refresh - 2026-05-28 01:09 +07
- `n8n` CLI remains missing on host PATH.
- Port `5678` remains reachable on `127.0.0.1` with `200 OK`.
- Listener owner remains `OrbStack`.
- `n8n-mcp` remains available at `/opt/homebrew/bin/n8n-mcp`.
- No n8n credential, workflow secret, API key, or MCP config was read or written.

## Capability Manifest - 2026-05-28 02:08 +07
- Created `.hermes/reports/N8N_CAPABILITY_MANIFEST_2026-05-28.md`.
- Captured only localhost reachability, command path, symlink version, and blocked/allowed capability classes.
- `n8n-mcp --help` and `n8n-mcp --version` did not print useful visible output in this pass.
- Registration remains blocked until `APPROVE_HERMES_N8N_MCP_REGISTER`.
