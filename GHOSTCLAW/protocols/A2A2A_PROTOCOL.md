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

---

## 8. GhostClaw Runtime Compatibility Fields

The JSON control plane is the source of truth. Latent-plane or MoA outputs may
accelerate reasoning, but they cannot approve actions, bypass policy gates, or
replace receipts.

The v2 schema preserves backward-compatible optional fields used by worker bus
templates and receipt artifacts:

- `task_id`
- `correlation_id`
- `decision_id`
- `brainstorm_id`
- `phase`
- `from_agent`
- `to_agent`
- `worker_id`
- `action_class`
- `evidence_pack`
- `autonomous_approval`
- `requester_agent`
- `approver_agent`
- `human_approval_required`
- `receipt_required`
- `latent_plane`
- `control_plane_required`
- `moa_summary`
- `moa_gated_brainstorm`
- `browser_use`
- `edgeone`

Terminology is locked:

- `brainstorm` is canonical for all new outbound artifacts.
- `beststorm` is accepted only as a legacy inbound alias and must normalize to
  `brainstorm`.
- `beststrom` is an invalid typo and must be rejected.

The protocol forbids KV-only execution. Any latent or KV compatibility layer
must still produce JSON control-plane artifacts and local receipts.

---

## 9. MoA-Gated Brainstorm Contract

MoA-gated brainstorm is a review gate, not an execution authority. It can raise
or lower confidence, but it cannot approve a blocked action or bypass
`action_tier_cap`.

Required reference lanes:

- `ref_A_safety_risk`
- `ref_B_speed_cost`
- `ref_C_correctness_proof`

Hermes is the aggregator. The aggregator records consensus, aggregator
certainty, and the evidence pack in the JSON control plane. A safety disagreement from `ref_A_safety_risk` is a hard veto even if consensus and
aggregator certainty are high.

Phase 8 invariants:

- `moa_summary.moa_score_is_confidence_signal_only` must be `true`.
- `moa_summary.policy_gate_override_allowed` must be `false`.
- `moa_summary.recursive_moa_launch_allowed` must be `false`.
- `moa_gated_brainstorm.safety_disagreement_hard_veto` must be `true`.
- `moa_gated_brainstorm.policy_gate_final_authority` must be `true`.
- `moa_gated_brainstorm.moa_score_authorizes_action` must be `false`.

No recursive MoA launch is allowed. If a brainstorm request attempts to start
another MoA loop, the policy gate treats it as Tier X and writes a blocked
receipt.
