# OhMyCodex Config Packet Review

**Updated UTC:** 2026-06-30T10:27:00Z
**Status:** ready for review, no execution
**Gate:** `OHMYCODEX_CONFIG_PACKET_ONLY`

## Scope

This packet prepares a non-executing configuration draft for connecting the
current Hermes/Codex agent team model aliases to OhMyCodex / oh-my-opencode.
It does not write live config, install the plugin, execute `postinstall`, read
secrets, call providers, push, or deploy.

## Candidate Destination Paths

The quarantined oh-my-opencode-lite tests show canonical and legacy config names:

- Project canonical: `.opencode/oh-my-openagent.jsonc`
- Project legacy: `.opencode/oh-my-opencode.jsonc`
- User canonical: `~/.opencode/oh-my-openagent.jsonc`
- User legacy: `~/.opencode/oh-my-opencode.jsonc`

This lane does not choose a destination. The operator must choose one path in a
later gate.

## Config Draft Summary

The runtime packet contains:

- `default_run_agent`: `codex-build-captain`
- `agent_order`: Hermes, Opus, Codex, GLM52, DeepSeek, Kimi
- `model_fallback`: enabled
- `agents.build.model`: `codex-local`
- `agents.build.fallback_models`: Kimi K2.7 Code, GLM 5.2, DeepSeek V4 Pro
- `agents.oracle.model`: GPT-5.5 alias for final decision review only
- `disabled_commands`: high-risk automation commands from the plugin schema
- `mcp_env_allowlist`: empty, to avoid secret propagation

## Review Artifacts

- Runtime packet:
  `.ghostclaw_runtime/a2a2a/reviews/ohmycodex_config_packet_20260630T102700Z.json`
- Receipt:
  `.ghostclaw_runtime/a2a2a/receipts/ohmycodex_config_packet_20260630T102700Z.json`
- Alias manifest:
  `.ghostclaw_runtime/model_router/ohmycodex_model_aliases_20260630T100425Z.json`
- Team readiness report:
  `.ghostclaw_runtime/a2a2a/receipts/ohmycodex_model_team_readiness_20260630T112800Z.json`
- Current live-config smoke report:
  `.ghostclaw_runtime/a2a2a/receipts/ohmycodex_live_config_smoke_project_canonical_20260630T115500Z.json`
- Current activation status:
  `.ghostclaw_runtime/a2a2a/receipts/ohmycodex_activation_status_project_canonical_20260630T121000Z.json`
- Activation dry-run receipt:
  `.ghostclaw_runtime/a2a2a/receipts/ohmycodex_activation_dry_run_project_canonical_20260630T132000Z.json`
- Dry-run validator:
  `scripts/ghostclaw_ohmycodex_config_packet.py`

## Dry-Run Validation

```bash
python3 scripts/ghostclaw_ohmycodex_config_packet.py \
  --packet .ghostclaw_runtime/a2a2a/reviews/ohmycodex_config_packet_20260630T102700Z.json \
  --preview
```

The validator is dry-run by default. Its write mode is locked behind an exact
destination environment gate, and it rejects packets that enable provider calls,
secret access, plugin install, postinstall execution, push, deploy, or
production mutation.

## Destination Apply Plan

```bash
python3 scripts/ghostclaw_ohmycodex_config_packet.py \
  --packet .ghostclaw_runtime/a2a2a/reviews/ohmycodex_config_packet_20260630T102700Z.json \
  --destination-label project_canonical \
  --apply-plan
```

Current evidence:

`.ghostclaw_runtime/a2a2a/evidence/ohmycodex_project_canonical_apply_plan_20260630T104500Z.json`

The project-canonical apply plan resolves to:

`.opencode/oh-my-openagent.jsonc`

The apply plan does not write that file. Actual write mode requires both
`--write` and the exact environment gate:

`APPROVE_OHMYCODEX_CONFIG_WRITE_PROJECT_CANONICAL=1`

## A2A Review Dispatch

The packet has been dispatched as probe-only review tasks to the local A2A
inboxes for Hermes, Codex, and OpenCode. These tasks request reviewer notes
only and explicitly block live config writes, provider calls, secret access,
plugin install, dependency install, push, deploy, and production mutation.

Review task packets:

- `.ghostclaw_runtime/a2a2a/inbox/hermes/ohmycodex_config_review_hermes_20260630T111802.662741Z.json`
- `.ghostclaw_runtime/a2a2a/inbox/codex/ohmycodex_config_review_codex_20260630T111802.662741Z.json`
- `.ghostclaw_runtime/a2a2a/inbox/opencode/ohmycodex_config_review_opencode_20260630T111802.662741Z.json`

