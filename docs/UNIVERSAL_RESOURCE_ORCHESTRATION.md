# Universal Resource Orchestration for SIRINX OS

**Status:** staged architecture / additive, side-effect-free core
**Date:** 2026-10-04

## Purpose

This document turns heterogeneous resource optimization into a reusable SIRINX OS control layer. The scheduler optimizes **workload + data placement + compute + movement + time + failure**, not individual hardware components.

```text
Hermes Commander
      |
  GhostClaw Policy Gate
      |
 Resource Orchestrator
      |
  +---+----------------------+------------------+
  |                          |                  |
Model Router              Data Plane       Telemetry
  |                          |                  |
Bonsai / Unsloth          RAM/NVMe/NAS      Metrics
llama.cpp / local          KV/cache         Receipts
remote/cloud              checkpoints
```

## Resource model

Every device reports capabilities rather than a hard-coded hardware name:

```yaml
compute: { cpu, gpu, npu }
memory: { accelerator, ram, persistent }
interconnect: { pcie, nvlink, metal, usb, network }
storage: { local_nvme, remote_nvme, nas, object }
constraints: { power, thermal, bandwidth, reliability }
```

A topology is a graph. Each edge carries bandwidth, latency, contention, queue depth, direction and reliability. Scheduling decisions select a path through the graph.

## Placement policy

```text
HOT     -> accelerator memory / RAM
WARM    -> RAM / local NVMe
COLD    -> local or remote NVMe
ARCHIVE -> remote persistent tier
```

Placement uses working-set size, recency, reuse probability, latency and available capacity. Cache value is approximated as:

`reuse_probability × latency_saved`, normalized by object size and transfer cost.

## Bottleneck cascade

Measure the critical path before changing hardware:

```text
application
  -> framework
  -> runtime
  -> CPU
  -> memory
  -> interconnect
  -> accelerator
  -> storage
  -> network
```

A high GPU utilization value is not sufficient evidence of a GPU bottleneck. Interconnect saturation, I/O wait, storage queue depth or network contention can dominate total wall-clock time.

## Overlap and prefetch

The orchestrator should pipeline independent stages:

```text
compute(n)      transfer(n+1)      prefetch(n+2)      writeback(n-1)
```

The optimization target is critical-path wall-clock time, not the isolated speed of every component.

## Admission, pressure and degradation

Admission checks memory, compute, I/O and network headroom before accepting work.

Memory pressure uses hysteresis to avoid oscillation:

```text
RAM >= 85% -> begin eviction
RAM <= 70% -> stop eviction
70..85%    -> hold current policy
```

When capacity becomes constrained, degrade gracefully:

```text
FULL
  -> REDUCED_CONTEXT
  -> LOW_CONCURRENCY
  -> CPU_OFFLOAD
  -> PERSISTENT_OFFLOAD
  -> QUEUE
```

A thrashing signal requires a combination of swap activity, I/O stress and falling throughput; increasing swap blindly is not considered an optimization.

## Checkpoints and leases

Long jobs must support checkpoint/resume so work can migrate between Mac, Windows GPU, Linux VM, cloud workers or different accelerators. A resource lease has a TTL and heartbeat; expired leases are eligible for reclamation.

## Evidence-gated optimization

The promotion loop is:

```text
Observation
  -> Measurement
  -> Hypotesis
  -> Controlled Change
  -> Independent Verification
  -> Receipt
  -> Promote / Rollback
```

The resource-orchestrator package is intentionally pure and side-effect-free. It does not install software, modify services, move files, publish traffic, or promote a model by itself.

## SIFT-inspired self-improvement boundary

MIT/Sakana's SIFT framework uses pairwise MLM-as-judge comparisons plus a regularized Bradley-Terry signal to cheaply prioritize promising candidate patches before expensive downstream evaluation. This architecture can be adopted as a **ranking accelerator**, not as the final release gate.

SIRINX rule:

```text
LLM judge -> rank/search priority
cheap smoke -> reject broken candidates
benchmark -> independent truth signal
receipt + policy -> promotion gate
```

This separation is important because self-improvement systems can optimize the evaluation loop itself. A judge score must never be treated as proof of runtime correctness.

## Model-serving integration

### Ternary Bonsai 2 / Qwen3.8-27B lineage

The current PrismML Bonsai 2 27B GGUF distribution uses `PQ2_0` and `PTQ1_0` formats and a hybrid-attention runtime. PrismML states that these files require its llama.cpp fork; stock llama.cpp does not safely execute these packs. The scheduler therefore identifies the model as:

```yaml
model_family: qwen35
parameter_count: 27B
formats: [PQ2_0, PTQ1_0, F16]
runtime_capability: prismml-llama-cpp-fork
max_context: 262144
```

Actual placement is still a benchmark decision. On Apple Silicon, use the tested PrismML Bonsai-demo path and measure context length, prompt processing, decode throughput, thermal behavior and memory before promotion.

### Unsloth

Unsloth is treated as a training/adapter/export subsystem, not as a scheduler. The orchestrator records:

```yaml
training_type: [lora, full]
quantization: [4bit, 8bit, fp16, fp8]
context_length: N
optimizer: X
lora_rank: R
checkpoint: SHA
export: [lora, merged, gguf]
```

Fine-tuning experiments produce benchmark capsules and receipts; model routing consumes the resulting artifact only after independent validation.

## Control plane / data plane

Control plane:

```text
policy, scheduler, routing, leases, health, authorization, telemetry, receipts
```

Data plane:

```text
model weights, KV cache, tensors, files, embeddings, datasets, video
```

The two planes must remain separate so that a large model or dataset cannot overwhelm policy state, audit state or control messages.

## Database adapter boundary

Fleet state may be persisted to MongoDB, MySQL, Redis or another store through a repository interface. The resource-orchestrator core remains storage-agnostic:

```text
ResourceGraphRepository
  saveTopology()
  saveMeasurement()
  saveReceipt()
  findBestKnownConfiguration()
  recordLease()
```

MongoDB CRUD is an integration layer and must not become a hidden decision authority. Promotion remains policy-gated.

## Telegram / A2A2A integration

Telegram is an outbound notification surface, not the source of truth. A2A2A remains the structured mission protocol:

```text
Hermes -> route -> worker -> validator -> broker -> receipt
```

A Telegram message should reference a mission/receipt identifier rather than contain secrets or act as an unstructured override.

## Frontend motion

Anime.js can be used by the dashboard's frontend lane for status transitions, timelines and micro-interactions. It is deliberately not a dependency of the resource-orchestrator core. Motion is presentation only; telemetry and policy state remain authoritative.

## Fleet failure domains

Each resource node and interconnect receives a failure boundary:

```text
GPU failure        -> restart/reassign worker
NVMe failure       -> fallback storage
network failure    -> local path / queue
RAM pressure       -> degrade workload
agent failure      -> lease expiry / reclaim
controller failure -> safe state
```

## Implementation rule

Use capability predicates instead of vendor conditionals:

```js
if (availableMemory < workingSet) ...
if (interconnect.bandwidth < requiredBandwidth) ...
if (persistentStorage.latency > budget) ...
```

Do not encode `if (V100)`, `if (M2)`, `if (RTX...)` into the policy core unless a measured, capability-specific exception is documented with evidence.
