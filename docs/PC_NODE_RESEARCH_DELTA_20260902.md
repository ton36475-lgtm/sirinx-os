# PC Node Research Delta — 2026-09-02

State: `RESEARCH_RECONCILED / NO_RUNTIME_ACTIVATION`

This memo records the current external-source findings that materially affect the
PC Node design. It does not authorize installation, provider calls, model or
dataset downloads, tunnel startup, training, or network changes.

## 1. Router boundary: do not stack autonomous fallback engines

### 9Router

The current 9Router project family describes itself as an OpenAI/Anthropic-
compatible local proxy for coding clients, combining multiple subscription or
free-provider accounts, automatic fallback, dashboard/account management, and
token compression. Some distributions are repackaged forks rather than the
canonical upstream.

Decision:

- retain only in an isolated compatibility lab;
- no production route;
- no provider credential import until exact upstream, revision, license, build
  provenance, and secret storage have been reviewed;
- disable browser-account automation and auto-fallback during canaries;
- never place it before or after LiteLLM, OmniRoute, or OpenRouter fallback.

### OmniRoute

The current OmniRoute repository describes a much broader gateway derived from
9Router, with many provider adapters, auto-combos, quota-aware fallback,
compression, MCP/A2A, remote mode, scoped tokens, local memory, cloud-agent
integrations, and optional traffic interception/MITM features.

Decision:

- use only as the `LOCAL_DEVELOPER` route owner on the PC;
- bind to loopback by default;
- expose task-facing aliases, not raw provider/model IDs;
- disable remote admin, public MCP, A2A mutation, memory, MITM/TPROXY, automatic
  cloud-agent launch, and keyless/free web adapters until individually reviewed;
- permit one bounded local canary before any provider/account enrollment;
- do not treat repository headline provider/free-token counts as a stable
  capacity guarantee.

### LiteLLM

LiteLLM provides a unified gateway, virtual keys, spend tracking, guardrails,
load balancing, and routing across many providers. Its current budget
documentation states that budgets require a database; without the database,
configured global budget checks can fail open and virtual-key budgets are not
available.

Decision:

- LiteLLM is the only `CLOUD_GOVERNED` retry owner;
- production budget enforcement requires the approved database and a negative
  over-budget test;
- no DB means `BUDGET_ENFORCEMENT_UNVERIFIED`, not a zero-cost or safe state;
- pin a tested stable image/release and explicitly bound attempts, fallbacks,
  timeouts, and cooldowns;
- include tests for streaming, context-window errors, 429 cooldown, mixed
  retryable/non-retryable failures, and finite fallback termination;
- a standby LiteLLM process may exist on the PC, but only the holder of the
  singleton router lease and fencing token may dispatch.

### OpenRouter

`openrouter/free` filters by requested capabilities and then selects an available
free model at random. Free-model availability, latency, and rate limits vary. A
specific `:free` model variant is required when deterministic model identity is
part of the test. Provider fallbacks are enabled by default unless disabled.

Decision:

- `openrouter/free` is public-data, low-volume experimentation only;
- use explicit `:free` variants for model-specific evaluation;
- record the actual model and provider returned in every receipt;
- set `allow_fallbacks=false` when OpenRouter is called behind a SIRINX lane
  owner, or make OpenRouter the sole retry owner for the isolated emergency lane;
- no automatic transfer of internal/sensitive prompts to a free route;
- the credential exposed in chat remains blocked pending rotation.

## 2. Unsloth and QLoRA

The QLoRA method trains low-rank adapters while backpropagating through a frozen
4-bit quantized base model. Its key memory mechanisms include NF4, double
quantization, and paged optimizers.

Current Unsloth guidance recommends a first baseline around:

- QLoRA for low-VRAM training;
- LoRA rank 16 or 32;
- alpha equal to rank or twice rank;
- dropout 0 as the optimized baseline;
- attention and MLP projections: `q_proj`, `k_proj`, `v_proj`, `o_proj`,
  `gate_proj`, `up_proj`, `down_proj`;
- gradient checkpointing;
- a fixed seed and held-out evaluation.

