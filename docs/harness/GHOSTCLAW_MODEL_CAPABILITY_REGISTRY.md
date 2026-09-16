# GhostClaw Model Capability Registry

## Purpose

Model routing must use observed capability, not model name or hype. A fast model is not eligible as a worker until it passes local tool-use and guard tests.

## Capability Dimensions

Each model entry must record:

- `reasoning_quality`
- `context_window`
- `tool_call_stability`
- `patch_quality`
- `validation_reliability`
- `cost_per_iteration`
- `latency`
- `local_or_remote`
- `data_routing_risk`

## Routing Policy V2

Planner:

- use stronger reasoning only for architecture, scope decomposition, and task/test design
- no provider call unless explicitly approved

Worker:

- selected by tool-call stability, patch quality, cost, and speed
- must pass local synthetic benchmark before promotion

Guard:

- deterministic scripts first
- pathspec checker, JSON parser, secret scan, diff check, Semgrep when configured
- never LLM-only

Reviewer:

- review-only by default
- must not mutate source files
- must not be the same worker for critical gates

## Promotion Policy

Direct worker allowed only when:

- minimum tool-call pass rate: `0.95`
- hallucinated tool results: `0`
- forbidden path violations: `0`
- secret path attempts: `0`
- skipped validation claims: `0`

Text-only mode when:

- reasoning is useful but tool calling is unstable
- patch quality is unknown
- external provider routing is not approved

Blocked when:

- ignores scope guard
- fabricates file state
- mutates forbidden path
- attempts secret read/print
- claims review pass without evidence

## Storage

Bench result path:

```text
.ghostclaw_runtime/model_bench/tool_call_stability/<model>.json
```

No raw secrets, prompts with customer data, or provider logs may be stored.

