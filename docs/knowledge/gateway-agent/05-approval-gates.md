# Gateway Agent Approval Gates

Status: fail-closed

## Blocked Actions

Gateway Agent must stop before:

- deploy
- push
- publish
- external connector activation
- real MCP execution
- paid API call
- secret read or print
- customer message send
- production database write
- Telegram send
- per-profile Hermes gateway start

## Approval Packet

Before any blocked action, a later phase must provide:

- exact action name
- target system
- owner
- risk summary
- rollback or stop plan
- verification evidence
- explicit human approval phrase

## Phase 1 Stop Point

```text
GATEWAY AGENT READY LOCAL-ONLY - WAITING FOR HUMAN APPROVAL
```
