# Part 8 Approval Packet

Status: pending approval.

## Local Evidence Required Before Approval

- `node scripts/verify-workspace.mjs` passes.
- `node scripts/secret-scan.mjs` passes.
- `node scripts/check-skeleton.mjs` passes.
- `node scripts/check-soc-monitor.mjs` passes.
- `node scripts/run-clawforge-dry-run.mjs` passes.
- `node scripts/run-demo.mjs` passes.
- `node scripts/export-devpost-package.mjs` dry-run passes.

## Approval Items

| Item | Current state | Approval required |
| --- | --- | --- |
| Generate ClawForge MP4 | blocked | yes |
| Deploy preview | blocked | yes |
| Push branch / create PR | blocked | yes |
| Upload demo video | blocked | yes |
| Submit Devpost | blocked | yes |
| Activate MCP/plugin/external connectors | blocked | yes |
| Publish campaign content | blocked | yes |
| Send Telegram SOC report | blocked | yes, after Telegram/LINE evidence is complete |

## SOC / Telegram Truth Gate

- `GET /api/soc/status` is read-only and local-only.
- `pnpm soc:check` is read-only and must not send messages.
- `pnpm soc:dry-run` may write local JSON/A2A artifacts only.
- Telegram delivery requires complete `telegram-line-recipient-token` evidence and a concrete approval phrase.

## Split Approval Files

- `docs/approvals/PREVIEW_DEPLOY_APPROVAL.md`
- `docs/approvals/GIT_PUSH_PR_APPROVAL.md`
- `docs/approvals/CLAWFORGE_VIDEO_GENERATION_APPROVAL.md`
- `docs/approvals/DEVPOST_SUBMISSION_APPROVAL.md`
- `docs/approvals/EXTERNAL_CONNECTOR_MCP_APPROVAL.md`

## Approval Language

Use a concrete command such as:

```text
Approve Part 8 deploy preview only.
```

or:

```text
Approve Part 8 ClawForge local MP4 generation only.
```

Do not treat broad continuation language as approval for external activation.
