# A2A2A P092 LINE OA Automation Upgrade Workflow MCP Layer

Packet: `P092_LINE_OA_AUTOMATION_UPGRADE`
Status: `WORKFLOW_MCP_LAYER_LOCAL_SAFE_READY`
Date: `2026-07-07`

## Objective

Add a local-safe GhostClaw workflow/MCP layer for SIRINX LINE OA automation using:

- `ai-auto-work` as workflow/process pattern.
- OpenCode/Claude/Codex as scoped executor lanes.
- `codex-mcp-server` as a Codex reviewer bridge template.
- `@line/line-bot-mcp-server` as a disabled LINE operator template.
- SIRINX webhook as the only production customer path.

## Files Created

- `docs/superpowers/plans/2026-07-07-ghostclaw-workflow-mcp-layer.md`
- `docs/architecture/GHOSTCLAW_WORKFLOW_MCP_LAYER_V1.md`
- `docs/runbooks/P092_LINE_OA_AUTOMATION_UPGRADE.md`
- `config/opencode.mcp.sirinx.template.json`
- `policy/line-mcp-operator-policy.yaml`
- `reports/mission/A2A2A_P092_LINE_OA_AUTOMATION_UPGRADE_WORKFLOW_MCP_LAYER_20260707.md`

## Production Boundary

Production LINE customer path remains:

```text
https://www.sirinx.co/api/line/webhook
```

Required defaults remain:

```text
SIRINX_LINE_MODE=dry-run
SIRINX_LINE_AUTO_REPLY_APPROVED=false
```

## Blocked Actions Confirmed

- No package install.
- No `npx` execution.
- No Codex/OpenCode/LINE MCP live startup.
- No `codex --login`.
- No provider/model call.
- No secret read/print.
- No LINE broadcast/push/multicast/narrowcast/reply.
- No live Telegram/LINE/email/customer send.
- No webhook activation.
- No CRM/customer data storage.
- No Cloudflare/R2/D1/KV/DNS mutation.
- No deploy.
- No git push.

## Validation To Record

Completed local checks:

- `python3 -m json.tool config/opencode.mcp.sirinx.template.json`: passed
- YAML parse: skipped because PyYAML is not installed; no install was performed
- Syntax-light policy check for `policy/line-mcp-operator-policy.yaml`: passed
- Scoped `git diff --check`: passed
- Scoped secret-pattern scan over created files: passed
- Scoped `git status`: six new P092 files only

## Next Gate

`P092_OPENCODE_REVIEW_WORKFLOW_MCP_LAYER`

Review-only. No install, push, deploy, LINE live send, provider/model call, or secret access.
