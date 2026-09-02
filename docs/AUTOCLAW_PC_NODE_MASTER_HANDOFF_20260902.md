# AutoClaw PC Node Master Handoff — SIRINX/Hermes

**Mission ID:** `SIRINX-PCNODE-MODEL-LAB-20260902`  
**Target:** Windows PC GPU node  
**Authority:** Hermes Commander on the canonical Mac mini remains the only mission authority.  
**State:** `HANDOFF_READY / RUNTIME_UNVERIFIED / NO_AUTONOMOUS_EXTERNAL_MUTATION`

## 1. Objective

Convert the Windows PC into a governed compute worker for:

- local `llama.cpp` inference;
- 4B-model evaluation and bounded QLoRA experiments;
- optional Ornith-1.5-9B inference/evaluation when hardware allows;
- DeepSeek Harness and jcode clients;
- browser/computer-use tasks inside a disposable desktop;
- Serena read-only code intelligence through Secure MCP Tunnel;
- LiteLLM standby and OmniRoute local-development lanes;
- signed receipts back to Hermes Commander.

The PC is **not** a second control plane. It must not independently approve
deployment, messaging, credential use, model promotion, or production writes.

## 2. Immediate incident gate

An OpenRouter API credential was exposed in chat. Treat it as compromised.

Required human action:

1. revoke/delete the exposed key in the OpenRouter workspace;
2. inspect recent activity and spend;
3. create a replacement key with a descriptive name and a small spend limit;
4. store it in the approved secret facility;
5. provide only the secret reference to the runtime;
6. never paste the replacement into chat, source, screenshots, logs, or receipts.

No provider canary or model-pool activation may start until the rotation receipt
exists. This handoff intentionally contains no credential value.

## 3. Truth observed from the current PC screenshot

The screenshot indicates a local `llama-server` process reported:

- a Fable-Preview Q4_K_M GGUF of roughly 2.52 GB;
- loopback endpoint `http://127.0.0.1:8081`;
- working-set memory around 3 GB;
- six CPU threads;
- model-load success;
- a response-format/chat-template mismatch during the probe.

This is operator-visible evidence only. AutoClaw must verify the executable path,
binary hash, process ID, command line, model-file hash, listening socket,
`/v1/models`, and one bounded `/v1/chat/completions` probe before declaring the
endpoint usable. A successful model load is not evidence of correct chat
templating, tool calling, or agent reliability.

## 4. Canonical responsibility split

| Component | Canonical node | Responsibility |
|---|---|---|
| Hermes Commander / GhostClaw / GraphFleet | Mac mini M2 | Mission, policy, approvals, DAG, evidence graph |
| Telegram gateway | Mac mini M2 | Human command edge; single consumer only |
| OmniRoute local-development lane | PC preferred, Mac standby only | Local model capability selection |
| LiteLLM governed-service lane | One leased active instance | Direct cloud providers, budget, retry, cooldown, accounting |
| 9Router | Sandbox only | Compatibility experiments; never production routing |
| OpenRouter | Emergency/public-data broker | Free-model experiments or bounded emergency broker |
| Unsloth | PC GPU node | Training/export capability, not routing authority |
| llama.cpp / Ollama / vLLM | PC GPU node | Local inference endpoints |
| DSH / jcode / AutoClaw | PC GPU node | Clients and worker surfaces; zero retry ownership |
| Serena Secure MCP Tunnel | PC GPU node | Read-only project intelligence first |
| CUA/browser worker | PC disposable desktop | Browser/GUI execution under step and side-effect gates |

## 5. Hard invariants

1. `ONE_REQUEST = ONE_RETRY_OWNER`.
2. LiteLLM owns retries only in `CLOUD_GOVERNED`.
3. OmniRoute owns retries only in `LOCAL_DEVELOPER`.
4. OpenRouter owns retries only in `EMERGENCY_BROKER`.
5. Direct local inference has zero automatic fallback.
6. 9Router is sandbox-only and cannot sit behind or ahead of LiteLLM/OmniRoute.
7. Catalog entry, downloaded file, loaded model, and healthy route are different
   states.
8. GGUF is an inference artifact, not the source artifact for QLoRA training.
9. Model or dataset labels such as `uncensored`, `heretic`, `abliterated`,
   `tool-use`, or `production` never grant permissions.
10. No model can grant itself shell, browser, network, MCP, secret, Git, deploy,
    database, messaging, or device authority.
11. Broad phrases such as `approve all` mean only: continue actions already
    permitted by policy and request a separate exact approval for every
    consequential side effect.
