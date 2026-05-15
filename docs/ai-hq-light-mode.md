# AI HQ Light Mode

## Why

The full thClaws + MCP + 16k model smoke test was too heavy for the current Mac session. Light mode keeps the system useful without loading multiple large local agents at once.

## Current Defaults

- Hermes default model: `hermes-prime-lite`
- DeepSeek sidecar: `deepseek-r1-lite`
- thClaws max iterations: `12`
- thClaws max tokens: `4096`
- Knowledge pulse: paused/reduced from every minute

## Run Order

1. Use Codex/Hermes for active management and testing.
2. Use Ollama direct smoke tests for model health.
3. Use thClaws interactive mode only when a real workspace task needs its UI/agent surface.
4. Avoid `thclaws -p` with MCP for tiny smoke tests; it can spend too long initializing the agent loop.
5. Keep DeepSeek as an on-demand review sidecar, not always-on.

## Verified

- `test-local-ai.sh` passes with lite models.
- `hermes config check` passes.
- `npm run verify` passes.
- No Ollama model remains loaded after stop.
- Chrome opened the Manus OZ-CORP Skill HUB and reached Manus account selection.