Probe acknowledgements:

- `.ghostclaw_runtime/a2a2a/receipts/ack_hermes_ohmycodex_config_review_hermes_20260630T111802.662741Z.json`
- `.ghostclaw_runtime/a2a2a/receipts/ack_codex_ohmycodex_config_review_codex_20260630T111802.662741Z.json`
- `.ghostclaw_runtime/a2a2a/receipts/ack_opencode_ohmycodex_config_review_opencode_20260630T111802.662741Z.json`

Receipt status is `acknowledged_probe_only`. The probe recorded
`payload_executed=false`, `paid_model_calls=false`, `secret_access=false`,
`git_push=false`, and `deploy=false` for all three review packets.

Note: the same probe scan also acknowledged older unprocessed inbox packets.
Those receipts are local probe receipts only and do not prove real agent
execution.

## Team Readiness Status

The readiness report currently returns `ready_for_review_no_execution`.

Verified:

- required aliases exist for GLM 5.2, DeepSeek V4 Pro, Kimi K2.7 Code, and
  GPT-5.5
- config draft includes `codex-local`, GLM 5.2, DeepSeek V4 Pro, Kimi K2.7
  Code, GPT-5.5, and Claude Opus 4.8
- project-canonical apply plan is safe and non-writing
- Hermes, Codex, and OpenCode review ack receipts are probe-only and safe
- no candidate OhMyCodex live config file exists yet

This proves the team config is review-ready. It does not prove live OhMyCodex
loading, provider model availability, or real multi-agent execution.

## Live Config Smoke Gate

After an exact destination write gate is opened and the config file exists, run
the live config smoke check before any OpenCode runtime check:

```bash
python3 scripts/ghostclaw_ohmycodex_config_packet.py \
  --packet .ghostclaw_runtime/a2a2a/reviews/ohmycodex_config_packet_20260630T102700Z.json \
  --destination-label project_canonical \
  --apply-plan-path .ghostclaw_runtime/a2a2a/evidence/ohmycodex_project_canonical_apply_plan_20260630T104500Z.json \
  --smoke-live-config
```

The smoke check validates that the selected config file:

- exists at the selected destination
- exactly matches the packet `config_draft`
- has the expected stable SHA-256
- keeps `mcp_env_allowlist` empty
- contains `codex-local`, GLM 5.2, DeepSeek V4 Pro, Kimi K2.7 Code, and GPT-5.5
- keeps risky OhMyCodex commands disabled

The current project-canonical smoke report returns `not_ready` because
`.opencode/oh-my-openagent.jsonc` has not been written yet. This is expected
before the live config write gate is opened. The smoke check does not start
OpenCode, call providers, read secrets, push, or deploy.

## Activation Controller

Current status:

```bash
python3 scripts/ghostclaw_ohmycodex_config_packet.py \
  --packet .ghostclaw_runtime/a2a2a/reviews/ohmycodex_config_packet_20260630T102700Z.json \
  --destination-label project_canonical \
  --apply-plan-path .ghostclaw_runtime/a2a2a/evidence/ohmycodex_project_canonical_apply_plan_20260630T104500Z.json \
  --activation-status
```

The activation status currently returns `ready_for_activation_gate` with
`approval_env_set=false` and `target_exists=false`.

If the operator chooses the project-canonical destination, activate with the
exact scoped gate:

```bash
APPROVE_OHMYCODEX_CONFIG_WRITE_PROJECT_CANONICAL=1 \
python3 scripts/ghostclaw_ohmycodex_config_packet.py \
  --packet .ghostclaw_runtime/a2a2a/reviews/ohmycodex_config_packet_20260630T102700Z.json \
  --destination-label project_canonical \
  --activate \
  --store-activation-result .ghostclaw_runtime/a2a2a/receipts/ohmycodex_activation_project_canonical.json
```

Activation writes only the selected config file, creates a rollback backup if a
file already exists, and immediately runs the live-config smoke verifier. It
does not start OpenCode, call providers, read secrets, push, or deploy.

## Activation Dry Run

Before opening the live write gate, the activation flow was tested in an
isolated sandbox:

```bash
python3 scripts/ghostclaw_ohmycodex_config_packet.py \
  --packet .ghostclaw_runtime/a2a2a/reviews/ohmycodex_config_packet_20260630T102700Z.json \
  --destination-label project_canonical \
  --activation-dry-run \
  --sandbox-root .ghostclaw_runtime/a2a2a/sandboxes/ohmycodex_activation_project_canonical_20260630T132000Z \
  --store-activation-result .ghostclaw_runtime/a2a2a/receipts/ohmycodex_activation_dry_run_project_canonical_20260630T132000Z.json
```