12. Unknown-result side effects are never retried automatically.

## 6. Model decisions

### 6.1 Current 4B local pool

| Candidate | State | Intended lane |
|---|---|---|
| Fable-Preview 4B Q4_K_M already observed | `LOCAL_INFERENCE_REVERIFY` | no-tool chat and code evaluation |
| `hotdogs/Agents-A1-4B-Fable-Preview` | `RESEARCH_ONLY` | isolated benchmark |
| `hotdogs/Agents-A1-4B-Fable-Preview-heretic` | `QUARANTINED` | no network/tools; source audit required |
| `hotdogs/Huihui-Qwen3.5-4B-Claude-4.6-Opus-abliterated-GGUF` | `QUARANTINED` | inference-only isolated evaluation |
| `hotdogs/Qwen3.5-4B-MoLE` | `RESEARCH_CANDIDATE` | expert-level evaluation before any adapter reuse |
| `hotdogs/frankenmoe` | `REJECTED_FOR_PRODUCTION` | historical experiment only |

Do not clone every artifact. First collect metadata, exact revisions, licenses,
file inventories, SHA-256 values, tokenizer/chat-template files, model-card
claims, dependency code, and storage estimates. Download one candidate at a time
after an action-bound download approval.

### 6.2 Ornith-1.5-9B

Ornith-1.5-9B is a 9B model, not a 4B model. Register it in a separate lane:

- `ornith-1.5-9b-gguf-q4km`: inference evaluation only;
- `ornith-1.5-9b-bf16-or-4bit`: possible QLoRA base only after GPU inventory;
- no tool or shell authority during first evaluation;
- publisher benchmark claims remain unverified until reproduced on SIRINX tasks.

If the PC has only approximately 6 GB usable VRAM, 9B QLoRA is blocked. A 4-bit
GGUF may run with a small context and CPU offload, but that does not prove
training feasibility.

### 6.3 Hy4 Preview

Hy4 Preview is a very large sparse MoE cloud/API model. It is **not** a local
Unsloth training target for this PC. Register it only as:

```text
alias: hy4-preview-research
lane: CLOUD_GOVERNED or EMERGENCY_BROKER
local_download: forbidden
local_training: forbidden
account_canary: required
```

### 6.4 QLoRA, LoRA, and “Turbo LoRA”

Interpret `qRora` as `QLoRA` unless the operator supplies another exact method.

Default training method for approved 4B text models:

- 4-bit QLoRA;
- NF4 quantization and double quantization where supported;
- BF16 compute only when the GPU supports it; otherwise FP16;
- LoRA rank 16 or 32 for the first canary;
- alpha equal to rank or twice rank;
- dropout 0 for the first baseline;
- target attention and MLP projection layers;
- gradient checkpointing;
- frozen test split;
- one small canary run before a full training job.

“Turbo LoRA” is ambiguous. It can refer to a proprietary/serving-oriented LLM
method or to diffusion/video acceleration adapters. It is not a generic Unsloth
switch. Keep it `UNRESOLVED_DISABLED` until the exact paper/repository, base
architecture, license, and desired outcome are supplied. Never merge a Turbo
adapter built for another architecture.

## 7. Dataset decisions

Never combine all `hotdogs` datasets into one training corpus.

| Dataset family | Decision | Reason |
|---|---|---|
| SME document/data SFT | `CANDIDATE_AFTER_SCHEMA_REVIEW` | useful for retrieval/tool grounding; template may target a larger Qwen model |
| Cyber agent/tool traces | `DEFENSIVE_SANDBOX_ONLY` | high-risk tool traces; no live pentest or unrestricted shell |
| Cyber QA | `DEFENSIVE_QA_ONLY` | separate factual evaluation from action traces |
| GLM reasoning traces | `QUARANTINED_FOR_PROVENANCE_REVIEW` | reasoning-trace provenance and redistribution terms require review |
| Claude-derived filtered reasoning | `QUARANTINED_FOR_PROVENANCE_AND_TERMS` | dataset label alone does not prove lawful training rights |
| Thai speech dataset | `SEPARATE_TTS_PROJECT` | audio/TTS data is not suitable for text-agent SFT |
| SIRINX internal task/receipt data | `PREFERRED_AFTER_REDACTION` | best domain fit when provenance, consent, PII, secrets, and split gates pass |

Required dataset receipt:

