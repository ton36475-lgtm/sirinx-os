# Routing Matrix

## Universal Project Coverage

Apply this router to:

- GhostClaw OS / Hermes / thClaws / OpenClaw
- SIRINX public website
- SIRINXDev monorepo
- Cloudflare Workers backend
- Hermes Image Factory
- AGM / Alpha Gene Record Media
- Ads Andromeda / ADS Queen
- Final Farewell / Kusala
- Merch Automation Dashboard
- Phitsanulok United News
- AI Viral Studio / Media Factory
- Excel/Analytics/SimilarWeb/Stock reporting modules

## Build Order Rule

Even with multiple models, the build order remains:

```txt
repo_intake
→ backend_core
→ database_domain_schema
→ service_logic
→ api_contract
→ api_route_handler
→ api_client_wiring
→ frontend_state_hooks
→ components
→ pages_one_by_one
→ local_uat
→ validation
→ receipt
→ handoff
```

## Model by Layer

| Layer | Draft | Review | Final |
|---|---|---|---|
| repo_intake | local_qwen_worker | glm_repo_mapper | Hermes |
| backend_core | qwen3_coder_free | codex_peer | Fable/Hermes |
| database_schema | laguna_free_coder | codex_peer | Validator |
| service_logic | qwen3_coder_free | codex_peer | Fable |
| api_contract | laguna_free_coder | codex_peer | Validator |
| api_route_handler | qwen3_coder_free | Codex | Validator |
| frontend_hooks | laguna_free_coder | Codex | Validator |
| components | sonnet_fast_worker | laguna_free_coder | Validator |
| pages | sonnet_fast_worker | Codex | Human/UAT |
| architecture | deepseek_architect | opus_deep_reasoner + Codex | Fable5/Hermes after explicit provider-call gate |
| deploy | none | none | Human gate |