Result: `dry_run_smoke_passed_no_provider_call`

The sandbox wrote:

`.ghostclaw_runtime/a2a2a/sandboxes/ohmycodex_activation_project_canonical_20260630T132000Z/.opencode/oh-my-openagent.jsonc`

The real project/user OhMyCodex config paths remain unwritten. This proves the
activation packet can materialize and pass smoke checks without touching live
configuration.

## Read-Only Load Check

The read-only load check validates an OhMyCodex config file on disk without
starting OpenCode, calling providers, reading secrets, pushing, or deploying.
Use it first against the sandbox activation output, then rerun it against the
selected live config only after the exact write gate has been opened.

Sandbox proof:

```bash
python3 scripts/ghostclaw_ohmycodex_config_packet.py \
  --packet .ghostclaw_runtime/a2a2a/reviews/ohmycodex_config_packet_20260630T102700Z.json \
  --destination-label project_canonical \
  --apply-plan-path .ghostclaw_runtime/a2a2a/evidence/ohmycodex_project_canonical_apply_plan_20260630T104500Z.json \
  --read-only-load-check \
  --config-path .ghostclaw_runtime/a2a2a/sandboxes/ohmycodex_activation_project_canonical_20260630T132000Z/.opencode/oh-my-openagent.jsonc \
  --store-load-check-result .ghostclaw_runtime/a2a2a/receipts/ohmycodex_read_only_load_check_sandbox_project_canonical_20260630T140000Z.json
```

Current sandbox result:

`.ghostclaw_runtime/a2a2a/receipts/ohmycodex_read_only_load_check_sandbox_project_canonical_20260630T140000Z.json`

Expected status:

`load_check_passed_no_runtime_start`

The check confirms:

- the config file exists and parses as JSON
- the config exactly matches the packet `config_draft`
- the stable SHA-256 matches the apply-plan packet
- `codex-local`, GLM 5.2, DeepSeek V4 Pro, Kimi K2.7 Code, and GPT-5.5 are present
- risky OhMyCodex commands remain disabled
- `mcp_env_allowlist` remains empty

After live activation, rerun the same command without `--config-path` so the
selected destination label resolves to `.opencode/oh-my-openagent.jsonc`.

## Activation Handoff Packet

The activation handoff packet is the final local-only bridge before a real
config write. It records the exact environment gate, target path, packet hash,
rollback path, activation command, smoke command, and read-only load-check
command. It does not write config by itself.

```bash
python3 scripts/ghostclaw_ohmycodex_config_packet.py \
  --packet .ghostclaw_runtime/a2a2a/reviews/ohmycodex_config_packet_20260630T102700Z.json \
  --destination-label project_canonical \
  --apply-plan-path .ghostclaw_runtime/a2a2a/evidence/ohmycodex_project_canonical_apply_plan_20260630T104500Z.json \
  --activation-handoff \
  --store-activation-handoff .ghostclaw_runtime/a2a2a/receipts/ohmycodex_activation_handoff_project_canonical_20260630T142500Z.json
```

Current handoff:

`.ghostclaw_runtime/a2a2a/receipts/ohmycodex_activation_handoff_project_canonical_20260630T142500Z.json`

Expected status:

`ready_for_exact_gate`

The handoff keeps the real write behind:

`APPROVE_OHMYCODEX_CONFIG_WRITE_PROJECT_CANONICAL=1`

Preferred one-shot gated activation command:

```bash
APPROVE_OHMYCODEX_CONFIG_WRITE_PROJECT_CANONICAL=1 \
bash scripts/ohmycodex-activate-and-verify-project-canonical
```

This command writes only the selected OhMyCodex config file and then stores:

- activation receipt
- live config smoke receipt
- live read-only load-check receipt
- goal completion audit receipt
- aggregate activate-and-verify receipt

If the exact environment gate is not set, the command fails before writing any
live config.

The wrapper expands to the underlying `--activate-and-verify` helper command
and keeps all receipt paths pinned to the project-canonical target.

Post-write verification must run both:

- live config smoke check
- read-only load check against the selected destination

## Activation Preflight

Before the exact write gate is opened, run the wrapper in preflight mode:

```bash
bash scripts/ohmycodex-activate-and-verify-project-canonical --preflight
```

Preflight is read-only. It checks the selected project-canonical target and
stores a timestamped receipt at:

`.ghostclaw_runtime/a2a2a/receipts/ohmycodex_activation_preflight_project_canonical_<UTC>.json`

