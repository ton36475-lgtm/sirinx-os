# A2A2A Protocol Specification v2.0

**Part of:** GHOSTCLAW Hermes Commander A2A2A OS v2.0
**Status:** ACTIVE

---

## 1. Protocol Definition

```
A2A2A = Agent → Agent → Action
```

A2A2A is a 3-phase protocol where:
- **A₁ (Agent Request):** A commander agent issues a structured mission request
- **A₂ (Agent Process):** One or more worker agents analyze, design, or create
- **A₃ (Action):** A validator or broker executes the concrete action

### Key Distinction

A2A2A is NOT just inter-agent chat. Every message MUST result in a verifiable action or a deliberate NO-OP record. No message is "just FYI" — every exchange advances the mission state.

---

## 2. Message Lifecycle

```
                    ┌─────────┐
                    │ PENDING │ ← Message created
                    └────┬────┘
                         │
                    ┌────▼────┐
                    │ ROUTED  │ ← Hermes assigns to target agent
                    └────┬────┘
                         │
              ┌──────────▼──────────┐
              │    PROCESSING       │ ← Target agent works
              └──────────┬──────────┘
                         │
           ┌─────────────┼─────────────┐
           │             │             │
    ┌──────▼──────┐ ┌───▼────┐ ┌─────▼──────┐
    │ACTION_PENDING│ │BLOCKED │ │  FAILED    │
    │(needs gate) │ │(needs  │ │(needs      │
    │             │ │ human) │ │ rollback)  │
    └──────┬──────┘ └───┬────┘ └─────┬──────┘
           │            │            │
    ┌──────▼──────┐     │     ┌──────▼──────┐
    │  EXECUTING  │     │     │  ROLLBACK   │
    └──────┬──────┘     │     └─────────────┘
           │            │
    ┌──────▼──────┐     │
    │  COMPLETED  │◄────┘ (after approval)
    └─────────────┘
```

---

## 3. Routing Rules

### 3.1 Who Can Send to Whom

| From ↓ / To → | Hermes | Opus | Codex | GLM | DeepSeek | KOB | Broker |
|---|---|---|---|---|---|---|---|
| **Hermes** | — | ✅ | ✅ | ✅ (via Codex) | ✅ (via Codex) | ✅ | ✅ |
| **Opus** | ✅ | — | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Codex** | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ |
| **GLM** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **DeepSeek** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **KOB** | ✅ | ❌ | ✅ | ❌ | ❌ | — | ✅ |
| **Broker** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | — |

### 3.2 Chain Rules

Valid chains:
```
Hermes → Opus → Hermes → Codex → KOB → Broker  ✅
Hermes → Codex → GLM → Codex → KOB → Broker  ✅
Hermes → Codex → DeepSeek → Codex → KOB → Broker  ✅
```

Invalid chains:
```
GLM → KOB  ❌ (must go through Codex)
Opus → KOB  ❌ (must go through Hermes → Codex → KOB)
Worker → Worker  ❌ (workers don't talk to each other directly)
```

---

## 4. Action Classification

| Action Class | Description | Requires Approval | Example |
|---|---|---|---|
| **READ** | Read files, brain, status | No | `file_read`, `brain_query` |
| **PLAN** | Design, architecture | No (outputs are docs) | `design_architecture` |
| **WRITE_LANE** | Write files within assigned lane | No | `write_module`, `fix_bug` |
| **INTEGRATE** | Merge patches, stage | Codex only | `integrate_patches` |
| **VALIDATE** | Test, lint, typecheck | No | `run_tests`, `validate` |
| **COMMIT** | Git commit | Yes (Hermes) | `stage_commit` |
| **PUSH** | Git push | Yes (Human) | — |
| **DEPLOY** | Deploy to any env | Yes (Human) | — |
| **EXTERNAL** | External API call | Yes (Human) | — |
| **DESTROY** | Delete, force, reset | Yes (Human) | — |

---

## 5. TTL & Timeout

| Phase | Default TTL | Hard Timeout |
|---|---|---|
| A₁ (Request) | 60s | 120s |
| A₂ (Process) | 600s | 900s |
| A₃ (Action) | 120s | 300s |

After TTL expiry → message status set to FAILED → Hermes notified.

---

## 6. Error Codes

| Code | Meaning | Action |
|---|---|---|
| `E001` | Unknown agent | Reject, log |
| `E002` | Invalid routing | Reject, notify Hermes |
| `E003` | Lane violation | Block, escalate |
| `E004` | Approval required | Queue for human |
| `E005` | TTL expired | Mark FAILED, notify |
| `E006` | Loop detected | Circuit break, STOP |
| `E007` | Cost guard breach | Block, notify Operator |
| `E008` | Test failure | Return to Codex |
| `E009` | Merge conflict | Flag for Hermes |

---

## 7. Verification

```bash
# Validate A2A2A schema
cat GHOSTCLAW/protocols/a2a2a-message-schema.json | python3 -m json.tool > /dev/null && echo "Schema valid"

# Check routing matrix
grep -c "✅" GHOSTCLAW/protocols/A2A2A_PROTOCOL.md
```
