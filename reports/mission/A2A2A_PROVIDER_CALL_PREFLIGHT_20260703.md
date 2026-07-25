# A2A2A Provider Call Preflight

Packet: `A2A2A-P026-OPENROUTER-FABLE5-PROVIDER-CALL-PREFLIGHT-20260703`

Timestamp: `2026-07-03T04:52:13+0700`

## Requested Lane

Operator asked to do provider call first.

Current provider lane selected from Hermes config:

- Provider: `OpenRouter`
- Model: `anthropic/claude-fable-5`
- Profile: `fable5`
- Required exact gate: `APPROVE_OPENROUTER_FABLE5_PROVIDER_CALL_A019E53EE`

## Preflight Result

Status: `ready_for_exact_provider_call_gate`

Dry-run request preview passed with:

- Provider called: `false`
- Secrets read: `false`
- Key value printed: `false`
- Repo content sent: `false`
- Customer data sent: `false`
- Max tokens preview: `64`
- Temperature preview: `0`

## Request Preview

Endpoint:

```text
https://openrouter.ai/api/v1/chat/completions
```

Body preview:

```json
{
  "model": "anthropic/claude-fable-5",
  "messages": [
    {
      "role": "system",
      "content": "You are SIRINX Hermes Fable5. Use this route only for founder-level architecture, strategy, and complex debugging. Do not expose secrets. Do not claim live execution without evidence."
    },
    {
      "role": "user",
      "content": "Return compact JSON only: {\"status\":\"ok\",\"route\":\"openrouter_fable5\",\"smoke\":\"bounded\"}"
    }
  ],
  "temperature": 0,
  "max_tokens": 64,
  "stream": false
}
```

## First Dry-Run Blocker

The first preflight goal included wording that triggered the adapter safety regex (`provider`, `secrets`). The adapter correctly failed closed. A neutral bounded-smoke prompt was then used for preview.

## Actions Not Performed

- No OpenRouter provider call was made.
- No repo content was sent to a model/provider.
- No customer data was routed.
- No key/token value was printed.
- No install, push, deploy, or Cloudflare/R2 mutation was performed.

## Next Required Gate

To execute this one bounded provider call, send exactly:

```text
APPROVE_OPENROUTER_FABLE5_PROVIDER_CALL_A019E53EE
prompt: Return compact JSON only: {"status":"ok","route":"openrouter_fable5","smoke":"bounded"}
budget: max_tokens 64, temperature 0
scope: no repo content, no customer data, no secrets, no private paths
```