The wrapper also accepts `OHMYCODEX_PREFLIGHT_RECEIPT=/path/to/preflight.json`
for tests or isolated receipt storage. This avoids overwriting older preflight
receipts and keeps activation evidence append-only until the exact write gate is
opened.

## Goal Completion Audit

Use the completion audit to prevent marking the OhMyCodex model-team goal done
before the live config exists and the post-write checks pass.

```bash
python3 scripts/ghostclaw_ohmycodex_config_packet.py \
  --packet .ghostclaw_runtime/a2a2a/reviews/ohmycodex_config_packet_20260630T102700Z.json \
  --destination-label project_canonical \
  --goal-completion-audit \
  --readiness-path .ghostclaw_runtime/a2a2a/receipts/ohmycodex_model_team_readiness_20260630T112800Z.json \
  --handoff-path .ghostclaw_runtime/a2a2a/receipts/ohmycodex_activation_handoff_project_canonical_20260630T142500Z.json \
  --activation-path .ghostclaw_runtime/a2a2a/receipts/ohmycodex_activation_project_canonical.json \
  --smoke-path .ghostclaw_runtime/a2a2a/receipts/ohmycodex_live_config_smoke_project_canonical.json \
  --load-check-path .ghostclaw_runtime/a2a2a/receipts/ohmycodex_read_only_load_check_live_project_canonical.json \
  --store-goal-audit .ghostclaw_runtime/a2a2a/receipts/ohmycodex_goal_completion_audit_project_canonical_20260630T144500Z.json
```

Current audit:

`.ghostclaw_runtime/a2a2a/receipts/ohmycodex_goal_completion_audit_project_canonical_20260630T144500Z.json`

Current status:

`not_complete`

Latest stdout-only audit refresh:

`2026-06-30T16:56:02Z`

Confirmed complete:

- config packet contains `codex-local`, GLM 5.2, DeepSeek V4 Pro, Kimi K2.7
  Code, and GPT-5.5 aliases
- Hermes/Codex routing is declared
- team readiness receipt is review-ready
- activation handoff records the exact env gate and post-write checks

Still missing:

- live `.opencode/oh-my-openagent.jsonc` config write
- activation receipt
- live smoke receipt
- live read-only load-check receipt

The goal remains open until those four missing proofs exist and pass.

Activation success refresh:

`2026-06-30T17:12:56Z`

The exact project-canonical gate was opened for one invocation:

`APPROVE_OHMYCODEX_CONFIG_WRITE_PROJECT_CANONICAL=1`

Result:

- live config exists at `.opencode/oh-my-openagent.jsonc`
- config SHA-256:
  `b93df6ad9905524524d9410d3bf79b265dadcc9b08701bbc80cf6f8d8df1fb9d`
- activation status: `activated_smoke_passed_no_provider_call`
- smoke status: `smoke_passed_no_provider_call`
- read-only load-check status: `load_check_passed_no_runtime_start`
- goal audit status: `complete`
- no OpenCode runtime start, provider call, secret access, push, or deploy

Activation receipts:

- `.ghostclaw_runtime/a2a2a/receipts/ohmycodex_activation_project_canonical.json`
- `.ghostclaw_runtime/a2a2a/receipts/ohmycodex_live_config_smoke_project_canonical.json`
- `.ghostclaw_runtime/a2a2a/receipts/ohmycodex_read_only_load_check_live_project_canonical.json`
- `.ghostclaw_runtime/a2a2a/receipts/ohmycodex_goal_completion_audit_project_canonical.json`

Completed evidence:

- config packet contains `codex-local`, GLM 5.2, DeepSeek V4 Pro, Kimi K2.7
  Code, and GPT-5.5
- Hermes is present in `agent_order`
- Codex is the default build captain
- readiness receipt passed
- activation handoff is ready

Missing evidence:

- live `.opencode/oh-my-openagent.jsonc` config has not been written
- activation receipt has not passed
- live smoke receipt has not passed
- live read-only load check has not passed

## Required Before Live Config Write

1. Human selects exactly one destination config path.
2. Rollback snapshot of the existing config path is created.
3. Current provider model names are verified without printing secrets.
4. Kimi billing/auth blocker is resolved or Kimi remains disabled/fallback only.
5. Local smoke receipt proves OpenCode reads the config without executing risky
   plugin commands.

## Hard Blocks

- No provider call
- No API key, `.env`, token, or cookie read
- No plugin install
- No `postinstall`
- No dependency install
- No push
- No deploy
- No production mutation

## Next Safe Gate

`APPROVE_OHMYCODEX_CONFIG_WRITE_<DESTINATION_LABEL>`

The destination label must identify either project or user config and canonical
or legacy path. Without that exact gate, this packet stays review-only.
