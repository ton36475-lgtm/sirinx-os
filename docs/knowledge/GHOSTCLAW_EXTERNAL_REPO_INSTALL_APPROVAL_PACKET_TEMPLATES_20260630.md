# GhostClaw External Repo Install Approval Packet Templates

Date: 2026-06-30
Mode: local-only approval template creation
Status: template-only, no install executed

## Scope

This document creates two non-executable approval packet templates for the quarantined external repos requested for GhostClaw A2A/Codex sidebar work:

- `Yeachan-Heo/oh-my-opencode-lite`
- `Yeachan-Heo/Agent-Blackbox`

The templates are stored under `.ghostclaw_runtime/a2a2a/templates/` and are not active approvals. They must not be copied into `_A2A_QUEUE/approvals/` or executed unless the operator provides the exact approval phrase for one repo at a time.

## Template Files

- `.ghostclaw_runtime/a2a2a/templates/install-oh-my-opencode-lite-approval.template.json`
- `.ghostclaw_runtime/a2a2a/templates/install-agent-blackbox-approval.template.json`

## Safety Position

Both templates preserve the existing install block:

- no package install
- no `bunx`
- no `npx`
- no postinstall execution
- no global OpenCode plugin write
- no daemon/dashboard launch
- no provider/model auth or call
- no secret read
- no browser automation
- no Telegram/customer live send
- no deploy
- no push

Each template records a `command_template`, not an executable command. The command must be manually verified against the repo README and current local state after approval and before any run.

## Approval Gates

`oh-my-opencode-lite` requires:

```text
APPROVE_INSTALL_OH_MY_OPENCODE_LITE_QUARANTINE
```

`Agent-Blackbox` requires:

```text
APPROVE_INSTALL_AGENT_BLACKBOX_QUARANTINE
```

Do not combine both repos into one broad approval. Each install path has different write surfaces, process risks, and rollback needs.

## Required Operator Review Before Activation

Before either template can become an active approval packet:

1. Confirm the target repo, branch, and head from quarantine.
2. Confirm the exact working directory and expected file writes.
3. Confirm telemetry-off and no-auth settings where relevant.
4. Confirm no global config write unless separately approved.
5. Confirm rollback/snapshot path.
6. Confirm stop conditions.
7. Copy one reviewed packet into `_A2A_QUEUE/approvals/` only after exact approval.

## Current Decision

`install_blocked_template_ready`

The next safe action is operator review of one template. No external repo code was installed or executed during this step.
