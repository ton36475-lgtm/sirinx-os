---
name: ghostclaw-agent-ghostclaws-thai-jarvis
version: "1.0.0"
author: sirinx-os
description: >
  GHOSTCLAW Thai Jarvis Agent — the unified agent skill for SIRINX OS.
  Covers Zero Prompting workflow, Hermes/Codex mutual approval, Worker Build
  Runtime, Browser Use Worker, Vibe Coding Agent, A2A Sync Team, MoA-gated
  brainstorm, LatentMAS dual-plane architecture, Model Auto Swap Router,
  Kimi Worker lane, EdgeOne deployment readiness, GitHub Toptrend public
  read-only research, validation/receipt/archive, and hard stop conditions.

# Skill metadata
phase_coverage: "1-11"
canonical_terminology:
  brainstorm: canonical
  beststorm: legacy_alias
  beststrom: invalid_typo
autonomy_default: "A2"
authority_chain:
  - human_operator
  - hermes_mission_commander
  - opus_chief_architect
  - codex_build_captain
  - glm52_dekimi_workers
  - kob_validator
  - command_broker
---

# GHOSTCLAW Thai Jarvis Agent Skill

## 1. Zero Prompting Workflow

GHOSTCLAW implements a **Zero Prompting** workflow. Agents do not receive free-form prompt strings that could bypass safety. Instead, tasks are dispatched as structured Mission Cards containing:

- Goal
- Constraints
- File Scope (allowed / forbidden)
- Expected Result
- Verification
- Report Format

This prevents prompt injection and ambiguous dispatch.

## 1.1 Skill Creator / Zero Prompting System (Phase 10)

The Skill Creator updates this `SKILL.md` as the canonical operating guide for the Thai JARVIS worker system. It records capabilities as structured contracts, not raw prompt dumps.

**Required workflow:**

1. Convert operator intent into a Mission Card.
2. Map the Mission Card to approved file scope and blocked actions.
3. Route through Hermes/Codex mutual approval before mutation.
4. Dispatch only to registered local workers.
5. Validate, write receipt, archive evidence, then report exact status.

**Coverage contract:** Worker Build Runtime, Browser Use Worker, Vibe Coding Agent, A2A Sync Team, MoA-gated Brainstorm, LatentMAS dual-plane architecture, Model Auto Swap Router, Kimi Worker lane, EdgeOne deployment readiness, GitHub Toptrend public read-only research, validation/receipt/archive.

**Phase 10 hard stops:** no secret access, no push/deploy, no live provider/model call, no GPU inference, no model download.

## 2. Hermes/Codex Mutual Approval

All non-trivial actions require **mutual approval** between Hermes (Commander) and Codex (Build Captain). The autonomous mutual approval engine (`GHOSTCLAW/agents/auto-approve-engine.mjs`) enforces:

- No self-approval (requester ≠ approver)
- Safe actions (tier A/B) auto-approve
- Medium actions (tier C) require agent quorum
- Dangerous actions (tier D/X) auto-block

## 3. Worker Build Runtime

Workers operate under the GHOSTCLAW Worker Build Runtime. Each worker has:

- An assigned lane
- A policy file (`.policy.yaml`)
- An autonomy level (default A2)
- A report-to chain (no worker-to-worker direct communication)
- Blocked actions list

Workers registered in `GHOSTCLAW/workers/registry/worker-registry.json`:

- `kimi_coding_worker` — Phase 7 coding lane
- `model_swap_worker` — Phase 6 metadata routing

## 4. Browser Use Worker

The Browser Use Worker lane enables read-only browser inspection via Chrome DevTools MCP. It is an A4 autonomy agent with:

- **Allowed:** navigate, inspect DOM, screenshot, network panel read
- **Blocked:** click-to-action, form submission, authentication, download

No production action is taken through the browser.

## 5. Vibe Coding Agent

The Vibe Coding Agent provides iterative code generation within a bounded scope:

