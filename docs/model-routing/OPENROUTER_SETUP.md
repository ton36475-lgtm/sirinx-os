# OpenRouter Setup for GhostClaw

## Install

Use any OpenAI-compatible client and set:

```bash
export OPENROUTER_API_KEY=
export OPENAI_BASE_URL="https://openrouter.ai/api/v1"
```

## Direct curl smoke test

```bash
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "poolside/laguna-m.1:free",
    "messages": [
      {"role": "user", "content": "Return only: ghostclaw model router ok"}
    ]
  }'
```

## Safe Usage

Start with:
- `poolside/laguna-m.1:free`
- `qwen/qwen3-coder:free`

Avoid using `openrouter/free` as deterministic default for repo mutation because it randomly selects from free models. It is acceptable for exploration only.

## Fable5 Hermes Telegram Route

Fable5 is configured as an explicit high-reasoning route only:

```txt
provider: OpenRouter
model: anthropic/claude-fable-5
codex profile: fable5
dry-run command: /fable5 preview
provider-call gate: APPROVE_OPENROUTER_FABLE5_PROVIDER_CALL_A019E53EE
```

Do not use Fable5 for heartbeat polling, repeated status checks, routine
summaries, formatting, bulk docs, or unbounded retries. Verify model
availability and budget before opening the provider-call gate.

## Receipt

Every model-assisted patch must write:

```txt
docs/receipts/model-router/<mission_id>-<job_id>.json
```