```text
dataset_id
exact_revision
source_urls
license_and_upstream_licenses
file_inventory
sha256
row_count
schema
language
purpose
PII_scan
secret_scan
malware_scan
duplicate_rate
contamination_check
prompt_injection_scan
train_allowed
frozen_eval_split_hash
reviewer
approval_id
```

Do not train on raw chat history. Extract reviewed TaskSpec, GoalSpec, policy,
approval, tested patch, checker feedback, incident, receipt, and domain examples.

## 8. Execution waves

### Wave 0 — secret and authority containment

- record `OPENROUTER_KEY_EXPOSED`;
- wait for key revocation/rotation receipt;
- verify the canonical Mac and PC node identities;
- verify repository, branch, and worktree;
- do not start cloud calls or tunnel daemons.

### Wave 1 — read-only PC inventory

Collect without installing or changing configuration:

- Windows version, hostname, machine UUID fingerprint;
- CPU, RAM, disks, free space;
- GPU model, VRAM, driver, CUDA capability/toolkit;
- all `node`, `npm`, `npx`, `pnpm`, `python`, `uv`, `git`, `llama-server`,
  `ollama`, `docker`, `jcode`, and `dsh` executable paths;
- active processes and listening ports;
- exact local model files and SHA-256;
- current AutoClaw workspace roots;
- current Serena project and tunnel-client state;
- current LAN interfaces and private addresses, redacting public IPs.

Write a secret-free `PC_NODE_SNAPSHOT.json` and signed receipt.

### Wave 2 — repair current local inference

- pin `llama.cpp` executable by version and hash;
- preserve the observed model file;
- verify the chat template;
- use `/v1/chat/completions`, not an incompatible raw completion probe;
- validate streaming, non-streaming, JSON, and bounded tool-call formatting;
- keep tools disabled;
- publish route only as `CANARY_READY`.

### Wave 3 — client adapters

Configure DSH and jcode to call SIRINX aliases through the local/governed
gateways. They must not contain provider keys and must not own retries.

Start order:

1. gateway health and lease;
2. alias discovery;
3. DSH/jcode configuration validation;
4. one no-tool local prompt;
5. receipt reconciliation;
6. stop.

### Wave 4 — Serena read-only tunnel

- pin Serena and tunnel-client artifacts;
- create one profile for one explicitly selected project;
- expose symbol, reference, diagnostics, and search tools only;
- deny shell, write, delete, memory-write, Git push, credential access, and
  arbitrary path activation;
- run `doctor --explain`;
- verify `/healthz`, `/readyz`, `/metrics`, and `/ui`;
- connect only after the tool list and project path are reviewed.

Do not create a universal all-project tunnel. Use distinct profiles and
allowlists for each trust domain.

### Wave 5 — 4B evaluation

For each model, one at a time:

1. metadata and license review;
2. exact revision pin;
3. file/hash verification;
4. static scan and remote-code review;
5. isolated loopback load;
6. no-tool benchmark;
7. code/Thai/reasoning/structured-output suites;
8. prompt-injection and refusal/safety suites;
9. independent checker;
10. keep, quarantine, or reject.

### Wave 6 — dataset canary

- select one narrow dataset;
- freeze train/valid/test splits;
- run format/provenance/PII/secret/duplicate/contamination gates;
- sample-review records;
- produce a dataset card and receipt;
- stop before training unless an exact training approval exists.

### Wave 7 — QLoRA canary

A valid approval binds:

```text
base_model_id
base_revision
base_hash
dataset_id
dataset_hash
training_script_hash
hyperparameter_hash
GPU node identity
max_steps
max_runtime
max_energy_or_cost
output_directory
network_policy
expiry
one_use_nonce
```

Canary constraints:

- 100–300 steps;
- network disabled after all approved artifacts are staged;
- output confined to the leased directory;
- periodic checkpoint cap;
- OOM/thermal watchdog;
- no automatic resume after unknown failure;
- evaluation before export;
- no route promotion.

### Wave 8 — promotion

```text
EXPERIMENTAL
→ DATA_VALIDATED
→ TRAINING_CANARY_COMPLETE
→ EVAL_PASSED
→ LOCAL_CANARY
→ LOCAL_AVAILABLE
→ FLEET_CANARY
→ FLEET_AVAILABLE
```

`TRAIN_COMPLETE → PRODUCTION` is forbidden.

### Wave 9 — browser/CUA worker

Run computer-use/browser tasks only in a disposable, non-admin desktop:

