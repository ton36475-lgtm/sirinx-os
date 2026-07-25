# A2A2A P101 Packet 020 Gate Capsule

## Status

`PASS_PACKET020_GATE_CAPSULE_READY`

## Packet Truth

- Source packet: `_A2A_QUEUE/outbox/packet_020_sirinx_all_chat_export_request.json`
- Packet title: `SIRINX all-chat export source request`
- Approval scope: `operator_supplied_all_chat_source_request_only`
- Blocker: `BLOCK-CHAT-EXPORT`
- Claims all chats read: `False`
- Raw chat content stored: `False`
- Real export loaded: `False`
- Connector read performed: `False`

## Exact Gate Capsules

- `APPROVE_MCP_AUTH_REFRESH_LINEAR` -> Linear: allow operator-controlled auth refresh/readiness review for Linear connector scope only.
  - Does not authorize: reading secret values, printing tokens, sending repo/customer data externally, mutating Linear issues/projects, provider/model call, deploy/push/cloud mutation.
  - Safe next step: run connector presence/readiness check only, then write receipt before any connector read.
- `APPROVE_MCP_AUTH_REFRESH_NOTION` -> Notion: allow operator-controlled auth refresh/readiness review for Notion connector scope only.
  - Does not authorize: reading secret values, printing tokens, writing Notion pages, bulk workspace export, provider/model call, deploy/push/cloud mutation.
  - Safe next step: run connector presence/readiness check only, then write receipt before any connector read.
- `APPROVE_MCP_AUTH_REFRESH_FIGMA` -> Figma: allow operator-controlled auth refresh/readiness review for Figma connector scope only.
  - Does not authorize: reading secret values, printing tokens, writing Figma files, bulk file export, provider/model call, deploy/push/cloud mutation.
  - Safe next step: run connector presence/readiness check only, then write receipt before any connector read.

## Operator Decision Options

- `provide_local_chatgpt_export_path`: Codex can later run metadata-only mapper against the provided local path after a separate scoped approval.
  - blocked now: raw chat import, bulk content storage, external upload
- `approve_one_connector_auth_refresh_gate`: Only the named connector readiness/auth refresh lane is opened; connector reads/writes remain separately gated.
  - blocked now: secret read/print, data export, workspace mutation
- `skip_packet020_for_now`: Keep packet_020 gated and move to next local-safe gate review packet.
  - blocked now: implicit bypass of approval gate

## Next Safe Action

Operator chooses one exact packet_020 gate phrase or provides a local ChatGPT export path; Codex must still stop before connector reads or raw data import.

## Policy

No source mutation, queue payload execution, connector read/write, live Telegram send, provider/model call, repo/customer-data external routing, install, commit, push, deploy, Cloudflare/R2 mutation, or secret/key read/print was performed.

## Evidence

- Evidence: `.ghostclaw_runtime/a2a2a/evidence/A2A2A-P101-PACKET020-GATE-CAPSULE-20260703.json`
- Receipt: `.ghostclaw_runtime/a2a2a/receipts/A2A2A-P101-PACKET020-GATE-CAPSULE-20260703.json`
