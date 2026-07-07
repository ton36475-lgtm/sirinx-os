# Kimi K2.7 Code — GHOSTCLAW Worker Lane

**Phase:** 7
**Status:** Local specification, no live provider call
**Model:** Kimi K2.7 Code (Moonshot AI)
**Lane:** code_patch
**Role:** coding_tool_use_reference

---

## 1. Purpose

The Kimi K2.7 Code worker is the **coding tool-use reference** lane in the GHOSTCLAW fleet. It serves as:

- **Coding Worker** — generates code patches within allowed paths
- **Patch Planner** — plans code changes before execution
- **Test Planner** — plans test strategies for new features
- **MoA Reference Vote Worker** — provides reference votes in Mixture-of-Agents (MoA) gated brainstorm sessions

## 2. MoA Reference Vote Schema

```json
{
  "schema": "ghostclaw.moa.reference_vote.v1",
  "vote_id": "vote_<timestamp>_<random>",
  "brainstorm_id": "<brainstorm session id>",
  "voter": "kimi_coding_worker",
  "references": {
    "ref_A": { "dimension": "safety_risk", "assessment": "...", "score": 0-100 },
    "ref_B": { "dimension": "speed_cost", "assessment": "...", "score": 0-100 },
    "ref_C": { "dimension": "correctness_proof", "assessment": "...", "score": 0-100 }
  },
  "consensus_threshold": 75,
  "aggregator": "hermes_commander",
  "safety_disagreement_hard_veto": true,
  "moa_score_confidence_signal_only": true,
  "moa_cannot_override_policy_gate": true
}
```

## 3. Blocked Actions

- `model_download`
- `gpu_live_inference` / `gpu_inference`
- `secret_access` / `env_read` / `api_key_read`
- `deploy`
- `push`
- `production_action`
- `live_provider_call`
- `install_dependencies`
- `run_shell_command` (arbitrary)
- `cross_lane_write`
- `self_approval`

## 4. Policy File

`GHOSTCLAW/workers/kimi/kimi-worker.policy.yaml`

## 5. Vote Schema

`GHOSTCLAW/workers/kimi/kimi-reference-vote.schema.json`

## 6. Model Lane Routing

- `code_patch` → Kimi K2.7 Code (default)
- Unknown lane → fallback safely, no live call

## 7. Hard Stop Conditions

- Attempted live provider call → auto-block (Tier X)
- Attempted model download → auto-block (Tier X)
- Attempted GPU inference → auto-block (Tier X)
- Attempted secret access → auto-block (Tier X)
- Attempted self-approval → auto-block (Tier X)
- MoA override of policy gate → auto-block (Tier X)
- Recursive MoA launch → auto-block (Tier X)