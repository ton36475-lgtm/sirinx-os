# n8n Capability Manifest - 2026-05-28

Generated: 2026-05-28 02:08:25 +0700
Mode: read-only, local-only, no credential access, no workflow mutation

## Discovery Summary

| Item | Status | Evidence |
| --- | --- | --- |
| n8n web service | Reachable | `http://127.0.0.1:5678` returned `200 OK`; `/healthz` returned `{"status":"ok"}` |
| n8n CLI | Missing on host PATH | `command -v n8n` produced no path |
| n8n-mcp command | Available | `/opt/homebrew/bin/n8n-mcp` |
| n8n-mcp package path | Homebrew symlink | `/opt/homebrew/bin/n8n-mcp -> ../Cellar/n8n-mcp/2.56.0/bin/n8n-mcp` |
| n8n-mcp runtime type | Node script | `file /opt/homebrew/bin/n8n-mcp` reports Node script text executable |
| n8n-mcp help/version output | No useful stdout captured | `n8n-mcp --help` and `n8n-mcp --version` did not return visible help/version text in this pass |

## Permission Mapping Draft

Default policy: deny all until explicit registration approval.

| Capability area | Proposed status | Rationale |
| --- | --- | --- |
| Read n8n docs/node metadata through n8n-mcp | Candidate allow after review | Useful for workflow design without mutating live workflows |
| List local workflow summaries | Blocked until API key storage approved | Could expose private workflow names or business process metadata |
| Read workflow definitions | Blocked until explicit workflow scope approval | Could expose credentials references, endpoints, or private automation logic |
| Create/update/delete workflows | Blocked | Production mutation risk |
| Execute workflows/webhooks | Blocked | External side effects and message/API send risk |
| Read credentials or env values | Blocked always for chat/report output | Secret exposure risk |
| Register n8n-mcp into Hermes | Blocked until `APPROVE_HERMES_N8N_MCP_REGISTER` | Expands Hermes tool surface |
| Install or replace n8n | Blocked until `APPROVE_N8N_LOCAL_INSTALL` | Runtime/dependency mutation |

## Safe Local Commands

These commands are safe for future read-only checks:

```bash
command -v n8n || true
command -v n8n-mcp || true
curl -fsSI http://127.0.0.1:5678 | head -20
curl -fsS http://127.0.0.1:5678/healthz | head -20
ls -l /opt/homebrew/bin/n8n-mcp
file /opt/homebrew/bin/n8n-mcp
readlink /opt/homebrew/bin/n8n-mcp || true
```

## Blocked Commands

Do not run these without exact approval and a permission map:

```bash
n8n
npx n8n
npm install -g n8n
docker run ...
hermes mcp add ...
hermes config set ...n8n...
curl .../api/v1/workflows...
curl .../webhook...
```

## Integration Decision

Current decision: do not register n8n-mcp into Hermes yet.

Reason: n8n is reachable, but host CLI state is partial and no n8n API key/workflow scope/permission map has been approved.

## Next Action

If the operator wants to proceed safely, the next non-secret step is to create an MCP permission policy draft naming exactly which n8n-mcp tool classes would be allowed for read-only documentation lookup, while keeping workflow read/write/execute disabled.

