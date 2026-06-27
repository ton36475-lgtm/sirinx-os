# A2A2A Sync Protocol

**Version:** 2.0

---

## Definition

A2A2A = Agent → Agent → Action

Every message exchange must advance toward a verifiable action.

## Three-Phase Flow

```
A₁: Agent Request — Hermes issues mission order
A₂: Agent Process — Opus/Codex/Workers analyze, design, create
A₃: Action — KOB validates, Command Broker executes, Brain records
```

## Message Routing Matrix

| From / To | Hermes | Opus | Codex | GLM | DeepSeek | KOB | Broker |
|---|---|---|---|---|---|---|---|
| **Hermes** | — | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| **Opus** | ✅ | — | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Codex** | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ |
| **GLM** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **DeepSeek** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **KOB** | ✅ | ❌ | ✅ | ❌ | ❌ | — | ✅ |

## Workers NEVER talk to Workers!

## Message Envelope

```json
{
  "message_id": "a2a2a_20260627_0001",
  "mission_id": "...",
  "lane_id": "...",
  "sender": {"name": "Hermes", "role": "mission_commander"},
  "recipient": {"name": "Opus", "role": "chief_architect"},
  "message_type": "request",
  "priority": "critical",
  "payload": {...},
  "controls": {
    "command_broker_required": true,
    "external_sync_allowed": false,
    "deployment_allowed": false,
    "git_write_allowed": false
  },
  "retry_count": 0,
  "timeout_seconds": 300
}
```

## Task Lifecycle

```
PENDING → RUNNING → WAITING_REVIEW → COMPLETED
                                  → BLOCKED
                                  → FAILED
```

## Error Codes

| Code | Meaning |
|---|---|
| `E001` | Target agent unreachable |
| `E002` | Lane dependency not met |
| `E003` | Command broker denied |
| `E004` | Loop detected |
| `E005` | Timeout |
| `E006` | Cross-lane write attempted |
| `E007` | Worker-to-worker communication attempted |
| `E008` | Architecture missing before build |