1. Architect (Opus) defines the scope
2. Codex dispatches to Kimi/GML workers
3. Worker produces a patch plan
4. Codex reviews and applies (within allowed path)
5. KOB validates
6. Hermes signs off

## 6. A2A Sync Team

The A2A (Agent-to-Agent) sync protocol connects Hermes and Codex via a lane-registry, packet-bus, and manifest-store. The runtime lives in `GHOSTCLAW/a2a-hermes-codex-bridge/`.

Key files:

- `a2a-message.ts` — message schema
- `a2a-sync-runner.mjs` — sync runner
- `command-broker.ts` — command broker
- `tier-resolver.ts` — tier resolution

## 7. MoA-Gated Brainstorm

Mixture-of-Agents (MoA) voting gates brainstorm sessions. The canonical term is **brainstorm** (`beststorm` is a legacy alias; `beststrom` is an invalid typo and rejected).

MoA flow:

1. Hermes proposes a brainstorm topic
2. `ref_A_safety_risk`, `ref_B_speed_cost`, and `ref_C_correctness_proof` produce structured references
3. Hermes aggregates consensus and `aggregator_certainty`
4. Safety disagreement from `ref_A_safety_risk` creates a hard veto
5. MoA score is stored as a confidence signal only
6. Policy gate and `action_tier_cap` remain final authority
7. Decision is recorded with receipt

No recursive MoA launch is permitted (tier X).

**Phase 8 invariants:**

- `ref_A_safety_risk`, `ref_B_speed_cost`, and `ref_C_correctness_proof` are required
- Hermes is the aggregator
- `consensus_threshold` defaults to 0.67
- `aggregator_certainty` must be recorded as evidence
- `safety_disagreement_hard_veto` is true
- `moa_score_authorizes_action` is false
- `policy_gate_override_allowed` is false
- `recursive_moa_launch_allowed` is false

## 8. LatentMAS Dual-Plane Architecture

GHOSTCLAW implements the **LatentMAS** dual-plane architecture:

- **JSON control plane:** Structured decision artifacts, receipts, and action gates that are the source of truth
- **Latent plane:** Shadow/acceleration only; never authoritative
- **Safety/policy plane:** Final authority over all action gates

The JSON control plane always wins over the latent plane. A JSON decision artifact overrides any latent score.

**Phase 9 invariants:**

- `json_control_plane_source_of_truth` is true
- `latent_plane_shadow_only` is true
- `safety_policy_plane_final_authority` is true
- `kv_only_protocol_allowed` is false
- exact KV compatibility gate requires 12 matching fields and `past_key_values`
- debug probe mode is `parallel_text_probe`
- `decode_from_kv` is false
- no guaranteed `4.3x`, `83.7%`, or `+13.3%` local claim without benchmark evidence
- `LATENTMAS_LIVE_ENABLED` remains false in MVP
- model download, GPU live inference, live provider calls, and secret access remain blocked

## 9. Model Auto Swap Router (Phase 6)

The Model Auto Swap Router provides metadata-only routing of tasks to model lanes.

**Files:**

- `GHOSTCLAW/models/model-registry.yaml` — 5 registered models
- `GHOSTCLAW/models/model-swap-policy.yaml` — immutable swap policy
- `GHOSTCLAW/models/model-router.mjs` — `ModelRouter` class
  - `route(taskType)` → returns a model lane or blocked result
- `GHOSTCLAW/models/model-router.test.mjs` — Vitest suite
- `GHOSTCLAW/models/provider-health.mjs` — health check stub
- `GHOSTCLAW/workers/model-swap/model-swap-worker.mjs` — swap worker with receipts
- `.ghostclaw_runtime/a2a2a/templates/model-swap-receipt.json` — receipt template

**Lane assignments:**

```text
code_patch      → Kimi K2.7 Code
repo_mapping    → GLM 5.2 Max
architecture    → DeepSeek V4 Pro
final_decision  → GPT-5.5
critic_review   → Claude Opus 4.8
fallback        → GLM 5.2 Max
```

