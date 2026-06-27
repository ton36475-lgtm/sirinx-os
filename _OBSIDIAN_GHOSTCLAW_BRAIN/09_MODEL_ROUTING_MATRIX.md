# 09 — Model Routing Matrix

**Purpose:** Which model/agent handles which task type

---

## Authority Order (Immutable)

```
hermes_commander > opus_architect > codex_build_captain > glm52_worker > deepseek_worker > kob_validator
```

## Skill Priority

| Task Type | Primary | Secondary |
|---|---|---|
| Architecture | opus_architect | codex_build_captain |
| Repo Integration | codex_build_captain | opus_architect |
| Localized Coding | glm52_worker, deepseek_worker | codex_build_captain |
| Test Generation | glm52_worker, deepseek_worker | codex_build_captain |
| Validation | kob_validator | codex_build_captain |
| Mission Routing | hermes_commander | — |
| Failure Diagnosis | opus_architect | codex_build_captain, hermes_commander |
| Bug Analysis | deepseek_worker | opus_architect |
| Documentation | glm52_worker | codex_build_captain |
| Security Review | opus_architect | kob_validator |

## Final Decision Authority

| Domain | Final Decider |
|---|---|
| Mission | hermes_commander |
| Architecture | opus_architect |
| Repo Patch | codex_build_captain |
| Git Stage | codex_build_captain |
| Validation | kob_validator |
| Task Completion | hermes_commander |

## Model Capabilities

| Model | Strengths | Weaknesses |
|---|---|---|
| `hermes-prime-lite` | Fast, tool-capable, local | Limited reasoning depth |
| `deepseek-r1-lite` | Deep reasoning, analysis | Slower, local-only |
| GLM-5.2 (cloud) | High throughput coding | Requires API approval |
| DeepSeek API (cloud) | Strong logic, debugging | Requires API approval |
| `qwen2.5:latest` | General fallback | Average on all |
| `llama3.2:3b` | Very fast, tiny | Limited capability |