- separate browser profile;
- no password manager, wallet, personal mail, or stored provider sessions;
- domain allowlist;
- download quarantine;
- prompt-injection monitor;
- screenshot/action receipt;
- maximum action count and wall time;
- confirmation before login, upload, submit, message, purchase, publish,
  permission change, or file overwrite;
- reconciliation after every side effect;
- no CAPTCHA bypass.

Use direct APIs/MCP tools before GUI automation whenever a structured interface
exists.

### Wave 10 — fleet integration

- PC sends signed heartbeat and capability manifest to Hermes;
- Hermes issues a short lease for a specific task/path/capability;
- PC executes only the leased task;
- independent checker verifies output;
- PC sends receipt and artifact hashes;
- Hermes updates the evidence graph;
- PC never executes Telegram or production actions directly.

## 9. Mac mini load-shedding policy

Keep on the Mac mini:

- Hermes Commander;
- GhostClaw policy;
- GraphFleet state;
- Telegram single consumer;
- authoritative queue/lease store;
- minimal local emergency model, optional.

Move to the PC:

- model downloads and hashing;
- GPU inference;
- QLoRA training and export;
- dataset processing;
- browser/CUA sessions;
- DSH/jcode worker sessions;
- batch tests;
- optional standby LiteLLM process that cannot dispatch without the singleton
  lease.

Resource admission on the PC must check free VRAM, system RAM, disk, temperature,
queue depth, and current lease count. The Mac must use backpressure rather than
starting duplicate work when the PC is unavailable.

## 10. Network boundary

Approved architecture:

```text
ChatGPT/Codex
  → OpenAI Secure MCP Tunnel (outbound from node)
  → selected read-only MCP profile
  → exact project allowlist

Mac Hermes
  ↔ authenticated private overlay or LAN mTLS
  ↔ PC node agent
  → loopback-only local model gateways
```

Rules:

- no public inbound model, MCP, LiteLLM, OmniRoute, DSH, AutoClaw, database, or
  dashboard port;
- bind services to loopback unless a reviewed mTLS proxy is explicitly approved;
- each node has a pinned identity and certificate;
- permit only required source/destination/port pairs;
- deny lateral discovery and arbitrary subnet access;
- remote/public-network access uses an outbound authenticated tunnel or private
  overlay, never router port-forwarding;
- rotate certificates and runtime keys independently;
- record connection, identity, lease, and disconnect receipts.

## 11. Failure handling

- `AUTH_MISSING` and `AUTH_REJECTED`: block; do not retry.
- `MODEL_NOT_VISIBLE`: refresh account catalog; do not invent a model ID.
- `RATE_LIMIT`, `TIMEOUT`, transient `5xx`: retry only by the lane owner.
- `CAPABILITY_MISMATCH`: choose a new route through policy, not client fallback.
- `TOOL_SCHEMA_REJECTED`: disable tools and fix the adapter.
- `UNKNOWN_RESULT`: stop, reconcile, and prohibit automatic retry.
- `GPU_OOM`: release model, lower context/batch, and require a new plan; do not
  silently switch to a larger host or cloud provider.
- `MAC_HEARTBEAT_LOST`: PC finishes only a safe local checkpoint, then stops.
- `PC_HEARTBEAT_LOST`: Mac does not duplicate a potentially active side effect.

## 12. Deliverables required from AutoClaw

1. `PC_NODE_SNAPSHOT.json`
2. `MODEL_FILE_MANIFEST.json`
3. `ENDPOINT_PROBE_RECEIPT.json`
4. `MCP_TUNNEL_TOOL_MANIFEST.json`
5. `DATASET_REVIEW_RECEIPT.json`
6. `TRAINING_PLAN.json`
7. `TRAINING_CANARY_RECEIPT.json` when separately approved
8. `MODEL_EVAL_REPORT.md`
9. `MODEL_PROMOTION_DECISION.json`
10. `FLEET_PAIRING_RECEIPT.json`
11. `LOAD_SHEDDING_REPORT.md`
12. `MASTER_HANDOFF_RECEIPT.json`

## 13. Stop points

AutoClaw must stop and request an exact approval before:

- installing/upgrading software;
- downloading any model or dataset;
- opening a tunnel;
- loading a replacement credential;
- making a provider request;
- starting QLoRA training;
- enabling browser/CUA actions;
- modifying source outside the leased path;
- pushing Git;
- deploying;
- sending Telegram/LINE/email;
- exposing a port beyond loopback;
- changing firewall, VPN, certificates, or router configuration.

The current broad operator statement does not waive these stop points.