Important current inconsistency: Unsloth's repository quickstart currently shows
Python 3.13 for manual Windows/Core setup, while an official pip-install page
still warns that Python 3.13 does not support many required packages. Therefore
no floating `latest` environment is approved. The PC must pin the exact Unsloth,
PyTorch, CUDA/backend, Python, Transformers, TRL, PEFT, bitsandbytes, and
Unsloth-Zoo versions that pass a clean isolated canary.

The current llama.cpp symptom shown by the operator is consistent with a chat-
template or endpoint mismatch: Unsloth documentation notes that exporting or
serving with a different chat template can cause poor, repeated, or invalid
output. Repair the template before using the endpoint for training evaluation or
agent tools.

## 3. Model classification

### Existing Fable Preview 4B

The publisher describes `Agents-A1-4B-Fable-Preview` as a roughly 4.29B,
text-decoder model derived from InternScience/Agents-A1-4B, with ChatML/Jinja2,
Thai/English support, tool-use trajectories, and a BF16 artifact around 8.4 GB.
Its example requests `trust_remote_code=True` and its reported SWE-bench result
uses a subset rather than the complete set.

Decision:

- current GGUF remains inference-only;
- verify template, executable, process, port, hashes, and no-tool quality first;
- never inherit the publisher's shell/tool claims as permissions;
- safetensors source and all custom code require separate review before QLoRA;
- the `heretic`/uncensored derivative remains quarantined with network and tools
  disabled.

### Qwen3.5-4B-MoLE

The publisher describes eight LoRA experts on a Qwen3.5-4B lineage and reports
Unsloth QLoRA 4-bit training with rank 32, alpha 64, 300 steps per expert, and an
RTX 4060 Ti 16 GB. Its lineage includes an abliterated intermediate model.

Decision:

- useful as an expert-routing research artifact, not a production route;
- audit every expert adapter and the entire base/adapter license and provenance
  chain;
- reproduce per-expert and mixed-routing evaluation;
- never attach an expert to a mismatched base revision;
- do not infer PC training feasibility until the GPU/VRAM snapshot exists.

### Ornith-1.5-9B

The official model card identifies Ornith-1.5-9B as a 9B BF16 model and publishes
an official GGUF route for llama.cpp/Ollama plus OpenAI-compatible serving
examples. It is not a 4B model.

Decision:

- separate 9B lane;
- Q4-class GGUF may be evaluated for inference after storage/RAM/VRAM admission;
- QLoRA is blocked until a compatible non-GGUF training artifact, license,
  custom-code review, and measured VRAM canary pass;
- tools remain disabled until tool-schema and safety evaluation;
- publisher benchmark results are claims until reproduced on SIRINX tasks.

### Tencent Hy4 Preview

Tencent describes Hy4 Preview as a 770B-total, 49B-active MoE model with a one-
million-token context. The official FP8 serving recipe uses multi-GPU tensor
parallelism.

Decision:

- cloud/API or remote-cluster catalog only;
- no PC download, local serving, or PC Unsloth training;
- one bounded API canary only after credential rotation, budget, data-class, and
  provider-route approval;
- use as architect/reviewer research, not as a direct machine authority.

## 4. Dataset classification

The `hotdogs` collection mixes unrelated objectives and cannot be bulk-merged:

- `sme-sft-docdata-qwen38`: document/data search, aggregation, RAG, and evidence-
  grounded SME tasks; candidate only after schema/template/downscaling review;
- `cyber-sft-agent-qwen38`: tool traces covering reconnaissance, scanning,
  exploitation, password, and post-exploitation utilities; defensive isolated
  research only, with no live target or unrestricted shell;
- `cyber-sft-qa-qwen38`: large cybersecurity QA/reasoning set; keep separate
  from action/tool trajectories and use only in defensive evaluation/training;
- `uka-cyber-dataset`: includes pentest tool-call traces; defensive sandbox only;
- `uka-glm-5.2`: reasoning traces; requires source-model terms and trace
  provenance review;
- `claude46_filtered`: publisher states it filters refusals from Claude-derived
  reasoning data; the displayed Apache label does not by itself settle source-
  output training rights or provenance;
