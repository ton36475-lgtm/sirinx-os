# 07 — A2A2A Sync Protocol

**Protocol Version:** 2.0
**Definition:** Agent → Agent → Action

---

## Core Principle

A2A2A is NOT just inter-agent messaging. Every exchange MUST advance toward a verifiable action.

```
A₁: Agent Request (Hermes issues mission order)
A₂: Agent Process (Opus/Codex/Workers analyze, design, create)
A₃: Action (KOB validates, Command Broker executes, Brain records)
```

## Message Flow

```
Hermes ──A₁──→ Opus (design request)
Opus ──A₂──→ Hermes (architecture packet)
Hermes ──A₁──→ Codex (build request + architecture)
Codex ──A₁──→ GLM/DeepSeek (module tasks)
GLM/DeepSeek ──A₂──→ Codex (patches)
Codex ──A₂──→ KOB (validation request)
KOB ──A₃──→ Command Broker (validated command)
Broker ──A₃──→ Mission Control (audit + state update)
Mission Control ──A₃──→ Brain (record)
Hermes ←── status update
```

## Routing Rules

| From ↓ / To → | Hermes | Opus | Codex | GLM | DeepSeek | KOB | Broker |
|---|---|---|---|---|---|---|---|
| **Hermes** | — | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| **Opus** | ✅ | — | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Codex** | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ |
| **GLM** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **DeepSeek** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **KOB** | ✅ | ❌ | ✅ | ❌ | ❌ | — | ✅ |

Workers NEVER talk to Workers. Ships communicate ONLY through Hermes.

## Message Envelope

```json
{
  "schema_version": "ghostclaw.a2a2a.message.v1",
  "message_id": "a2a2a_20260627_0001",
  "mission_id": "...",
  "lane_id": "...",
  "sender": {"name": "...", "role": "..."},
  "recipient": {"name": "...", "role": "..."},
  "message_type": "request|response|report",
  "priority": "critical|high|normal|low",
  "payload": {},
  "controls": {
    "command_broker_required": true,
    "external_sync_allowed": false,
    "deployment_allowed": false,
    "git_write_allowed": false,
    "human_review_required_for_risky_actions": true
  },
  "retry_count": 0,
  "timeout_seconds": 300
}
```

## Task States

```
PENDING → RUNNING → WAITING_REVIEW → COMPLETED
                   → BLOCKED (needs human)
                   → FAILED (needs rollback)
```

## Timeouts

| Phase | Default TTL | Hard Timeout |
|---|---|---|
| A₁ (Request) | 60s | 120s |
| A₂ (Process) | 300s | 600s |
| A₃ (Action) | 120s | 300s |
