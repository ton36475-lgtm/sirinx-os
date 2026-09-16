# GhostClaw External Repo A2A Sync Run

Date: 2026-06-30
Mode: local-only A2A sync and Codex sidebar probe
Status: sync probe passed; install remains blocked pending exact gate

## User Request

The operator requested a quick Codex/sidebar A2A sync path for:

- `https://github.com/Yeachan-Heo/oh-my-opencode-lite`
- `https://github.com/Yeachan-Heo/Agent-Blackbox`

The pasted separator between URLs was normalized before inspection. No external
repo install or code execution was performed.

## Verified Local State

- Quarantine root: `.ghostclaw_runtime/a2a2a/external_repos/`
- `oh-my-opencode-lite`: branch `dev`, local head `35797ff`, remote `dev` head `35797ffc8e8f1a60d78d82d743da97819ad00a10`
- `Agent-Blackbox`: branch `main`, local head `d1eb1d0`, remote `main` head `d1eb1d09ca26db910f3547a64b21d009806ef62e`

## A2A Sync Result

Command run:

```bash
python3 scripts/ghostclaw_a2a_sync_probe.py --root /Users/sirinx/sirinx-os --agent codex --scan-all --once
```

Result:

- `probe_only=true`
- `parse_errors=0`
- `scanned_packets=46`
- latest timestamp `2026-06-30T01:11:30.529320Z`

The probe wrote ack receipts for mailbox packets only. It did not execute packet
payloads, install packages, call providers, read secrets, send messages, deploy,
or push.

## Codex Sidebar Probe

Command run through shell interpreter because the script is not executable:

```bash
bash scripts/codex_no_mcp_a2a_sidebar.sh --probe
```

Result:

- `no_mcp_confirmed=true`
- `global_codex_config_mutated=false`
- `auth_files_read=false`
- `provider_calls_executed=false`
- `external_writes_executed=false`

Launch command printed but not executed:

```bash
CODEX_HOME="/Users/sirinx/sirinx-os/.ghostclaw_runtime/codex-no-mcp-home" codex --cd "/Users/sirinx/sirinx-os" --sandbox danger-full-access --ask-for-approval never --no-alt-screen "/ghostclaw-a2a-sync-start local_safe_autonomous codex_sidebar_runtime no_mcp"
```

## Install Gates Still Required

`oh-my-opencode-lite` requires:

```text
APPROVE_INSTALL_OH_MY_OPENCODE_LITE_QUARANTINE
```

`Agent-Blackbox` requires:

```text
APPROVE_INSTALL_AGENT_BLACKBOX_QUARANTINE
```

Do not combine both installs into one broad approval. Each repo has separate
write surfaces and rollback requirements.

## Blocked Actions Preserved

- package install
- `bunx`, `npx`, postinstall execution
- global OpenCode plugin/config writes
- daemon or dashboard launch
- provider/model auth or calls
- secret reads
- browser automation against private or sensitive flows
- Telegram, LINE, email, or customer live sends
- deploy
- git push

## Evidence

- Risk review: `docs/knowledge/GHOSTCLAW_EXTERNAL_REPO_INSTALL_RISK_REVIEW_20260630.md`
- Approval templates: `docs/knowledge/GHOSTCLAW_EXTERNAL_REPO_INSTALL_APPROVAL_PACKET_TEMPLATES_20260630.md`
- Sidebar state: `.ghostclaw_runtime/a2a2a/state/codex-no-mcp-sidebar-probe.json`
- Consolidated receipt: `.ghostclaw_runtime/a2a2a/receipts/external_repo_a2a_sync_run_20260630T011140Z.json`

## Next Safe Action

Review exactly one approval template and provide the matching approval phrase if
the operator wants a quarantine install. Otherwise continue using the local A2A
probe/sidebar path without executing external repo code.
