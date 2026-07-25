# MODEL_BENCH_RECEIPT_V1_6
# Gemma 4 MLX Performance Benchmark - Local First

## Status
- **Target Model**: gemma4:12b-mlx (not pulled yet)
- **Fallback Available**: qwen3.5:4b, llama3.2:3b
- **Network State**: OFFLINE / CAPTIVE_OR_LIMITED mode

## Available Models (Current)
```
hf.co/empero-ai/Qwythos-9B-Claude-Mythos-5-1M-GGUF:Q4_K_M
kimi-k2.7-code:cloud
qwen3.5:4b
qwen3.5:2b
deepseek-r1-lite:latest
hermes-prime-lite:latest
hermes-prime-16k:latest
deepseek-r1-16k:latest
deepseek-r1:1.5b
qwen2.5:latest
hermes-prime:latest
llama3.2:3b
```

## Recommended Pull (When ONLINE_AUTHORIZED)
```bash
ollama pull gemma4:12b-mlx
```

## Routing Decision
- **local_fast_coder**: gemma4:12b-mlx (pending pull)
- **local_light_edge**: gemma4:e4b-mlx (pending)  
- **fallback**: qwen3.5:4b

## Hard Blocks Applied
- secret_read: true
- auto_push: true
- auto_deploy: true
- telegram_live_send_without_gate: true
- network_bypass: true

## Next Actions
1. Pull gemma4:12b-mlx when ONLINE_AUTHORIZED
2. Run benchmark: `python3 scripts/bench_ollama_tokens.py gemma4:12b-mlx`
3. Lock performance receipt
4. Update hermes config to use gemma4 as default local coder