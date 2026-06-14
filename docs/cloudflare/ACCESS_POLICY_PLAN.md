# Cloudflare Access Policy Plan

Status: DRAFT ONLY - DO NOT APPLY

## Principle

All internal SIRINXDev Cloudflare surfaces are private-first. Anonymous public access is allowed only for approved public marketing routes.

## Protected Applications

| Application | Host | Policy |
| --- | --- | --- |
| Mission Control | `dev.sirinx.co` | Approved operator email + MFA |
| Edge Agents | `agents.sirinx.co` | Approved operator email + MFA; service token for M2 bridge |
| Remote MCP | `mcp.sirinx.co` | Access + OAuth + scoped MCP permissions |
| n8n Lab | `n8n.sirinx.co` | Approved operator email + MFA |
| Logs | `logs.sirinx.co` | Approved operator email + MFA |

## Service Token Rules

- Use one service token per machine-to-machine lane.
- Use short duration where possible.
- Store token only in approved secret storage.
- Never write token values to docs, source, Obsidian, screenshots, or chat.
- Revoke by deleting the service token if compromised or unused.

## Stop Conditions

- No Cloudflare Access policy write without `PRE_APPROVAL_PACKET_CLOUDFLARE_DEV`.
- No public anonymous internal host.
- No broad admin token.
- No bypass route for Remote MCP.

