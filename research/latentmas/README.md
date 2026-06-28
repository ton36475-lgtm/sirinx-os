# LatentMAS — Latent Multi-Agent System

> **Text is the interface for humans. Latent/KV should be the transport layer between agents.**

A research prototype implementing latent collaboration between LLM agents based on the paper *"Latent Collaboration in Multi-Agent Systems"* (LatentMAS).

## What This Does

Instead of agents communicating via decoded text (which costs tokens, adds latency, and loses information through the encode→decode bottleneck), LatentMAS agents communicate via **latent thoughts** — hidden states and KV cache passed directly through GPU memory.

```
Traditional (TextMAS):                LatentMAS:
  Planner → text → Critic             Planner → KV → Critic
  Critic → text → Refiner             Critic → KV → Refiner
  Refiner → text → Solver            Refiner → KV → Solver
  Solver → answer                     Solver → answer

  Cost: 4× decode + token processing   Cost: 0× intermediate decode
```

## Architecture

```
katgpt-latentmas/
├── crates/
│   ├── katgpt-orchestrator/     # Rust CLI: scheduling, logging, benchmarks
│   │   └── src/
│   │       ├── main.rs          # CLI entry point (clap)
│   │       ├── python_bridge.rs  # Spawn Python subprocess, JSONL protocol
│   │       ├── agent_graph.rs   # Build agent topology
│   │       ├── scheduler.rs     # Execution plan
│   │       ├── benchmark.rs     # Summary + report generation
│   │       └── log.rs           # JSONL I/O
│   └── latent-protocol/         # Shared types (serde)
│       └── src/
│           ├── lib.rs           # Core enums: mode, alignment, position
│           ├── envelope.rs     # Wire protocol messages
│           ├── agent_state.rs   # Agent roles, configs, graph
│           └── kv_metadata.rs   # KV cache metadata + compression
├── python/
│   ├── latent_backend/
│   │   ├── __init__.py
│   │   ├── __main__.py          # python -m latent_backend entry point
│   │   ├── alignment.py         # W_a computation (ridge, SVD, learned)
│   │   ├── latent_step.py       # Core latent thought generation
│   │   ├── kv_transfer.py       # KV cache transfer + position IDs
│   │   └── run_agent.py         # Agent chain runner (4 modes)
│   └── requirements.txt
├── agents/                      # Agent YAML configs
│   ├── planner.yaml
│   ├── critic.yaml
│   ├── refiner.yaml
│   └── solver.yaml
├── benchmarks/
│   └── gsm8k_small.jsonl        # 50 GSM8K problems
├── runs/                         # Output (gitignored in production)
│   ├── logs/
│   ├── traces/
│   ├── metrics/
│   └── debug/
├── configs/                      # Experiment configs
├── probing/                      # Interpretability suite (Phase 3)
├── docs/                          # Papers, blueprints
├── Cargo.toml                    # Rust workspace root
└── README.md
```

## Quick Start

### Prerequisites
- Rust 1.70+ (cargo)
- Python 3.10+
- PyTorch 2.1+
- A CUDA GPU (12GB+ VRAM recommended for 4B models; CPU works but slowly)
- HuggingFace Transformers 4.40+

### Install

```bash
# Rust workspace
cargo build --release -p katgpt-orchestrator

# Python backend
cd python
pip install -r requirements.txt
cd ..
export PYTHONPATH="python:$PYTHONPATH"
```

### Run

