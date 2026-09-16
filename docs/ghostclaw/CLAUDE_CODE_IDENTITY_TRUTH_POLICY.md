# Claude Code Identity Truth Policy

Mission ID: `GC-MAXPLUS-GLM52-LAYERED-LOCK-20260630-001`

## Rule

Report model identity only from deterministic host-side evidence:

- `.claude/settings.local.json`
- launcher environment
- guard receipt JSON
- identity canary output

Do not use model self-description, assistant prose, or the host harness name as
proof of model identity.

## Expected Identity

```text
glm-5.2 via MaxPlus proxy; not native Claude
```

## Canary Requirements

The identity canary must record:

- expected provider: `maxplus`
- expected model: `glm-5.2`
- effort cap: `high`
- config file path used
- launcher path used
- whether a provider call was avoided or executed

For this local-safe pass, provider calls are not executed.

## Local Canary Evidence

The SessionStart guard was executed locally without a provider call and wrote:

`.ghostclaw_runtime/receipts/maxplus_glm52_session_guard_latest.json`

The latest receipt records:

- expected provider: `maxplus`
- expected model: `glm-5.2`
- effort cap: `high`
- expected identity: `glm-5.2 via MaxPlus proxy; not native Claude`
- `model_self_description_is_evidence: false`
- `provider_call_executed: false`
- `secret_values_recorded: false`

This proves only the local harness identity configuration. It does not prove a
live MaxPlus provider response because live provider calls remain blocked.
