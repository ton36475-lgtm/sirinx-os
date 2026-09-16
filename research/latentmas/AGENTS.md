# AGENTS.md — LatentMAS Research Subsystem

**Parent:** SIRINX OS root `AGENTS.md`
**Scope:** `research/latentmas/**` + `services/latentmas-gateway/**`
**SRL Level:** SRL-2 (local working baseline)
**Autonomy:** A3 (LLM inside deterministic workflow, no external action)

---

## Scope

This file governs all agent and developer activity within the LatentMAS
research subsystem. It **adds** stricter rules on top of the root AGENTS.md.
It cannot weaken root rules.

### Allowed Paths

```
research/latentmas/**
services/latentmas-gateway/**
docs/latentmas*/**
```

### Forbidden Paths

```
.env
.env.*
!.env.example
infra/cloudflare/**
services/live-chat-gateway/**
GHOSTCLAW/**
.thclaws/**
.ghostclaw_runtime/**
```

---

## What LatentMAS Is

LatentMAS is a research prototype implementing latent collaboration between
LLM agents. Instead of communicating via text, agents exchange latent
representations (hidden states / KV cache).

**Key principle:** Text is the interface for humans. Latent/KV should be the
transport layer between agents.

### Architecture

```
Rust Orchestrator (katgpt-orchestrator)
  ├── CLI: run, bench, report, doctor
  ├── Agent graph + scheduler
  ├── JSONL protocol ↔ Python subprocess
  └── Metrics + logging

Python Backend (latent_backend)
  ├── alignment.py    — compute Wa (ridge/SVD)
  ├── latent_step.py  — hidden state → embed → forward
  ├── kv_transfer.py  — KV cache passthrough + position IDs
  └── run_agent.py    — 4 modes: single, singlematched, textmas, latentmas

Node Gateway (services/latentmas-gateway)
  ├── HTTP API with health/ready/version/status
  ├── Dry-run by default (LATENTMAS_LIVE_ENABLED=false)
  ├── Audit log + correlation_id
  └── Wraps Rust CLI
```

---

## Hard Rules (in addition to root AGENTS.md)

1. **No GPU inference without dry-run flag off.**
   - `LATENTMAS_LIVE_ENABLED=false` by default.
   - All `/run` and `/bench` calls return dry-run response when flag is off.

2. **No model downloads without approval.**
   - HuggingFace model downloads require human approval.
   - Use cached models only in development.

3. **No public exposure.**
   - Gateway binds to `localhost` only.
   - Never expose LatentMAS API publicly.

4. **No secret access.**
   - LatentMAS must never read `.env`, `.env.*`, or credential files.
   - Model paths are passed via CLI args or config, not environment secrets.

5. **Every run must be logged.**
   - JSONL logs with: model_name, mode, agents, latent_steps, seed, device,
     dtype, timestamp, correlation_id.
   - Debug mode logs text probes separately.

6. **No guaranteed claims.**
   - LatentMAS is research software. Do not claim:
     - "guaranteed speedup"
     - "guaranteed accuracy improvement"
     - "production-ready"
   - Report actual benchmark numbers with confidence intervals.

7. **Fallback must be logged.**
   - If latent communication fails, fall back to text mode.
   - Log the failure reason, KV transfer fidelity, and alignment residual.

---

## Pipeline vs Agent

LatentMAS uses a **hybrid** model:

- **Pipeline (deterministic):** Agent graph definition, JSONL protocol, metric
  collection, benchmark runner, report generation.
- **Agent (bounded):** Python backend makes decisions about latent step
  count (if adaptive), alignment method selection, and KV compression — all
  inside an allowlist.

---

## Tool Permissions

| Tool Class | Permission | Notes |
|------------|------------|-------|
| T0: Read-only local | Allowed | Read source files, configs, logs |
| T1: Local file edit | Allowed (within scope) | Edit research/latentmas/** |
| T2: Local test/build | Allowed | cargo check, cargo build, python -m py_compile |
| T3: Browser QA | N/A | Not applicable to LatentMAS |
| T4: Local AI inference | Allowed (local only) | Run on local GPU, never public |
| T5: External API dry-run | Blocked | No HF downloads without approval |
| T6: External API real | Blocked | No live inference without approval |
| T7: Cloud mutation | Blocked | Never |
| T8: Prohibited | N/A | — |

---

## Task Card Template

Every task in LatentMAS must follow:

```
Goal:
Constraints:
File Scope:
  Allowed: research/latentmas/**, services/latentmas-gateway/**
  Forbidden: .env, infra/**
Expected Result:
Verification:
  - cargo check passes
  - python -m py_compile passes
  - Gateway returns health/ready
Report Format:
  - Summary
  - Files changed
  - Tests
  - Risks
```

---

## Baseline Commands

```bash
# Build Rust orchestrator
cd research/latentmas && cargo build

# Check Rust
cargo check

# Diagnostic
./target/debug/katgpt-latentmas doctor

# Python syntax check
cd python && python3 -m py_compile latent_backend/*.py

# Start gateway (dry-run)
cd ../.. && node services/latentmas-gateway/server.mjs

# Health check
curl http://localhost:3700/health

# Status check
curl http://localhost:3700/status
```

---

## Glossary

| Term | Definition |
|------|-----------|
| Latent thought | Hidden state used as internal reasoning, not decoded to text |
| KV working memory | past_key_values passed between agents as context |
| Alignment matrix | Wa that maps hidden state → input embedding space |
| Text tax | Token cost of encode/decode round-trip in text-based agent communication |
| Attention dilution | Performance degradation from too much KV causing attention to spread thin |
| Mode collapse | All agents produce similar hidden states, no specialization |
| Chain mode | position_ids continue across agents (cumulative) |
| Reset mode | position_ids restart at 0 for each agent |
| Offset mode | position_ids offset by a fixed amount per agent |