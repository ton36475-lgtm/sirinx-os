# INBOX_OUTBOX_PROTOCOL

## Packet Shape

```json
{
  "id": "<uuid>",
  "project": "pocket-hatchery",
  "priority": "P0|P1|P2|P3|P4",
  "title": "human-readable title",
  "agent": "hermes|codex|opus|kob",
  "status": "inbox|working|outbox|done|blocked",
  "risk": "safe|medium|high|critical",
  "input": ["paths"],
  "output": ["paths"],
  "approval_required": false
}
```

## Flow

1. New work arrives in `_A2A_QUEUE/inbox/`.
2. `queue_router.py` moves safe/medium packets to `working/`.
3. Agent executes and writes result evidence to `outbox/`.
4. Reviewer moves verified packets to `done/`.
5. Blocked packets move to `blocked/` with reason file.

## No-Go

- Do not delete packets.
- Do not modify `done/` packets after review.
- Do not batch approve critical-risk packets.
