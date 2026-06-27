# 20 — Runtime Handoff

**Purpose:** How agents hand off work between lanes

---

## Handoff Protocol

When an agent completes a lane:

```
1. Agent writes final output to reports/ directory
2. Agent updates STATUS_BOARD (mark lane COMPLETED)
3. Agent logs decision to DECISION_LOG
4. Agent sends A2A2A completion message to Hermes
5. Hermes reads reports, validates completion
6. Hermes updates mission state
7. Hermes triggers Brain sync
8. Hermes routes next lane to appropriate agent
```

## Handoff Message

```json
{
  "message_type": "handoff",
  "from_agent": "codex",
  "lane_id": "LANE_0",
  "status": "COMPLETED",
  "output_path": ".ghostclaw_runtime/hermes_commander/reports/codex/",
  "next_lane": "LANE_1",
  "next_assignee": "opus",
  "notes": "Scaffold complete. Brain + runtime ready for architecture."
}
```

## Handoff Checklist

- [ ] All acceptance criteria met
- [ ] Output files in reports/ directory
- [ ] STATUS_BOARD updated
- [ ] DECISION_LOG updated (if decisions made)
- [ ] A2A2A handoff message sent to Hermes
- [ ] Brain sync triggered
- [ ] No loose ends (files unstaged, tests failing, etc.)

## Handoff Rules

```
1. No handoff without validation (if lane requires KOB)
2. No handoff with failing tests
3. No handoff with unstaged changes (for build lanes)
4. Handoff must include clear next step for Hermes
```
