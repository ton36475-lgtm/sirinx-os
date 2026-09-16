# MaxPlus Hermes Advanced Feature Gates

Mission ID: `MAXPLUS-HERMES-CHINESE-MODEL-20260630`

## Purpose

The pasted source describes Hermes Agent features beyond provider config:
installer, `doctor`, `status`, model picker, TUI chat, gateway, cron, subagent
delegation, and MCP servers. This document splits those into exact gates so the
safe setup lane can keep moving without silently activating paid, secret, or
live-message behavior.

## Gate Matrix

| Feature | Default | Gate | Evidence required before execution |
| --- | --- | --- | --- |
| Remote installer review | closed | `APPROVE_REVIEW_HERMES_INSTALLER_ONLY` | downloaded file path, SHA-256, first-line review, no execution |
| Remote installer execution | closed | `APPROVE_EXECUTE_HERMES_INSTALLER_AFTER_REVIEW` | prior installer review, rollback notes, no secret in command |
| Private config write | closed | `APPROVE_WRITE_PRIVATE_HERMES_MAXPLUS_CONFIG=1` | env key present privately, dry-run evidence, chmod plan |
| `hermes doctor` | closed | `APPROVE_HERMES_DOCTOR_CONFIG_CHECK` | private config write evidence, no key printing |
| `hermes status` | closed | `APPROVE_HERMES_STATUS_CONFIG_CHECK` | private config write evidence, redacted output capture |
| `hermes model` | closed | `APPROVE_HERMES_MODEL_PICKER_CHECK` | private config write evidence, no provider chat prompt |
| one-turn TUI/provider smoke | closed | `APPROVE_MAXPLUS_HERMES_PROVIDER_SMOKE_ONE_TURN` | non-private prompt, cost guard, receipt |
| Gateway install/start | closed | `APPROVE_HERMES_GATEWAY_LOCAL_SETUP` | platform target, recipient scope, live-send disabled |
| Gateway live message | closed | exact recipient/platform gate | commander recipient, content draft, rollback/stop plan |
| Cron scheduler | closed | `APPROVE_HERMES_CRON_LOCAL_DRY_RUN` | dry-run job only, no provider loop |
| Cron provider job | closed | exact schedule/provider gate | budget cap, stop command, receipt path |
| Subagent delegation | closed | `APPROVE_HERMES_SUBAGENT_ONE_LOCAL_TASK` | one local non-secret task, no external send |
| MCP servers | closed | `CONNECTOR_SPECIFIC_MCP_GATE_REQUIRED` | config diff, no secrets in repo, tool scope |

## Operating Rules

- Never combine installer execution, private config write, provider smoke, and
  gateway live send in one approval.
- Every gate writes a receipt before and after execution.
- Provider/cost gates must be one-shot first, not recurring.
- Gateway live-send gates must name the exact platform and recipient.
- MCP gates must be connector-specific and must not store secrets in repo.