**Immutable safety constraints:**

- Model swap never overrides policy gate
- `action_tier_cap` remains final authority
- D/X actions auto-blocked
- No live provider call
- No API key read
- No `.env` read
- No model download
- No GPU inference

## 10. Kimi Worker Lane (Phase 7)

The Kimi K2.7 Code Worker is the coding lane in GHOSTCLAW.

**Roles:**

- coding_tool_use_reference
- coding_worker
- patch_planner
- test_planner
- MoA reference vote worker

**Blocked:**

- model_download
- gpu_live_inference
- gpu_inference
- secret_access
- env_read
- api_key_read
- deploy
- push
- production_action
- live provider call
- install_dependencies
- run_shell_command
- self_approval

**Vote artifact contract:**

- `decision_id` is required
- `evidence_pack.no_secrets` must be true
- `requester_agent` must not equal `approver_agent`
- `receipt_required` is always true
- `live_provider_call_performed`, `model_download_performed`, and `gpu_inference_performed` must remain false

**Files:**

- `GHOSTCLAW/workers/kimi/kimi-worker.policy.yaml` — policy
- `GHOSTCLAW/workers/kimi/kimi-reference-vote.schema.json` — MoA vote schema
- `GHOSTCLAW/workers/kimi/kimi-reference-vote.test.mjs` — Phase 7 contract tests
- `GHOSTCLAW/workers/registry/worker-registry.json` — registry entry
- `docs/knowledge/KIMI_K2_7_CODE_GHOSTCLAW_WORKER.md` — documentation

## 11. EdgeOne Deployment Readiness

GHOSTCLAW tracks EdgeOne deployment readiness as a separate gate. Deployment requires:

- All tests pass
- KOB validator sign-off
- Hermes approval
- Human approval (tier A5 minimum)

No deployment action is taken automatically. EdgeOne readiness is a reporting status only.

## 12. GitHub Toptrend Public Read-Only Research (Phase 11)

The `GHOSTCLAW/research/github-toptrend-worker.mjs` module performs public metadata-only research on GitHub repositories. It:

- Checks `gh --version` and `gh auth status` without reading or printing tokens
- Runs `gh search repos --visibility public` for public repositories only
- Stores only normalized public metadata fields: `nameWithOwner`, `description`, `stargazerCount`, `url`, `updatedAt`
- Saves output only under `.ghostclaw_runtime/research/github_trending/`
- Marks `setup_required` if `gh` is missing, auth status is unavailable, or search fails/rate-limits
- Does not clone repos, install packages, execute unknown code, read tokens, print tokens, or bypass rate limits

## 13. Validation, Receipt, Archive

Every GHOSTCLAW operation produces:

1. **Validation** — KOB validator runs tests and checks
2. **Receipt** — structured JSON artifact with hash, timestamp, decision
3. **Archive** — receipt stored in `.ghostclaw_runtime/a2a2a/receipt/` or appropriate runtime directory

Receipt types:

- Task receipts
- Decision receipts
- Model swap receipts (Phase 6)
- MoA vote records (Phase 7)
- Skill creator receipts (Phase 10)

## 14. Hard Stop Conditions

GHOSTCLAW enters hard stop when:

- Policy gate blocks an action
- Action tier X detected (push, deploy, production_action, secret_access, etc.)
- Action tier D detected (dependency_install, model_download, gpu_inference, etc.)
- Secret access attempted
- `.env` read attempted
- Live provider call attempted
- Model download attempted
- GPU inference attempted
- Self-approval attempted
- Recursive Codex/MoA launch attempted
- KV-only protocol requested

On hard stop:

1. Return a blocked receipt immediately
2. Do not proceed
3. Escalate to the authority chain
4. Log to audit trail

---

## Canonical Terminology

| Term | Status |
|---|---|
| `brainstorm` | **canonical** |
| `beststorm` | legacy alias |
| `beststrom` | invalid typo (rejected) |
