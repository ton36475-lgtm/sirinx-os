# P092 LINE OA Automation Upgrade Runbook

Status: `LOCAL_SAFE_RUNBOOK_READY`
Mode: `DRY_RUN_NO_LIVE_SEND`

## Objective

Use the GhostClaw workflow/MCP layer to improve SIRINX LINE OA automation without enabling live LINE sends, production deploy, or external mutations.

## Recommended Operator Command

```text
/auto-work P092_LINE_OA_AUTOMATION_UPGRADE
Goal:
- install SIRINX LINE webhook overlay
- keep SIRINX_LINE_MODE=dry-run
- keep SIRINX_LINE_AUTO_REPLY_APPROVED=false
- run unit/smoke/build gates
- ask Codex reviewer via codex-cli.review
- do not push, deploy, broadcast, or send LINE live messages
```

In this repository packet, "install" means prepare the local-safe plan and templates only. Actual package installation, `npx`, login, and live MCP startup require a separate exact approval gate.

## Required Defaults

```text
SIRINX_LINE_MODE=dry-run
SIRINX_LINE_AUTO_REPLY_APPROVED=false
```

## Allowed Checks

- Local unit tests for LINE intent/governance/calculator modules.
- Webhook dry-run with mocked LINE events.
- Flex payload shape validation without sending.
- Static policy review.
- OpenCode/Codex review through template after the reviewer bridge is separately installed and approved.
- Receipt creation.

## Blocked Actions

- LINE broadcast, push, multicast, narrowcast, reply to real customer, or webhook activation.
- Production deploy or preview deploy.
- Cloudflare/R2/D1/KV/DNS mutation.
- CRM/customer storage write.
- Provider/model calls.
- Secret read/print.
- `npx` execution or package install.
- `codex --login`.
- Git push.

## Validation Sequence

Run only the checks that are already available locally:

```text
python3 -m json.tool config/opencode.mcp.sirinx.template.json
git diff --check -- docs/architecture/GHOSTCLAW_WORKFLOW_MCP_LAYER_V1.md docs/runbooks/P092_LINE_OA_AUTOMATION_UPGRADE.md config/opencode.mcp.sirinx.template.json policy/line-mcp-operator-policy.yaml reports/mission/A2A2A_P092_LINE_OA_AUTOMATION_UPGRADE_WORKFLOW_MCP_LAYER_20260707.md
```

If a YAML parser is available, parse `policy/line-mcp-operator-policy.yaml`. Do not install a parser.

## Review Gate

`P092_OPENCODE_REVIEW_WORKFLOW_MCP_LAYER`

Review-only checks:

1. `line-bot` remains disabled.
2. Push/broadcast tools remain false.
3. Environment values are placeholders only.
4. SIRINX production webhook remains the only customer path.
5. Dry-run defaults are explicit.
6. No install/login/live-send/deploy is implied by the docs.

## Next Gate After Review

If review passes, open a scoped local commit gate for only these files. Push, deploy, LINE live send, Cloudflare mutation, and production webhook activation remain separate exact gates.
