# TASK_ROUTER

## Decision Matrix

| Risk | Approval | Action |
| --- | --- | --- |
| safe | not required | Execute immediately; log to `AUTONOMOUS_RUN_LOG.md`. |
| medium | not required | Execute with diff/test report; log evidence. |
| high | plan only | Produce patch plan; stop for human review. |
| critical | refused | Log refusal; continue other safe work. |

## Color Codes

- **Green:** safe docs, schemas, tests, local scripts.
- **Yellow:** medium patches, new files, local validation required.
- **Red:** blocked external actions; safe alternative provided.
- **Black:** refused (secrets, gambling, production deploy, public signer exposure).

## Queue Routing

- Inbox packets are routed by `WORKSPACE_SCAFFOLD/scripts/queue_router.py`.
- Only `hermes`, `codex`, `opus`, `kob` agents are auto-routed for safe/medium tasks.
- Any `approval_required: true` packet stays in inbox.
