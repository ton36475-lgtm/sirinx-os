# OhMyCodex Model Routing Plan

**Updated UTC:** 2026-06-30T10:27:00Z
**Mode:** local metadata only
**Execution:** no provider call, no install, no deploy, no push

## Purpose

This plan connects the current Codex sidebar, Hermes sidecar sessions, and the
quarantined `oh-my-opencode-lite` intake into one reviewable model-routing
contract. It does not install or activate the plugin. It only defines aliases
that Hermes, Codex, KOB, and Mission Control can inspect before a later scoped
configuration gate.

## Current Evidence

- A2A sidebars are live in no-model mode:
  `.ghostclaw_runtime/a2a2a/receipts/a2a_sidebars_start_20260630T095407_168739Z.json`
- Model router contract exists:
  `.ghostclaw_runtime/a2a2a/receipts/phase6_model_router_contract_validation_20260630T020007Z.json`
- Kimi worker contract exists:
  `.ghostclaw_runtime/a2a2a/receipts/phase7_kimi_worker_contract_validation_20260630T020830Z.json`
- Oh-my-opencode is quarantined and audited, not installed:
  `.ghostclaw_runtime/a2a2a/receipts/github_intake_20260630T095407_136327Z.json`

## Alias Map

| Alias | Canonical lane | Role | Status |
|---|---|---|---|
| `hermes`, `hermes-commander` | `hermes_commander` | mission routing, receipts, audit | local sidecar only |
| `codex`, `codex-local` | `codex_build_captain` | repo executor and Git state owner | current Codex session only |
| `glm-5.2`, `@cf/zai-org/glm-5.2`, `zai/glm-5.2` | `glm_5_2_max` | repo mapping, docs, long-context review | routing label only |
| `deepseek-v4-pro`, `deepseek-v4` | `deepseek_v4_pro` | architecture reasoning and failure diagnosis | routing label only |
| `kimi-k2.7-code`, `kimi-code` | `kimi_k2_7_code` | code patch planning and MoA reference vote | provider blocked until funded/authenticated |
| `gpt-5.5`, `gpt-final-gate` | `gpt_5_5` | final decision and policy review | profile alias only |
| `opus`, `claude-opus-4.8` | `claude_opus_4_8` | critic review and safety audit | profile alias only |
| `ohmycodex`, `oh-my-opencode-lite` | `ohmycodex_config_source` | OpenCode config schema/reference source | quarantined, no install |

## Safe OhMyCodex Draft Contract

Future OpenCode integration may use the fields supported by the quarantined
schema, including `default_run_agent`, `agent_order`, `model_fallback`, and the
`agents.build.model` / `agents.build.fallback_models` structure. The draft must
remain outside live OpenCode config until an explicit gate approves:

- destination config path
- exact model names currently available in the provider account
- provider funding/auth status
- rollback path
- smoke test receipt

## Hard Blocks

- No provider/model call from this lane
- No API key or `.env` read
- No plugin install or postinstall execution
- No dependency install
- No Git push or deploy
- No production mutation
- No direct worker commit

## Next Safe Action

Review the manifest and config packet:

`.ghostclaw_runtime/model_router/ohmycodex_model_aliases_20260630T100425Z.json`
`.ghostclaw_runtime/a2a2a/reviews/ohmycodex_config_packet_20260630T102700Z.json`
`docs/ghostclaw/OHMYCODEX_CONFIG_PACKET_REVIEW.md`

If accepted, the next gate should choose one destination path and create a
rollback snapshot before editing any live OpenCode/Hermes config.
