# PC/Mac Load Shedding and Private-Network Plan

State: `DESIGNED / NOT DEPLOYED`

## Goal

Prevent the Mac mini M2 from becoming the CPU, memory, network, browser,
training, routing, Telegram, and orchestration bottleneck at the same time.

## Node roles

### Mac mini M2 — authoritative control plane

Keep only latency-sensitive and authority-sensitive services:

- Hermes Commander;
- GhostClaw PDP/PEP;
- GraphFleet mission/DAG state;
- Telegram single-consumer gateway;
- authoritative node/lease/approval/receipt registry;
- lightweight status dashboard;
- optional small local emergency model.

The Mac must not automatically absorb PC training, large model loading,
dataset preprocessing, browser automation, or large batch tests when the PC
fails.

### Windows PC — compute and interaction worker

Move these workloads to the PC:

- `llama.cpp`, Ollama, or vLLM inference;
- model download staging, hashing, scanning, and conversion;
- Unsloth QLoRA training;
- dataset validation and preprocessing;
- DSH and jcode sessions;
- AutoClaw workers;
- browser/CUA disposable desktop;
- Playwright/browser regression;
- batch evaluation;
- optional inactive LiteLLM standby.

## Admission controller

Before accepting a lease, the PC reports:

```text
gpu_free_vram_mb
gpu_total_vram_mb
gpu_utilization_percent
gpu_temperature_c
system_available_ram_mb
disk_free_mb
cpu_load_percent
active_model_ids
active_training_job
active_browser_session
queue_depth
active_lease_count
heartbeat_age_ms
```

Suggested initial conservative policy:

- one training job at a time;
- no browser/CUA GPU workload during training;
- no second large model when available VRAM is below the declared model
  envelope plus safety margin;
- pause intake when GPU temperature, RAM pressure, or disk reserve crosses the
  reviewed threshold;
- keep at least 20 percent system RAM and a fixed disk reserve free;
- bounded context and concurrency on local endpoints;
- no hidden automatic cloud fallback on local OOM.

Threshold values are finalized only after the PC snapshot and one measured
canary.

## Backpressure

```text
PC HEALTHY + LEASE AVAILABLE
  → dispatch bounded compute task

PC DEGRADED
  → queue routine work
  → keep critical work fail-closed
  → do not move heavy work to Mac automatically

PC OFFLINE OR HEARTBEAT STALE
  → expire new dispatch
  → reconcile any in-flight side effect
  → preserve safe checkpoint only
  → require new fencing token before resume
```

## LiteLLM high availability

One active router instance owns the singleton lease:

```text
router_instance_lease/active-router
```

The Mac may be primary and the PC standby, or the PC may become primary after a
controlled cutover. The standby can monitor but cannot dispatch without a new
fencing token. This prevents two routers from retrying or spending against the
same request.

## Service exposure

Default binds:

| Service | Default bind |
|---|---|
| DSH Web | `127.0.0.1:3080` |
| LiteLLM | `127.0.0.1:4000` |
| OmniRoute | `127.0.0.1:20128` |
| local llama endpoint | loopback; currently observed at `127.0.0.1:8081` |
| Secure MCP Tunnel UI | loopback only |
| AutoClaw UI | loopback only |
| databases/queues | loopback or private socket only |

No service is published through home-router port forwarding.

## Private connectivity

Preferred order:

1. same-machine loopback;
2. authenticated local IPC;
3. LAN mTLS with explicit source/destination/port rules;
4. authenticated private overlay between registered nodes;
5. outbound Secure MCP Tunnel for supported OpenAI products.

Every cross-node channel requires:

- registered node ID;
- pinned public-key/certificate fingerprint;
- mutual authentication;
- encrypted transport;
- short-lived session/lease;
- replay protection and nonce;
- route allowlist;
- heartbeat TTL;
- request and result hashes;
- disconnect/revocation control.

## Network zones

```text
ZONE 0 — CONTROL
Mac Hermes, GhostClaw, queue, approval registry

ZONE 1 — COMPUTE
PC node agent, local inference, training, dataset staging

ZONE 2 — TOOL
Serena read-only MCP, browser/CUA disposable desktop

ZONE 3 — EDGE
iPhone/iPad/Termux command and evidence clients

ZONE 4 — CLOUD
Direct providers through LiteLLM and bounded OpenRouter broker
```

Cross-zone actions are deny-by-default. The browser/CUA zone cannot reach the
control zone, secret facility, or personal browser profile.

## Mac stability controls

- process memory and CPU limits for noncritical services;
- queue depth and stale-lease alerts;
- disable duplicate local model servers;
- single Telegram consumer;
- log rotation and disk-reserve alert;
- child-process ownership and graceful shutdown;
- circuit breakers for failing providers;
- no infinite restart loop;
- no automatic package upgrade during active missions;
- stop heavy workers when the PC is available rather than running duplicate
  copies on both nodes.

## Failure receipts

Each failure receipt records:

```text
task_id
node_id
lease_id
fencing_token
service
process_identity
started_at
last_heartbeat
failure_category
side_effect_attempted
side_effect_reconciled
checkpoint_hash
retry_owner
retry_allowed
next_safe_action
```

The plan reaches `NETWORK_CANARY_READY` only after node identity, mTLS/private
overlay connectivity, firewall allowlist, heartbeat, lease, disconnect, and
replay-negative tests pass.
