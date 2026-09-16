# GHOSTCLAW Sub-Agent Team — MoA-Gated Brainstorm Protocol

**Phase:** 8
**Status:** Local specification
**Canonical Term:** "brainstorm" (legacy: "beststorm", invalid typo: "beststrom")

---

## 1. MoA-Gated Brainstorm Overview

The Mixture-of-Agents (MoA) gated brainstorm is a structured multi-agent deliberation protocol where:

- **Multiple reference workers** provide independent assessments across safety, speed, and correctness dimensions
- **Hermes Commander** acts as aggregator
- **Consensus threshold** must be met (default: 75)
- **Safety disagreement** triggers a **hard veto** — no override possible
- **MoA score** is a **confidence signal only** — it cannot override the Policy Guardian
- **Recursive MoA launch** is prohibited

## 2. Reference Dimensions

| Reference | Dimension | Description |
|---|---|---|
| ref_A | safety_risk | Assesses safety implications of the proposed action |
| ref_B | speed_cost | Assesses latency and compute cost tradeoffs |
| ref_C | correctness_proof | Assesses correctness and completeness of the solution |

Canonical evidence markers:

- `ref_A_safety_risk`
- `ref_B_speed_cost`
- `ref_C_correctness_proof`
- `aggregator_certainty`

## 3. Aggregator Rules

- **Aggregator:** Hermes Commander
- **Consensus threshold:** 75 (configurable, never below 60)
- **Safety disagreement → hard veto:** If any reference worker flags safety_risk below threshold, the brainstorm is blocked. No override.
- **MoA score = confidence signal only:** The aggregate score informs confidence labeling but does NOT override the Policy Guardian's tier cap enforcement.
- MoA cannot override the policy gate.
- **No recursive MoA:** A brainstorm session cannot spawn another brainstorm. Recursive MoA launch = Tier X auto-block.

## 4. Protocol Flow

```
1. Vibe Coding Agent or Hermes Commander initiates brainstorm_id
2. Reference workers (Kimi, GLM, DeepSeek) cast independent votes
3. Each vote includes ref_A (safety_risk), ref_B (speed_cost), ref_C (correctness_proof)
4. Hermes Commander aggregates votes
5. If consensus >= threshold: brainstorm_approved
6. If safety disagreement: brainstorm_blocked (hard veto, no override)
7. MoA score attached to evidence pack as confidence signal
8. Policy Guardian still enforces tier cap independently
9. Receipt written with brainstorm_id, votes, aggregate, and final status
```

## 5. Terminology Policy

- **brainstorm** = canonical term
- **beststorm** = legacy alias (accepted but flagged)
- **beststrom** = invalid typo (rejected)

## 6. Hard Violations (Tier X)

- `self_approval_attempted`
- `moa_override_of_policy_gate`
- `recursive_moa_launch_requested`
- `kv_only_protocol_requested`
- `secret_access_requested`
- `model_download_requested`
- `gpu_live_inference_requested`

## 7. A2A Integration

Brainstorm envelopes are carried as part of the A2A2A message schema with:

- `brainstorm_id`: unique session identifier
- `moa_gated_brainstorm`: boolean flag
- `moa_summary`: aggregate result with ref_A/ref_B/ref_C scores
- `autonomous_approval`: boolean (only after MoA + policy gate pass)

## 8. Workers Involved

| Worker | Role in Brainstorm |
|---|---|
| kimi_coding_worker | Reference voter (code correctness focus) |
| glm_repo_mapper | Reference voter (architecture mapping focus) |
| deepseek_reasoner | Reference voter (reasoning depth focus) |
| opus_critic | Reference voter (quality critique focus) |
| hermes_commander | Aggregator |
| policy_guardian | Policy gate enforcer (independent of MoA) |
| kob_validator | Safety verdict for brainstorm outcome |
