# Model Policy Status

## Timestamp
2026-05-28 01:56:31 +07

## Policy
- Tier 0: deterministic tools first: `rg`, package script inspection, `git diff`, `pnpm audit:secrets`, validator shield, manifest checks.
- Tier 1: local llama.cpp server for cheap/offline local routing when `127.0.0.1:8080` is listening.
- Tier 2: cheap/free OpenRouter models for cron, short summaries, health reports, and routine classification only after model slug/quota verification.
- Tier 3: `qwen/qwen3.7-max` for deep planning, architecture synthesis, long context review, security review, and high-impact spec work.

## Current Local State
- llama.cpp server: offline on port `8080`.
- Hermes config mutation: performed for the approved 1M context request.
- Raw Hermes config: not copied into reports.
- Config backup: `/Users/sirinx/.hermes/config.yaml.backup.20260528-015509`.
- Default model: `qwen/qwen3.7-max`.
- Provider: `openrouter`.
- Base URL: `https://openrouter.ai/api/v1`.
- API mode: `chat_completions`.
- Context length: `1000000`.
- Reasoning disable: not performed.
- Compression change: not performed.

## Reason
The user approved applying the 1M context plan. Only model/provider/context keys were changed; token optimization, reasoning, compression, deploy, push, connector activation, and external sends remain out of scope.

## 1M Context Policy
- All Hermes lanes use `qwen/qwen3.7-max`.
- Router context length: `1000000`; output cap remains `512`.
- Planner context length: `1000000`; output cap remains `4096`.
- Reviewer context length: `1000000`; output cap remains `3000`.
- OpenRouter public model metadata check returned `context_length: 1000000` for `qwen/qwen3.7-max`.

## Historical Token Optimization Pack
This pack is retained as a reference for future cost-control work only. It was not applied for the 1M context request because it would switch the default model away from `qwen/qwen3.7-max`.

```bash
# Hermes Token Optimization - corrected safe block
set -e
echo "=== Hermes current config path ==="
CONFIG_PATH="$(hermes config path 2>/dev/null || echo "$HOME/.hermes/config.yaml")"
echo "$CONFIG_PATH"
if [ -f "$CONFIG_PATH" ]; then
  cp "$CONFIG_PATH" "${CONFIG_PATH}.backup.$(date +%Y%m%d_%H%M%S)"
  echo "Backup created"
fi
echo "=== Current model/compression config ==="
hermes config 2>/dev/null | grep -A5 -E "^(model|compression|agent|display):" || true
echo "=== Apply cost controls ==="
hermes config set model.max_output_tokens 1024
hermes config set model.reasoning_effort none
hermes config set display.show_reasoning false
hermes config set compression.enabled true
hermes config set compression.threshold 0.40
hermes config set compression.target_ratio 0.15
hermes config set agent.max_turns 30
echo "=== Set cheaper default model ==="
hermes config set model.default "qwen/qwen3-coder:free"
echo "=== Disable expensive toolsets if available ==="
hermes tools disable image_gen 2>/dev/null || true
hermes tools disable video 2>/dev/null || true
hermes tools disable moa 2>/dev/null || true
echo "=== Verify ==="
hermes config | grep -A6 -E "^(model|compression|agent|display):" || true
echo "Done. Start new session with /new or restart gateway."
```

## Guardrail
Do not disable reasoning for security review, architecture synthesis, major migration planning, or high-impact code review jobs. The low-cost defaults are for cron/router/short-task lanes only.

## Verification - 2026-05-28 01:56 +07
- Hermes config backup was created before mutation.
- `hermes config check`: completed.
- `hermes config` model section reports `context_length: 1000000`.
- Host context resolver with `config_context_length=1000000`: returned `1000000`.
- Hermes gateway reload: not needed because no `hermes gateway` process was running.
- OpenRouter public model metadata: `qwen/qwen3.7-max` reports `context_length: 1000000`.
- `pnpm exec vitest run services/hermes-api/src/adaptive-command-gateway.test.mjs`: passed, 11 tests.
- `pnpm audit:secrets`: passed with no findings.
- `git diff --check`: passed.
- `pnpm check`: passed.
- `pnpm verify`: passed.
- `pnpm verify:workspace`: passed.
- llama.cpp endpoint probe returned offline/not reachable on `127.0.0.1:8080`.
