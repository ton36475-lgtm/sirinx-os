# MaxPlus Hermes Requirement Evidence Matrix

Mission ID: `MAXPLUS-HERMES-CHINESE-MODEL-20260630`

Generated: `2026-06-30T18:40:00+07:00`

Source objective: `/Users/sirinx/.codex/attachments/9cdef84e-5f0a-423f-b97c-506139d80457/pasted-text-1.txt`

This matrix is the current truth table for the pasted Hermes Agent + MaxPlus
objective. It keeps repo-side readiness separate from runtime/provider proof.
It does not contain the MaxPlus API key or any private `~/.hermes/.env` value.

## Current Verdict

`repo_side_review_ready_full_runtime_incomplete`

The local-safe repo pack is review-ready. The full objective is not complete
until private config write, Hermes runtime checks, provider smoke, gateway,
cron, subagent, and MCP connector gates are executed and verified one at a
time.

## Evidence Matrix

| Requirement | Current status | Authoritative evidence | Next exact gate |
| --- | --- | --- | --- |
| Read pasted objective without exposing key material | proven_local | sanitized objective read in this Codex run; `.ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.goal_fidelity_audit.json` | none |
| Hermes CLI is discoverable | proven_local | `.ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.preflight.json`; `.ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.hermes_cli_offline_preflight.json` | none |
| MaxPlus OpenAI Chat provider config exists | template_ready | `docs/ghostclaw/templates/hermes-maxplus-config.yaml.template` | `APPROVE_WRITE_PRIVATE_HERMES_MAXPLUS_CONFIG=1` |
| Chinese model aliases are documented | template_ready | `docs/ghostclaw/templates/hermes-maxplus-config.yaml.template` includes `deepseek-v4-flash`, `deepseek-v4-pro`, `kimi-k2.6`, `minimax-m3`, `glm-5.2`, `glm-5.1` | `APPROVE_WRITE_PRIVATE_HERMES_MAXPLUS_CONFIG=1` |
| Activation sequence is controlled from one local-safe entrypoint | proven_local | `scripts/ghostclaw/hermes_maxplus_activation_controller.py`; `.ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.activation_controller_plan.json`; `.ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.activation_controller_status.json` | none |
| Owner terminal runtime handoff exists without secret values | handoff_ready | `docs/ghostclaw/MAXPLUS_HERMES_OWNER_RUNTIME_HANDOFF.md`; `.ghostclaw_runtime/a2a2a/outbox/hermes/MAXPLUS-HERMES-CHINESE-MODEL-20260630.owner_runtime_handoff.md`; `.ghostclaw_runtime/a2a2a/gates/MAXPLUS-HERMES-CHINESE-MODEL-20260630.owner_runtime_handoff.json` | `APPROVE_WRITE_PRIVATE_HERMES_MAXPLUS_CONFIG=1` |
| Runtime completion verifier exists and reports current truth | verifier_ready_incomplete | `docs/ghostclaw/MAXPLUS_HERMES_RUNTIME_COMPLETION_VERIFIER.md`; `.ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_completion_verification.json` reports `runtime_incomplete_waiting_for_owner_gate` | `APPROVE_WRITE_PRIVATE_HERMES_MAXPLUS_CONFIG=1` |
| Private MaxPlus key stays outside repo/logs | partially_proven_owner_action_required | `docs/ghostclaw/MAXPLUS_HERMES_SECRET_HANDLING_POLICY.md`; `scripts/ghostclaw/apply_hermes_maxplus_private_config.py`; scoped secret-pattern scans | `APPROVE_WRITE_PRIVATE_HERMES_MAXPLUS_CONFIG=1` |
| `~/.hermes/config.yaml` and `~/.hermes/.env` are written for MaxPlus | incomplete_blocked | `.ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.private_config_apply_dry_run.json` only proves dry-run | `APPROVE_WRITE_PRIVATE_HERMES_MAXPLUS_CONFIG=1` |
| `hermes doctor`, `hermes status`, and `hermes model` run with redacted output | blocked_runtime_gate | `.ghostclaw_runtime/a2a2a/evidence/MAXPLUS-HERMES-CHINESE-MODEL-20260630.runtime_gate_doctor.json`; `...runtime_gate_status.json`; `...runtime_gate_model_picker.json` are dry-run evidence only | `APPROVE_HERMES_DOCTOR_CONFIG_CHECK=1`, `APPROVE_HERMES_STATUS_CONFIG_CHECK=1`, `APPROVE_HERMES_MODEL_PICKER_CHECK=1` |
| One-turn MaxPlus provider smoke succeeds | blocked_provider_gate | `.ghostclaw_runtime/a2a2a/gates/MAXPLUS-HERMES-CHINESE-MODEL-20260630.provider_smoke_gate.json`; `...runtime_gate_provider_smoke.json` is dry-run evidence only | `APPROVE_MAXPLUS_HERMES_PROVIDER_SMOKE_ONE_TURN=1` |
| Hermes gateway setup is proven without unintended live send | blocked_live_send_system_gate | `docs/ghostclaw/MAXPLUS_HERMES_ADVANCED_FEATURE_GATES.md`; `...runtime_gate_gateway_setup.json` is plan-only/dry-run evidence | `APPROVE_HERMES_GATEWAY_LOCAL_SETUP=1` plus exact platform/recipient gate |
| Hermes cron/scheduler is exercised safely | blocked_scheduler_gate | `docs/ghostclaw/MAXPLUS_HERMES_ADVANCED_FEATURE_GATES.md`; `...runtime_gate_cron_dry_run.json` is dry-run evidence only | `APPROVE_HERMES_CRON_LOCAL_DRY_RUN=1` |
| Hermes subagent one local task is exercised | blocked_runtime_gate | `docs/ghostclaw/MAXPLUS_HERMES_ADVANCED_FEATURE_GATES.md`; `...runtime_gate_subagent_local.json` is dry-run evidence only | `APPROVE_HERMES_SUBAGENT_ONE_LOCAL_TASK=1` |
| MCP server configuration is prepared without live connector mutation | blocked_connector_gate | `docs/ghostclaw/MAXPLUS_HERMES_ADVANCED_FEATURE_GATES.md`; `...runtime_gate_mcp_connector.json` is dry-run evidence only | connector-specific MCP gate |

