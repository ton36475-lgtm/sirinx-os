# TokenRouter, B.AI, OpenClaude, MCP and A2A Integration Decision — 2026-09-02

State: `RESEARCH_RECONCILED / CONFIG_STAGED / RUNTIME_DISABLED`

**Reconciliation precedence:** this memo and `config/providers/tokenrouter-bai-provider-overlay.v1.json` supersede only the earlier B.AI `UNVERIFIED_SECONDARY_ONLY` record in `config/providers/tokenrouter-pc-node.v1.json`. The TokenRouter base pack remains valid. The credential issuer remains unknown from its prefix, so both gateway activations stay blocked pending owner-side identification and rotation.

## Executive decision

TokenRouter and B.AI are integrated as **separate broker lanes**, not as nested
fallback providers behind LiteLLM or OmniRoute. This preserves the SIRINX rule
that every request has exactly one retry/fallback owner.

OpenClaude is **not approved for clone, install, execution, vendoring, or fleet
registration**. The repository is useful as a capability reference, but its
license states that it contains code derived from Anthropic proprietary Claude
Code source and that the project lacks Anthropic authorization to distribute
the underlying source. A clean-room adapter using documented OpenAI-compatible,
MCP, and A2A interfaces is the permitted path until legal review resolves the
hold.

MCP Phase M6 is split into repository configuration and runtime activation.
Repository-only profiles are staged. Starting an outbound tunnel, binding a
Runtime API key, publishing write tools, or exposing a new project remains a
separate action-bound approval.

A2A Phase M7 uses Hermes hub-and-spoke orchestration. An unrestricted full mesh
is rejected because it creates split-brain, duplicate action, identity,
cancellation, and retry-ownership failure modes.

## Provider facts captured

### TokenRouter

- Base URL: `https://api.tokenrouter.com/v1`.
- `z-ai/glm-5.3-free` supports OpenAI-compatible Chat Completions and was shown
  at zero input/output price on the snapshot date.
- `z-ai/glm-5.3-flash` supports Chat Completions and Responses and was not free
  on the snapshot date.
- `qwen/qwen3.8-flash` supports Chat Completions and was not free on the
  snapshot date.
- `qwen/qwen3.8-max-fre` was shown at zero input/output price on the snapshot
  date.
- The platform advertises multi-channel failover. Therefore TokenRouter itself
  owns retries/fallbacks in its lane; SIRINX outer retries are zero.
- ZDR must be verified in the actual account. TokenRouter's DPA states that ZDR
  applies to its own prompt/completion storage, does not automatically apply to
  upstream model providers, and still permits operational metadata retention.

### B.AI

- Production base URL: `https://api.b.ai/v1`.
- Supported protocol families include OpenAI Chat Completions, OpenAI Responses,
  and Anthropic Messages.
- Exact hosted IDs captured for this integration are `qwen3.8-flash` and
  `glm-5.3-flash`.
- Both were advertised as zero-credit API promotions on the snapshot date.
  Promotion status is not an SLA, entitlement, or permanent price.
- First activation fetches the authenticated model catalog. Manual IDs are never
  treated as account access proof.
- First canary is one request, public synthetic data, no outer retry.

## OpenClaude findings

Resolved source snapshot: `Gitlawb/openclaude@aceacf0e590a7d84447a8c44f3aa61eba781a542`.

Useful capabilities described by the source include OpenAI-compatible and local
providers, file/Bash/search tools, agents, tasks, MCP, web tools, provider
profiles, background child sessions, agent-specific routing, and step limits.

Blocking findings:

- license/legal provenance is unresolved for the underlying derived source;
- provider profiles and per-agent settings can persist API credentials;
- per-agent API keys are documented as plaintext in settings;
- dangerous `bypassPermissions` and `fullAccess` modes exist;
- an omitted or invalid `maxSteps` can leave sub-agent tool execution unbounded;
- background child sessions can become stale after power loss or unobservable
  termination.

Use jcode, DSH, Codex, or a clean-room SIRINX client adapter instead of making
OpenClaude an active dependency.

## ChatGPT and MCP entitlement boundary

The current operator account is ChatGPT Pro. Current OpenAI documentation allows
Pro developer-mode MCP connections with read/fetch permissions. Full custom MCP
write/modify actions are currently for Business and Enterprise/Edu. Agent mode
does not use custom apps, and deep research uses custom apps for read/fetch only.

Therefore the initial ChatGPT-facing Serena profile is read-only. Local coding
clients may use their own bounded local MCP integration, but that does not create
ChatGPT write entitlement and does not bypass GhostClaw approval.

## A2A/Telegram design

Telegram remains one human command ingress and one consumer. Telegram polling
and webhooks are mutually exclusive; the active transport must prove ownership,
sequence `update_id`, idempotency, and delivery receipts.

A2A Agent Cards are signed and allowlisted. Each node receives a task-scoped
lease and fencing token. 47 Ronins are logical specialist roles spawned on
demand, not 47 always-running processes. The Mac mini retains command/policy/
queue/receipt authority; the PC receives heavy inference, evaluation, training,
and disposable browser work after admission gates.

## Installation and dependency decision

Broad “install everything” authorization is not consumed. A valid install packet
must bind the exact host, repository root, package/release, checksum or digest,
dependency lock, network destinations, rollback, expiry, and maximum uses.

Approved now:

- Draft-PR configuration and research artifacts
- secret-free read-only PC inventory
- offline schema validation and test planning

Still separately gated:

- provider calls
- package installation
- OpenClaude installation
- model/dataset download
- QLoRA training
- MCP tunnel start
- node pairing
- A2A live transport
- CUA/browser action
- Telegram live send
- deployment or merge

## Primary sources

- https://www.tokenrouter.com/docs/
- https://www.tokenrouter.com/docs/global-dpa/
- https://www.tokenrouter.com/models/z-ai/glm-5.3-free/
- https://www.tokenrouter.com/models/z-ai/glm-5.3-flash/
- https://www.tokenrouter.com/models/qwen/qwen3.8-flash/
- https://www.tokenrouter.com/models/qwen/qwen3.8-max-free/
- https://docs.b.ai/llmservice/api/
- https://docs.b.ai/llmservice/models/qwen3-8-flash/
- https://docs.b.ai/llmservice/models/glm-5-3-flash/
- https://github.com/Gitlawb/openclaude
- https://github.com/Gitlawb/openclaude/blob/main/LICENSE
- https://help.openai.com/en/articles/12584461-developer-mode-and-full-mcp-connectors-in-chatgpt
- https://modelcontextprotocol.io/specification/2025-11-25
- https://github.com/a2aproject/A2A
- https://core.telegram.org/bots/api
