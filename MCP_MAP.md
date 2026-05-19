# MCP_MAP

Status: local access map, no secrets
Date: 2026-05-20

## Policy

MCP/connectors/plugins expand capability but do not bypass `AGENTS.md`, `PROJECT_STATE.md`, or external approval gates.

## Current Map

| Capability | Transport | Purpose | Access | External Write Policy |
| --- | --- | --- | --- | --- |
| Local filesystem | Codex local tools | Read/write repo files in allowed scope | local | Writes require task scope; no secret files. |
| Shell | Codex local terminal | Run checks, tests, local scripts | local | No destructive commands unless explicit. |
| Browser/Chrome | plugin/browser tools | Local dashboard and website QA | local/remote read | Purchases, deletes, outbound messaging, and auth changes require exact approval. |
| GitHub | `gh` / GitHub connector | Repo inventory, PR/issue review, optional publish | authenticated | Push/PR requires exact approval. |
| Cloudflare/Wrangler | local CLI | Pages/Workers/DNS review/deploy | authenticated where configured | Deploy/write requires exact approval. |
| Supabase | connector/CLI if configured | Schema/config review | authenticated where configured | Migration/write requires exact approval. |
| Notion/Drive/Docs | connectors if configured | Knowledge capture and documentation | authenticated where configured | External writes require target page/folder approval. |
| Computer Use | desktop UI tool | Operate local Mac apps by UI | user session | Destructive/external actions require approval. |

## Secret Behavior

- Do not read `.env` values.
- Do not print tokens.
- Do not paste secrets into browser or chat.
- Use evidence templates that record presence/status, not values.

## Audit Behavior

Important local changes should be reflected in:

- `PROJECT_STATE.md` if state changes.
- `NEXT_ACTIONS.md` if queue changes.
- `docs/knowledge/` for durable design/decision artifacts.
- Obsidian digest for concise memory records.
