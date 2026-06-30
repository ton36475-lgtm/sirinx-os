# MoA-Gated Brainstorm

**Part of:** GHOSTCLAW Hermes Commander A2A2A OS
**Status:** ACTIVE
**Canonical term:** brainstorm (legacy: beststorm, invalid typo: beststrom)

---

## 1. Overview

MoA-Gated Brainstorm is a Mixture-of-Agents (MoA) review process where multiple reference agents evaluate a proposal before it may proceed to action. The MoA score is a **confidence signal only** — it never overrides the policy gate.

## 2. Reference Roles

| Role | Function | Focus |
|------|----------|-------|
| ref_A | safety_risk | Identify safety violations, edge cases, harmful outcomes |
| ref_B | speed_cost | Evaluate performance, latency, resource cost |
| ref_C | correctness_proof | Verify logical correctness, completeness, testability |
| Hermes | aggregator | Synthesize reference outputs into consensus |

## 3. Consensus Threshold

- `consensus`: float 0.0–1.0 (fraction of references in agreement)
- `consensus_threshold`: default 0.67 unless a stricter task contract is supplied
- `aggregator_certainty`: float 0.0–1.0 (Hermes confidence in the synthesis)
- `safety_disagreement`: boolean — if true, hard veto regardless of consensus

## 4. Safety Disagreement Hard Veto

If any reference flags `safety_disagreement = true`, the brainstorm is **blocked** regardless of consensus score or aggregator certainty. No override is possible.

## 5. MoA Score as Confidence Signal Only

```
MoA score → confidence signal → policy gate evaluation → final decision
```

The MoA score feeds into `display_score` which may exceed 100 for confidence signaling. However:
- `effective_score` is capped at 0–100
- `action_tier_cap` remains the final authority
- No MoA score, latent score, or confidence score may override the policy gate

## 6. Policy Gate Authority

```
JSON control plane + policy gate > MoA score
JSON control plane + policy gate > latent score
JSON control plane + policy gate > confidence score
```

The policy gate (`action_tier_cap`) always takes precedence. A high MoA score cannot upgrade a D or X action to approved.

## 7. Schema Fields

The A2A2A message schema includes optional fields for MoA:

- `moa_summary.consensus`: 0.0–1.0
- `moa_summary.reference_votes.ref_A_safety_risk`: required safety/risk reference lane
- `moa_summary.reference_votes.ref_B_speed_cost`: required speed/cost reference lane
- `moa_summary.reference_votes.ref_C_correctness_proof`: required correctness/proof reference lane
- `moa_summary.hermes_aggregator.consensus_threshold`: 0.0–1.0
- `moa_summary.aggregator_certainty`: 0.0–1.0
- `moa_summary.safety_disagreement`: boolean
- `moa_summary.moa_score_is_confidence_signal_only`: true
- `moa_summary.policy_gate_override_allowed`: false
- `moa_summary.recursive_moa_launch_allowed`: false
- `moa_gated_brainstorm.enabled`: boolean
- `moa_gated_brainstorm.gate_status`: pending | passed | blocked | requires_human
- `moa_gated_brainstorm.action_tier_cap`: A | B | C | D | X
- `moa_gated_brainstorm.safety_disagreement_hard_veto`: true
- `moa_gated_brainstorm.policy_gate_final_authority`: true
- `moa_gated_brainstorm.moa_score_authorizes_action`: false

## 8. Canonical Terminology

- `brainstorm` = canonical term
- `beststorm` = deprecated legacy alias (inbound read compatibility only)
- `beststrom` = invalid typo (reject or autocorrect)

All new artifacts must emit `brainstorm` and `moa_gated_brainstorm` only.