```bash
# Diagnostics
cargo run -p katgpt-orchestrator -- doctor --check-python

# Single question (LatentMAS mode)
cargo run -p katgpt-orchestrator -- run \
  --model Qwen/Qwen3-4B-Instruct \
  --question "What is 15 * 12?" \
  --mode latentmas \
  --latent-steps 40,20,40,20 \
  --agents planner,critic,refiner,solver \
  --device cuda \
  --dtype float16 \
  --debug

# Benchmark (LatentMAS vs TextMAS vs Single)
cargo run -p katgpt-orchestrator -- bench \
  --model Qwen/Qwen3-4B-Instruct \
  --dataset benchmarks/gsm8k_small.jsonl \
  --mode latentmas \
  --latent-steps 40,20,40,20 \
  --agents planner,critic,refiner,solver \
  --device cuda \
  --out runs/gsm8k_latentmas.jsonl

# Compare against TextMAS
cargo run -p katgpt-orchestrator -- bench \
  --model Qwen/Qwen3-4B-Instruct \
  --dataset benchmarks/gsm8k_small.jsonl \
  --mode textmas \
  --agents planner,critic,refiner,solver \
  --device cuda \
  --out runs/gsm8k_textmas.jsonl

# Single model baseline (matched compute)
cargo run -p katgpt-orchestrator -- bench \
  --model Qwen/Qwen3-4B-Instruct \
  --dataset benchmarks/gsm8k_small.jsonl \
  --mode singlematched \
  --latent-steps 40,20,40,20 \
  --device cuda \
  --out runs/gsm8k_single_matched.jsonl

# Generate comparison report
cargo run -p katgpt-orchestrator -- report \
  --input runs/gsm8k_latentmas.jsonl \
  --compare runs/gsm8k_textmas.jsonl \
  --format markdown
```

## Modes

| Mode | Description | Intermediate Decode | KV Transfer |
|------|-------------|---------------------|------------|
| `single` | Single model, direct answer | N/A | N/A |
| `singlematched` | Single model, matched compute (same total latent steps) | 0 | No |
| `textmas` | Multi-agent, text communication | Each agent decodes text | No |
| `latentmas` | Multi-agent, KV cache communication | 0 (only final agent decodes) | Yes |

## Key Concepts

### Latent Thought Generation
1. Forward pass with `output_hidden_states=True`
2. Extract last-layer hidden state `h_t`
3. Align: `e_{t+1} = h_t @ W_a` (from hidden space → embedding space)
4. Feed `e_{t+1}` back via `inputs_embeds`
5. Repeat for `m` steps

### Alignment Matrix W_a
Maps hidden states to input embedding space so latent thoughts can be fed back into the model:
- **Ridge regression**: `W_a = (W_out^T W_out + λI)^{-1} W_out^T W_in`
- **Truncated SVD**: Factorize `W_out = U Σ V^T`, compute pseudo-inverse
- **Learned**: Fine-tuned alignment (Phase 4)

### KV Working Memory
After each agent runs its latent steps, its KV cache is passed to the next agent. The next agent conditions on all upstream KV — no text needs to be decoded or re-encoded.

## Known Limitations

- **Phase 1**: Single Python process (no parallel agents, no multi-GPU)
- **DynamicCache**: KV concatenation for HuggingFace's `DynamicCache` format is not fully implemented (static tuple format works)
- **Model compatibility**: Tested with Qwen and Llama family models; other models may have different KV cache formats
- **CPU/MPS**: Works but significantly slower than CUDA
- **Large models**: Ridge regression alignment for 14B+ models may OOM — use SVD method
- **Position IDs**: For very long agent chains, position overflow may occur and trigger fallback to reset mode

## Research Questions

See `docs/RESEARCH_BLUEPRINT_v3.md` for the full research framework:

- RQ1: Does LatentMAS outperform TextMAS at matched accuracy?
- RQ2: How many latent steps are optimal?
- RQ3: How does agent count affect performance?
- RQ4: Does model size scale the benefit?
- RQ5: Which topology is best?
- RQ6: Does it generalize across task types?

## License

MIT

## References

- Latent Collaboration in Multi-Agent Systems (LatentMAS paper)
- Tishby et al., Information Bottleneck Method (1999)
- Miller et al., Key-Value Memory Networks (2016)
- Kornblith et al., Centered Kernel Alignment (CKA)
DOCUMENTATION