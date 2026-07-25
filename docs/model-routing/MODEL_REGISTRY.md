# GhostClaw Model Registry V2.1

## Active Lanes

| Lane | Model Ref | Provider | Role | Default Gate |
|---|---|---:|---|---|
| local_qwen_worker | `ollama/${LOCAL_QWEN_MODEL}` | Local | classify, summarize, light patch | Local only |
| laguna_free_coder | `openrouter/poolside/laguna-m.1:free` | OpenRouter | free agentic coding draft | Free/rate limited |
| qwen3_coder_free | `openrouter/qwen/qwen3-coder:free` | OpenRouter | repo-aware coding draft | Free/rate limited |
| kimi_code_worker | `openrouter/moonshotai/kimi-k2.7-code` | OpenRouter | long-horizon coding, UI/code generation | Budget gate |
| deepseek_architect | `openrouter/deepseek/deepseek-v3.2-exp` | OpenRouter | architecture and failure analysis | Budget gate |
| fable5_orchestrator | `openrouter/anthropic/claude-fable-5` | OpenRouter | founder-level architecture, strategy, complex debugging synthesis | `APPROVE_OPENROUTER_FABLE5_PROVIDER_CALL_A019E53EE` |
| glm_repo_mapper | `custom/glm-5.2` | Custom gateway | long-context repo mapping | Review only |
| codex_peer | `codex/default` | OpenAI Codex | peer engineer / rescue / adversarial review | Budget gate |
| opus_deep_reasoner | `claude/opus` | Claude Code | deep reasoning | Budget gate |
| sonnet_fast_worker | `claude/sonnet` | Claude Code | mechanical execution | Budget gate |

## Role Rules

- Free models draft.
- Local models classify.
- Codex challenges.
- Claude/Fable synthesizes.
- Fable5 is never a polling/default route; it is an explicit high-reasoning gate.
- Validator verifies.
- Policy Guardian can veto every lane.