- `thai-speech-20k`: single-speaker TTS/audio data and a separate speech project,
  not text-agent SFT;
- reviewed and redacted SIRINX TaskSpec/GoalSpec/policy/test/checker/receipt data
  remains the preferred domain source.

Every dataset remains `train_allowed=false` until exact revision/hash, license
chain, PII/secret/malware scan, duplicates, contamination, prompt injection,
frozen test split, and human sample review pass.

## 5. MCP and computer-use limits

OpenAI's current ChatGPT documentation states:

- Pro users can connect developer-mode MCPs with read/fetch permissions;
- full write/modify MCP is currently limited to Business and Enterprise/Edu;
- deep research can use custom apps for read/fetch only;
- agent mode does not use custom apps;
- a private/local MCP should use Secure MCP Tunnel rather than public exposure.

The official tunnel-client connects localhost/private MCP outward to supported
OpenAI products and provides `doctor`, `/healthz`, `/readyz`, `/metrics`, and
`/ui`. The long-running daemon uses a Runtime API key, not an Admin API key.

Decision:

- first Serena profile is read-only and one-project-only;
- multiple MCP profiles are separated by trust domain;
- tool-list changes are diff-reviewed and new tools remain disabled;
- write/shell/browser MCP tools require a different plan entitlement and a
  separate action-bound approval;
- browser/CUA runs only in a disposable non-admin desktop with explicit
  confirmation before login, upload, submit, send, purchase, publish,
  permission change, or overwrite;
- logged-out sessions, domain allowlists, and API/MCP-first execution are the
  default because browser agents remain exposed to prompt injection.

## 6. Activation decision

Current highest state:

```text
RESEARCH_RECONCILED
CONFIG_AND_HANDOFF_READY
RUNTIME_UNVERIFIED
OPENROUTER_BLOCKED_PENDING_ROTATION
NO_MODEL_OR_DATASET_DOWNLOAD
NO_TRAINING
NO_TUNNEL_START
NO_NETWORK_OR_PROVIDER_ACTIVATION
```

The next executable wave is the secret-free, read-only PC inventory. All later
waves remain separately gated.

## Primary sources

- https://arxiv.org/abs/2305.14314
- https://docs.unsloth.ai/basics/lora-parameters-encyclopedia
- https://docs.unsloth.ai/basics/saving-and-using-models/troubleshooting
- https://github.com/unslothai/unsloth
- https://docs.unsloth.ai/get-started/installing-%2B-updating/pip-install
- https://github.com/BerriAI/litellm
- https://github.com/BerriAI/litellm-docs/blob/main/docs/proxy/users.md
- https://openrouter.ai/docs/guides/routing/routers/free-router
- https://openrouter.ai/docs/guides/routing/provider-selection
- https://openrouter.ai/docs/cookbook/administration/api-key-rotation
- https://github.com/decolua/9router
- https://github.com/dbegineer/omniroute
- https://huggingface.co/hotdogs/Agents-A1-4B-Fable-Preview
- https://huggingface.co/hotdogs/Agents-A1-4B-Fable-Preview-heretic
- https://huggingface.co/hotdogs/Qwen3.5-4B-MoLE
- https://huggingface.co/ornith-ai/Ornith-1.5-9B
- https://huggingface.co/ornith-ai/Ornith-1.5-9B-GGUF
- https://github.com/Tencent-Hunyuan/Hy4-preview
- https://huggingface.co/datasets/hotdogs/sme-sft-docdata-qwen38
- https://huggingface.co/datasets/hotdogs/cyber-sft-agent-qwen38
- https://huggingface.co/datasets/hotdogs/cyber-sft-qa-qwen38
- https://huggingface.co/datasets/hotdogs/uka-cyber-dataset
- https://huggingface.co/datasets/hotdogs/uka-glm-5.2
- https://huggingface.co/datasets/hotdogs/claude46_filtered
- https://huggingface.co/datasets/hotdogs/thai-speech-20k
- https://help.openai.com/en/articles/12584461-developer-mode-and-full-mcp-connectors-in-chatgpt
- https://github.com/openai/tunnel-client
- https://openai.com/safety/prompt-injections/
