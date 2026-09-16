# A2A2A Brainstorm Protocol v1.0

## Overview
พัฒนาระบบให้ AI Agents ประชุมกัน (brainstorm) ก่อนเริ่มทำงานจริง โดยใช้ A2A2A envelope สำหรับข้อความระหว่าง agents

---

## Phase 0: Pre-Flight Collaboration

### 0.1 Brainstorm Trigger
เมื่อ Hermes Commander สร้าง task ใหม่ ที่มีความซับซ้อนหรืออันตรายระดับใดๆ:

```
# ใน CLAUDE.md เพิ่ม:
/brainstorm <task_id>
```

จะส่ง `message_kind: brainstorm_request` ให้ agents ที่เกี่ยวข้อง

### 0.2 Participants
| Role | Agent | Responsibilitiy in Brainstorm |
|------|-------|----------------------------|
| **Orchestrator** | Hermes/Fable | ประชุม, สะสาน, ตัดสินใจสุดท้าย |
| **Chief Architect** | Opus | วิเคราะห์ architecture, ความเสี่ยง |
| **Fresh Perspective** | Codex | เสนอ approach แบบต่างจาก Opus |
| **Fast Worker** | Sonnet | ระบุข้อจำกัด implementation |
| **Observer** | KOB/GhostClaw | บันทึกการสนทนา, validation notes |

---

## Brainstorm Flow (A2A2A Message Types)

### Message Schema Addition
```json
{
  "schema_version": "ghostclaw.a2a2a.message.v1",
  "message_id": "MSG-<task_id>-brainstorm-<ts>",
  "mission_id": "<task_id>",
  "lane_id": "<lane_name>",
  "sender": {"name": "opus", "role": "chief_architect"},
  "recipient": {"name": "hermes", "role": "orchestrator"},
  "message_type": "brainstorm",
  "phase": "preflight",
  "thread_id": "bs-<task_id>",  // ใช้ join conversation
  "payload": {
    "topic": "architecture_risk",
    "perspective": "conservative",  // or "innovative" / "pragmatic"
    "proposal": {
      "approach": "suggest_3_alternatives",
      "risks": ["dependency_conflict", "token_exhaustion"],
      "confidence": 0.85
    },
    "suggested_action": "opine_or_decline"
  },
  "controls": {
    "brainstorm_only": true,
    "mutation_allowed": false
  }
}
```

---

## 3-Step Adaptive Brainstorm Protocol

### Step 1: Problem Framing (Hermes → All)
```
Goal: <task_goal>
Constraints: <from_AGENTS.md>
File Scope: <allowed/forbidden>
Risk Tier: <low|medium|high|critical>
```

### Step 2: Parallel Perspectives
- **Opus**: ส่ง `brainstorm_response` ด้าน architecture + safety
- **Codex**: ส่ง `brainstorm_response` ด้าน implementation reality  
- **Sonnet**: ส่ง `brainstorm_response` ด้าน performance + token efficiency

ทุกคนเขียน `outbox/{their_name}/brainstorm-{task_id}.json`

### Step 3: Synthesis (Hermes → All)
Hermes สะสานผล สร้าง `brainstorm_summary.json`:
```
- Alternative A (Opus): <architecture_details>
- Alternative B (Codex): <implementation_approach>  
- Alternative C (Sonnet): <pragmatic_constraints>

Decision: <selected_approach>
Confidence: <score>
Risk Mitigation: <notes>
```

แล้วส่งต่อให้ **task เริ่มทำงานจริง**

---

## Adaptive Timing Rules

| Risk Tier | Brainstorm Timeout | Required Participants |
|-----------|------------------|---------------------|
| Low | 30s | 1 agent minimum |
| Medium | 60s | 2 agents |
| High | 120s | 3 agents (including Codex) |
| Critical | 300s | All 4 agents |

---

## Implementation Hooks

### 1. Add to `tools/a2a2a_sync.py`
```python
def message_kind_enum():
    return {
        "request", "response", "report",
        "brainstorm_request", "brainstorm_response", "brainstorm_summary"
    }

def brainstorm_handler(payload: dict) -> dict:
    # Verify thread_id, collect responses, synthesize
    pass
```

### 2. Add to CLAUDE.md command block
```markdown
## Brainstorm Commands

- `/brainstorm <task_id>` — start pre-flight session
- `/brainstorm-status <thread_id>` — check participant responses  
- `/brainstorm-sync` — synthesize and proceed
- `/brainstorm-cancel <thread_id>` — abort if consensus not reached
```

---

## Safety Boundaries (จาก AGENTS.md)

- **No mutation during brainstorm** (`mutation_allowed: false`)
- **Thread isolation** — แต่ละ task มี thread_id แยก
- **Observation only** — KOB logs ไม่แตกใน repo
- **Human escalation** — ถ้า agents แตกแยกเกิน 3 ไม้ใหญ่ ให้ขึ้น human review

---

## Acceptance Criteria

- [ ] Brainstorm message kinds ถูกเพิ่มใน envelope schema
- [ ] Thread-based conversation ทำงานได้ใน outbox/inbox
- [ ] Timeout rules ปรับตาม risk tier
- [ ] No code mutation ขณะ brainstorm อยู่
- [ ] Hermes สามารถสะสานผลและสร้าง summary
- [ ] Human escalation path ชัดเจน