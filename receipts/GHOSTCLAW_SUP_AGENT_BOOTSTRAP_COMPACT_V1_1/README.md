# GhostClaw Sup Agent Bootstrap Receipts

Runtime: `GHOSTCLAW_SUP_AGENT_BOOTSTRAP_COMPACT_V1.1`

This folder records local-safe bootstrap receipts for the compact supervisor and
sub-agent registry. The bootstrap uses retrieval-on-demand and does not load
full memory, full chat history, full repo prompts, or all external agent rosters.

## Packet Split

- `P000A_REPO_INTAKE_READONLY`: read-only repo intake; no file writes.
- `P000B_RECEIPT_BOOTSTRAP`: creates runtime mailbox folders, this receipt
  folder, and the bootstrap report.
- `P001_SUP_AGENT_FILE_BOOTSTRAP`: creates compact supervisor/sub-agent files
  under an explicit file lease.

## Hard Blocks

No push, deploy, install, secret read, `.env` read, provider API call, paid model
call, dark-web execution, customer data routing, source mutation, or self
approval is allowed in these packets.
