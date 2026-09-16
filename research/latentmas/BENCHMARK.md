# BENCHMARK — LatentMAS Results

## Target MVP Commands

```bash
# LatentMAS
cargo run -p katgpt-orchestrator -- bench \
  --model Qwen/Qwen3-4B-Instruct \
  --dataset benchmarks/gsm8k_small.jsonl \
  --mode latentmas \
  --latent-steps 40,20,40,20 \
  --agents planner,critic,refiner,solver \
  --device cuda \
  --dtype float16 \
  --out runs/gsm8k_latentmas_40.jsonl

# TextMAS (baseline)
cargo run -p katgpt-orchestrator -- bench \
  --model Qwen/Qwen3-4B-Instruct \
  --dataset benchmarks/gsm8k_small.jsonl \
  --mode textmas \
  --agents planner,critic,refiner,solver \
  --device cuda \
  --out runs/gsm8k_textmas.jsonl

# Single Model (baseline)
cargo run -p katgpt-orchestrator -- bench \
  --model Qwen/Qwen3-4B-Instruct \
  --dataset benchmarks/gsm8k_small.jsonl \
  --mode single \
  --device cuda \
  --out runs/gsm8k_single.jsonl

# Single Model + Matched Compute (critical baseline)
cargo run -p katgpt-orchestrator -- bench \
  --model Qwen/Qwen3-4B-Instruct \
  --dataset benchmarks/gsm8k_small.jsonl \
  --mode singlematched \
  --latent-steps 40,20,40,20 \
  --device cuda \
  --out runs/gsm8k_single_matched.jsonl

# Comparison report
cargo run -p katgpt-orchestrator -- report \
  --input runs/gsm8k_latentmas_40.jsonl \
  --compare runs/gsm8k_textmas.jsonl \
  --format markdown
```

## Expected Results Template

### GSM8K-mini (50 problems) — Qwen3-4B-Instruct

| Mode | Accuracy | Avg Tokens | Avg Latency | Peak Memory |
|------|----------|------------|-------------|-------------|
| Single | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| Single (matched compute) | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| TextMAS | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| LatentMAS (40,20,40,20) | _TBD_ | _TBD_ | _TBD_ | _TBD_ |

### Key Metrics to Report

| Metric | Single | Single-Matched | TextMAS | LatentMAS |
|--------|--------|-----------------|---------|-----------|
| Accuracy | — | — | — | — |
| Total Tokens | — | — | — | — |
| Token Reduction vs TextMAS | — | — | baseline | — |
| Speedup vs TextMAS | — | — | 1.0× | — |
| Alignment Residual | N/A | — | N/A | — |
| KV Transfer Fidelity | N/A | N/A | N/A | — |

### Ablation: Latent Step Count

| Steps (P,C,R,S) | Accuracy | Tokens | Latency | Convergence? |
|-------------------|----------|--------|---------|-------------|
| 10,5,10,5 | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| 20,10,20,10 | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| 40,20,40,20 | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| 80,40,80,40 | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| 160,80,160,80 | _TBD_ | _TBD_ | _TBD_ | _TBD_ |

### Ablation: Agent Count

| Agents | Accuracy | Tokens | Latency | Token Reduction |
|--------|----------|--------|---------|-----------------|
| 2 (planner, solver) | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| 3 (planner, critic, solver) | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| 4 (planner, critic, refiner, solver) | _TBD_ | _TBD_ | _TBD_ | _TBD_ |

### Paper Reference Numbers (for comparison)

| Metric | Paper (LatentMAS) | Our Result |
|--------|-------------------|------------|
| Token reduction vs TextMAS | 70.8%–83.7% | _TBD_ |
| Speedup vs TextMAS | 4×–4.3× | _TBD_ |
| Accuracy gain vs single model | +13.3% to +14.6% | _TBD_ |

## Notes

- All results on this page are _TBD_ until first successful benchmark run.
- Results must include: model name, device, dtype, seed, date.
- Statistical rigor: bootstrap 95% CI, Cohen's d, Bonferroni correction for multiple comparisons.