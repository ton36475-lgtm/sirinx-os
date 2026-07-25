# GHOSTCLAW Auto Model Swap — Phase 6

**Status:** Canonical documentation
**Phase:** 6 — Model Auto Swap Router
**Effective Date:** 2026-06-30
**Canonical terminology:** `brainstorm` = canonical, `beststorm` = legacy alias, `beststrom` = invalid typo

---

## 1. Overview

The GHOSTCLAW Model Auto Swap Router (Phase 6) provides metadata-only routing of tasks to model lanes. It enables automatic, policy-bounded model selection without ever making a live provider call, reading a secret, downloading a model, or running GPU inference.

The router is a **routing-only** system — it maps task types to model lanes deterministically based on a registry and a set of lane assignments. All authority over what actions are permitted remains with the `action_tier_cap` policy gate.

---

## 2. Files

| File | Purpose |
|---|---|
| `GHOSTCLAW/models/model-registry.yaml` | Registry of models: Kimi K2.7 Code, DeepSeek V4 Pro, GLM 5.2 Max, GPT-5.5, Claude Opus 4.8 |
| `GHOSTCLAW/models/model-swap-policy.yaml` | Swap policy rules — action_tier_cap remains final authority |
| `GHOSTCLAW/models/model-router.mjs` | `ModelRouter` class with `route(taskType)` method |
| `GHOSTCLAW/models/model-router.test.mjs` | Vitest test suite |
| `GHOSTCLAW/models/provider-health.mjs` | Provider health check stub (no real calls) |
| `GHOSTCLAW/workers/model-swap/model-swap-worker.mjs` | `ModelSwapWorker` — performs metadata-only swaps |
| `GHOSTCLAW/workers/model-swap/model-swap.policy.yaml` | Worker policy file |
| `.ghostclaw_runtime/a2a2a/templates/model-swap-receipt.json` | Receipt template |

---

## 3. Registered Models

| Model Key | Display Name | Provider | Role | Default Lane |
|---|---|---|---|---|
| `kimi_k2_7_code` | Kimi K2.7 Code | Moonshot AI | coding_tool_use_reference | `code_patch` |
| `deepseek_v4_pro` | DeepSeek V4 Pro | DeepSeek | architecture_reasoner | `architecture` |
| `glm_5_2_max` | GLM 5.2 Max | Zhipu AI | high_throughput_coder | `repo_mapping` |
| `gpt_5_5` | GPT-5.5 | OpenAI | final_decision_maker | `final_decision` |
| `claude_opus_4_8` | Claude Opus 4.8 | Anthropic | critic_reviewer | `critic_review` |

Fallback: `glm_5_2_max`

---

## 4. Default Lane Routing

```text
code_patch      → Kimi K2.7 Code
repo_mapping    → GLM 5.2 Max
architecture    → DeepSeek V4 Pro
final_decision  → GPT-5.5
critic_review   → Claude Opus 4.8
unknown         → GLM 5.2 Max (fallback)
```

---

## 5. Safety Constraints (Immutable)

These constraints are enforced by `model-swap-policy.yaml`:

1. **Model swap never overrides policy gate** — `action_tier_cap` remains final authority.
2. **D/X actions auto-block** — Tier D (`dependency_install`, `external_network_write`) and Tier X (`model_download`, `gpu_inference`, `push`, `deploy`, `production_action`, `secret_access`, etc.) are auto-blocked. No model swap can reclassify these.
3. **No live provider call** — The router and worker make zero provider API calls.
4. **No API key read** — No credential access.
5. **No `.env` read** — No environment file access.
6. **No model download** — No model pull/fetch triggered.
7. **No GPU inference** — No local model execution.

---

## 6. ModelRouter API

### `route(taskType)`

```javascript
import { ModelRouter } from './GHOSTCLAW/models/model-router.mjs';

const router = new ModelRouter();
const result = router.route('code_patch');

// result = {
//   blocked: false,
//   task_type: 'code_patch',
//   lane: {
//     model: 'kimi_k2_7_code',
//     display_name: 'Kimi K2.7 Code',
//     role: 'coding_tool_use_reference',
//     provider: 'moonshot_ai',
//   },
// }
```

When an action class is tier D/X:

```javascript
const blocked = router.route('push');
// blocked = {
//   blocked: true,
//   task_type: 'push',
//   reason: 'Action class "push" is blocked (tier D/X). action_tier_cap is final authority.',
// }
```

When a task type is unknown:

```javascript
const fallback = router.route('unknown_task');
// fallback = {
//   blocked: false,
//   task_type: 'unknown_task',
//   lane: { model: 'glm_5_2_max', display_name: 'GLM 5.2 Max', ... },
//   reason: 'Unknown task type "unknown_task" — routed to fallback lane: glm_5_2_max',
// }
```

---

## 7. ModelSwapWorker

The `ModelSwapWorker` class wraps the `ModelRouter` and generates a receipt for every operation.

```javascript
import { ModelSwapWorker } from './GHOSTCLAW/workers/model-swap/model-swap-worker.mjs';

const worker = new ModelSwapWorker();
const receipt = worker.swap('code_patch', 'codex');
```

Every receipt includes:

- `swap_id` — unique UUID
- `timestamp` — ISO-8601
- `from_model` / `to_model` — swap targets
- `task_type` — the task that triggered the swap
- `triggered_by` — agent that requested the swap
- `policy_version` — model-swap-policy version
- `action_tier_cap_version` — action-tier-cap version
- `approved_by` — approval source
- `receipt_hash` — deterministic integrity hash
- `blocked` — boolean

---

## 8. Provider Health Check (Stub)

`provider-health.mjs` exports a `ProviderHealthCheck` stub that returns static health status without making any real network calls. When `respectProviderHealth=true`, an unavailable target provider routes to the fallback lane (`glm_5_2_max`) with health metadata attached. A real provider probe would require separate authorization.

---

## 9. Testing

```bash
./node_modules/.bin/vitest run GHOSTCLAW/models/model-router.test.mjs
```

Test coverage:

- Default lane routing for all 5 models
- Unknown task type → fallback lane (GLM 5.2 Max)
- D/X action classes are blocked (no lane assigned)
- Explicit blocked action class overrides any otherwise routable lane
- Provider unavailable → fallback lane through metadata-only health stub
- ModelSwapWorker receipt generation for safe and blocked swaps
- Custom lane overrides
- `listLanes()` and `getFallback()` helpers

---

## 10. Relationship to Action Tier Cap

```
Task → ModelRouter.route(taskType)
         ↓
    [Is taskType in auto-block list (D/X)?]
         ├── YES → return blocked result, no lane
         └── NO  → return lane (or fallback if unknown)
                     ↓
              action_tier_cap still governs execution
              (router does NOT grant execution permission)
```

The router is advisory — it identifies which model *should* handle a task. The `action_tier_cap` policy gate decides whether the action *may* execute at all.

---

## 11. Validation & Receipt Archive

Every swap produces a receipt following the template at `.ghostclaw_runtime/a2a2a/templates/model-swap-receipt.json`. Receipts are archived for audit trail.

---

## 12. Hard Stop Conditions

- Policy gate blocks swap
- Action tier X detected
- Action tier D detected
- Secret access attempted
- `.env` read attempted
- Live provider call attempted
- Model download attempted
- GPU inference attempted
- Self-approval attempted