## Latest Safe Validation

- `python3 scripts/ghostclaw/hermes_maxplus_preflight.py`: PASS, `runtime_ready=false`, Hermes present, private env exists, process key absent.
- `python3 scripts/ghostclaw/hermes_cli_offline_preflight.py`: PASS, offline probes only.
- `python3 scripts/ghostclaw/hermes_maxplus_runtime_gate_executor.py --all`: PASS, eight gates recorded as `dry_run_only`, no execution.
- `python3 scripts/ghostclaw/hermes_maxplus_activation_controller.py --plan`: PASS, activation sequence plan recorded.
- `python3 scripts/ghostclaw/hermes_maxplus_activation_controller.py --status`: PASS, local-safe probes recorded with no provider call or secret read.
- `python3 scripts/ghostclaw/hermes_maxplus_runtime_handoff.py`: PASS, owner terminal handoff recorded with no secret values.
- `python3 scripts/ghostclaw/hermes_maxplus_runtime_completion_verifier.py`: PASS, current runtime completion status remains incomplete pending owner gates.
- `python3 scripts/ghostclaw/hermes_maxplus_goal_fidelity_audit.py`: PASS, seven incomplete gated requirements.
- `python3 scripts/ghostclaw/validate_maxplus_hermes_safe_setup.py`: PASS, 222 checks, 0 failures.
- Scoped `git diff --check`: PASS for refreshed MaxPlus evidence.

## Blocked By Policy

- Printing or reading secret values.
- Running the remote installer command from the pasted objective.
- Writing private `~/.hermes` config without the exact private-config gate.
- Running provider smoke without the exact one-turn MaxPlus gate.
- Starting gateway/live messaging without exact platform and recipient gates.
- Activating recurring cron/provider work without scheduler and cost gates.
- Mutating MCP connectors without connector-specific gates.
- Push or deploy.

## Next Safe Action

Run only the private config write gate first, from the owner terminal, with the
private key supplied outside the repo. After that, rerun presence-only preflight
and open runtime gates one at a time.
