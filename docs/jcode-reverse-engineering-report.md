# JCode Multi-Agent System — Reverse Engineering Report

**Target repo:** https://github.com/1jehuang/jcode (v0.54.4)
**Language:** Rust (workspace of ~75+ crates)
**Date:** 2026-07-24

---

## 0. Executive Summary

JCode is a **coding agent harness** built in Rust with a Unix-socket JSON protocol. Its multi-agent architecture centers on a **swarm model** where agents (each a headless LLM session) are orchestrated via a **task-DAG engine**. The system supports:

- **7+ LLM providers** with automatic failover (Anthropic/Claude, OpenAI, Copilot, Gemini, Cursor, Bedrock, OpenRouter, custom OpenAI-compatible)
- **Up to 1000 concurrent swarm members** per session
- **Deep mode:** composite nodes decompose into parallel children, auto-inserted critique/verify gates enforce coverage, typed artifacts with confidence levels
- **Light mode:** cheaper fan-out with no mandatory gates
- **A2A communication:** channel-based pub/sub with DMs between agents
- **Automatic subagent spawning:** agents can spawn new agent sessions via `swarm spawn`, assign plan nodes to them, await their completion, and clean them up
- **Idempotent mutations:** all swarm mutations have request hashes to survive retries

---

## 1. A2A Agent Communication Architecture

### 1.1 Protocol Layer

JCode uses a **newline-delimited JSON protocol over Unix sockets** with two socket types:
- **Main socket:** TUI ↔ server communication
- **Agent socket:** AI-to-AI (inter-agent) communication

Communication primitives defined in `crates/jcode-protocol/src/wire.rs`:

```rust
#[serde(tag = "type")]
pub enum Request {
    // Agent→Agent messages
    CommMessage { from_session, message, to_session, channel, delivery, tldr },
    CommSpawn { session_id, working_dir, model, effort, label },
    CommAssignTask { session_id, target_session, task_id, message },
    CommAwaitMembers { session_id, target_status, session_ids, mode, timeout },
    CommList { session_id },
    CommStop { session_id, target_session, force },
    // Task graph mutations
    CommSeedGraph { session_id, nodes, mode },
    CommExpandNode { session_id, node_id, children },
    CommCompleteNode { session_id, node_id, artifact },
    CommInjectGap { session_id, gate_id, nodes },
    // Shared context
    CommWriteContext { session_id, entries },
    CommReadContext { session_id, target_session },
}
```

### 1.2 Channel-Based Pub/Sub

The `ChannelIndex` (`jcode-swarm-core`) provides bidirectional subscription management:

```
by_swarm_channel: HashMap<swarm_id, HashMap<channel, HashSet<session_id>>>
by_session: HashMap<session_id, HashMap<swarm_id, HashSet<channel>>>
```

- Agents subscribe to channels on a swarm
- Messages broadcast to a channel reach all subscribing sessions
- Each agent can DM another agent directly
- Shared context entries create a distributed key-value store readable by all swarm members

### 1.3 Delivery Modes

`CommDeliveryMode` controls how messages are delivered:
- **Notify:** queued for next safe point
- **Interrupt:** immediate injection (urgent)
- **Wake:** re-awaken an idle agent to receive the message

### 1.4 Spawn Tree / Report-Back Chain

Each spawned agent carries `report_back_to_session_id` — tracking its parent in the spawn tree. This chain lets:
- Coordinators walk ancestry to reconstruct the spawn subtree
- Agents report completion back up the chain
- Auto-cleanup stop only owned workers

### 1.5 Shared Context

Agents publish context entries (`key: value + from_session + from_name`) that are readable by all swarm members. This creates a lightweight distributed working memory.

### 1.6 Key Data Structures

```rust
pub struct SwarmMemberRecord {
    session_id, working_dir, swarm_id,
    status: SwarmLifecycleStatus,  // Spawned→Ready→Running→Completed/Done/Failed
    task_label, friendly_name,
    report_back_to_session_id,
    latest_completion_report,
    role: SwarmRole,  // Agent | Coordinator
    is_headless: bool,
}
```

---

## 2. Auto-Spawning Subagent Mechanisms

### 2.1 How Agents Are Spawned

Two paths:

**A. Direct `swarm spawn` tool call** — An agent explicitly calls:

```bash
swarm action="spawn" label="fix-auth" model="claude-sonnet-4-20250514"
```

This sends `Request::CommSpawn` to the server, which creates a new headless session and registers it as a swarm member.

**B. Automatic spawning via `run_plan`** — The coordination loop sees a ready node with no eligible worker and auto-spawns:

```
run_plan loop:
  1. fetch plan status → get ready_ids
  2. try assign_next on each ready node
  3. if "No ready or completed swarm agents" → auto_spawn_assignment_session()
  4. assign task to new session
  5. await completion of in-flight workers
  6. repeat until all terminal
```

Key config point: `prefer_spawn: true` (default) = fresh worker per node; `prefer_spawn: false` = reuse existing workers.

### 2.2 Spawn Idempotency

`request_nonce` (session_id + message_id + timestamp_ms hash) prevents duplicate spawns. The server stores `PersistedSwarmMutationState` with the nonce key and replays the final response for 30s after completion.

### 2.3 Worker Lifecycle

```
Spawned → Ready (seeded) → Running (assigned) → Completed/Failed/Stopped/Crashed
                                               ↓
                                          Cleanup (stop + remove from swarm)
```

Terminal members retain for 24h (`DEFAULT_SWARM_TERMINAL_MEMBER_RETENTION_SECS`), broadcast-visible for 15min.

### 2.4 Duplicate Driver Guard

Per-process claim map prevents two `run_plan` loops from driving the same swarm:

```
try_claim_run_plan_driver():
  - Starting state: block until claim resolves or dies
  - AlreadyRunning: return existing task_id, refuse second
```

### 2.5 Capacity Management

When swarm member cap is hit:
1. `cleanup_finished_workers_for_capacity()` — stop completed/ready workers owned by coordinator
2. If still capped, fall back to `RetryReuse` (assign to existing ready workers instead of spawning)
3. If still fails → `GiveUp`

---

## 3. Multi-Provider Routing Patterns

### 3.1 Provider Architecture

`jcode-provider-core` defines the `Provider` trait:

```rust
#[async_trait]
pub trait Provider: Send + Sync {
    async fn complete(&self, messages, tools, system, resume_session_id) -> Result<EventStream>;
    async fn complete_split(&self, messages, tools, system_static, system_dynamic) -> Result<EventStream>;
    fn name(&self) -> &str;
    fn display_name(&self) -> String;
    fn set_model(&self, model: &str) -> Result<()>;
    fn active_auth_method_label(&self) -> Option<&'static str>;
}
```

Each provider has a **runtime crate** (e.g., `jcode-provider-anthropic-runtime`) implementing this trait, and a **auth crate** (e.g., `jcode-provider-anthropic`) handling credentials.

### 3.2 MultiProvider Dispatcher

`MultiProvider` in `jcode-base/src/provider/dispatch.rs` routes requests:

```rust
complete_on_provider(provider, messages, tools, system):
    match provider:
        ActiveProvider::Claude → Claude(OAuth) fallback Anthropic(API key)
        ActiveProvider::OpenAI → OpenAI provider
        ActiveProvider::Copilot → GitHub Copilot
        ActiveProvider::Gemini → Gemini
        ActiveProvider::Cursor → Cursor runtime
        ActiveProvider::Bedrock → AWS Bedrock
        ActiveProvider::OpenRouter → OpenRouter (also serves custom OpenAI-compatible profiles)
```

### 3.3 Failover Chain

**Cross-provider failover** (`failover.rs`):

```rust
fallback_sequence(active_provider):
    Claude → OpenRouter → Copilot → Bedrock → Gemini
    OpenAI → OpenRouter → Copilot
```

**Same-provider account failover** (`account_failover.rs`):

When a provider account fails (quota exhausted, auth expired), the system auto-switches to another account. Enabled by default for Anthropic/OpenAI multi-account setups. Candidates are ranked by usage ratio (lower = better).

### 3.4 Route Selection

`selection.rs` provides:

- `ConfigProviderSelection::BuiltIn(ActiveProvider)` — direct provider
- `ConfigProviderSelection::OpenAiCompatibleProfile(id)` — custom OpenAI-compatible backend
- `ConfigProviderSelection::NamedProfile(name)` — named config profile

Model routes are resolved from a provider catalog with pricing, capabilities, and auth metadata.

### 3.5 Credential Failure Circuit Breaker

When ≥3 workers fail with auth/credential errors and zero nodes completed, the `run_plan` driver **pauses dispatching** and surfaces the fix command (e.g., `jcode login --provider claude`).

---

## 4. Goal Decomposition → Task Execution Flow

### 4.1 Goal System

Goals (`jcode-task-types`) are persistent files with:

```rust
pub struct Goal {
    id, title, scope: Global|Project, status: Draft|Active|Paused|Blocked|Completed|Archived,
    description, why,
    success_criteria: Vec<String>,
    milestones: Vec<GoalMilestone>,     // sub-goals with steps
    next_steps: Vec<String>,
    blockers: Vec<String>,
    current_milestone_id,
    progress_percent,
    updates: Vec<GoalUpdate>,
}
```

Goals are persisted as JSON files in `.jcode/goals/` (global) or `project/.jcode/goals/` (project). The `goal` tool lets agents create, update, list, and query goals.

### 4.2 Task Graph (DAG) Engine

The core decomposition → execution flow uses a **validated DAG** defined in `jcode-plan/src/dag/`:

**Node types (`NodeKind`):**

| Kind | Purpose | Gate Type |
|------|---------|-----------|
| `Explore` | Research/analysis | Critique |
| `Implement` | Code change | Verify |
| `Verify` | Acceptance check (itself a gate) | — |
| `Fix` | Repair after failed verify | Verify |
| `Synthesize` | Map-reduce rollup of children | Critique |
| `Critique` | Adversarial gap-finder (gate) | — |

**Node lifecycle:**
```
Queued → Running → Done (with artifact)
               ↘→ Failed → (may be retried)
```

### 4.3 Deep Mode (Comprehensive, Gated)

Two modes controlled by `Mode::{Deep, Light}`:

**Deep mode adds:**
1. **Composite node expansion:** When a node has multiple concerns, the agent calls `expand_node` to decompose into independent children. Each child is a standalone task with its own `depends_on` edges.
2. **Auto-inserted gates:** Every composite node gets a critique/verify gate inserted automatically. The composite cannot close until the gate passes.
3. **Root audit gate:** The entire plan ends with a mandatory root gate that audits all root-level nodes.
4. **Typed artifacts:** Every completion produces findings, evidence (file:line refs), validation, open_questions, confidence (low/medium/high), and what_i_did_not_check.
5. **Growth accounting:** Tracks seeded vs. machinery-grown nodes. A plan with zero growth never decomposed.
6. **Low-confidence enforcement:** Gates are pointed at low-confidence siblings and cannot pass over them unaddressed.

### 4.4 Light Mode

Cheap fan-out with no mandatory gates, lightweight artifacts, smaller concurrency budget (4 default).

### 4.5 Full Flow (Goal → Decomposition → Execution)

```
1. Agent sets a goal (goal tool)
2. Agent seeds a task graph (swarm seed_graph)
   - Specifies nodes with ids, content, kind, depends_on, priority
   - Selects mode: deep or light
3. Server validates: acyclicity, duplicate detection, gate insertion
4. Agent runs the plan (swarm run_plan)
5. run_plan loop:
   a. Fetch plan status → get ready_ids
   b. For each ready node, assign to a worker (spawn or reuse)
   c. Worker executes → completes with artifact
   d. For deep composite: expand_node → spawn children → children complete → gate runs → synthesize
   e. Gate finds gaps → inject_gap → new nodes expand the graph
   f. Gate passes → composite completes
   g. Root gate audits entire plan → passes or injects new root work
6. Report: utilization stats, completed/failed/stalled counts
```

### 4.6 Dataflow Along Edges

The scheduler hydrates each node's input from completed upstream dependencies' artifacts:

```rust
assemble_input(graph, node_id):
    content = node.content
    for each completed dependency:
        content += "\n## <dep_id> (<kind>)\n<dep.artifact.findings>\n<dep.artifact.evidence>"
    return content
```

### 4.7 Bridge Pattern

The `bridge.rs` module translates between:
- **`VersionedPlan`** — live, persisted, broadcast storage used by swarm runtime
- **`TaskGraph`** — validated engine model used by DAG ops

The server lifts `VersionedPlan → TaskGraph`, applies engine op, lowers `TaskGraph → VersionedPlan`, then persists and broadcasts.

### 4.8 Task Control Actions

| Action | From Status | To | Use Case |
|--------|-------------|----|----------|
| Start | Queued | Running | Initial dispatch |
| Wake | Queued | Running | Re-dispatch queued |
| Resume | Running/RunningStale | Running | Continue interrupted work |
| Retry | Failed/RunningStale | Queued | Recover from failure |
| Reassign | non-completed | Queued | Move to different worker |
| Replace | non-completed | Queued | Swap worker |
| Salvage | non-completed/failed | Queued | Emergency recovery |

---

## 5. Patterns We Should Apply to GC Fleet

### 5.1 Architecture Patterns to Adopt

| # | Pattern | JCode Implementation | Our GC Fleet Equivalent | Priority |
|---|---------|---------------------|------------------------|----------|
| 1 | **Task DAG with gate enforcement** | `jcode-plan/src/dag/` — validated graph with deep mode gates | Replace linear Kanban with DAG; add critique gates to each composite node | **HIGH** |
| 2 | **Channel-based A2A pub/sub** | `ChannelIndex` with `by_swarm_channel` + `by_session` | Extend A2A2A Go bridge with channel subscriptions | **HIGH** |
| 3 | **Spawn tree with report-back chain** | `report_back_to_session_id` chain reconstructs ancestry | Add parent tracking to each GC Fleet agent spawn | **HIGH** |
| 4 | **Idempotent swarm mutations** | Request nonces + persisted mutation state with TTL | Add idempotency keys to Go orchestration queue | **HIGH** |
| 5 | **Bridge pattern between engine and storage** | `bridge.rs` lifts/lowers between `VersionedPlan` and `TaskGraph` | Decouple Rust DAG engine from Go persistence | **MEDIUM** |
| 6 | **Growth accounting metrics** | `seeded_count` vs `grown_count` for agentic coverage | Track plan node origins in Rust runtime | **MEDIUM** |
| 7 | **Deterministic simulator** | `dag/sim.rs` tests engine with mock workers | Add sim harness for A2A bridge before live deploy | **MEDIUM** |
| 8 | **Multi-provider failover chain** | `fallback_sequence()` + same-provider account switching | Implement provider rotation in Hermes config | **MEDIUM** |
| 9 | **Swarm capacity management** | Cleanup finished workers when cap hit, fall back to reuse | Add GC Fleet worker cap with auto-cleanup | **MEDIUM** |
| 10 | **Credential wave circuit breaker** | Detect ≥3 auth failures, pause dispatch, surface fix | Add to Go orchestrator health checks | **LOW** |

### 5.2 Code Patterns to Implement

**A. Rust: Task-Graph Engine (for gc-runtime-core)**

```rust
// Node model (jcode-plan/src/dag/mod.rs)
pub enum NodeKind { Explore, Implement, Verify, Fix, Synthesize, Critique }
pub enum NodeStatus { Queued, Running, Done, Failed }
pub enum Mode { Deep, Light }

pub struct TaskNode {
    id: String, content: String, kind: NodeKind,
    status: NodeStatus, owner: Option<String>,
    parent: Option<String>,
    depends_on: Vec<String>,
    expanded: bool, is_gate: bool,
    output: Option<HandoffArtifact>,
    priority: u8,
}

pub struct TaskGraph {
    nodes: Vec<TaskNode>,
    mode: Mode,
}

// Validated mutations (ops.rs)
fn seed(graph, specs) -> Result;         // Initial batch
fn expand_node(graph, node_id, worker, children) -> Result;  // Decompose
fn complete_node(graph, node_id, worker, artifact) -> Result; // Close with artifact
fn inject_from_gate(graph, gate_id, worker, new_nodes) -> Result; // Gate found gaps
fn fail_node(graph, node_id, worker) -> Result;

// Scheduler (schedule.rs)
fn ready_nodes(graph) -> Vec<&TaskNode>;  // Compute ready set
fn dispatch(graph, node_id, worker) -> bool;
fn assemble_input(graph, node_id) -> String;  // Dataflow along edges
```

**B. Go: Channel-Based A2A (for gc-orch)**

```go
type ChannelIndex struct {
    BySwarmChannel map[string]map[string]map[string]struct{} // swarmID → channel → sessionIDs
    BySession      map[string]map[string]map[string]struct{} // sessionID → swarmID → channels
}

func (ci *ChannelIndex) Subscribe(sessionID, swarmID, channel string)
func (ci *ChannelIndex) Unsubscribe(sessionID, swarmID, channel string)
func (ci *ChannelIndex) Publish(swarmID, channel string) []string  // returns subscriber session IDs
```

**C. Rust: Deterministic Simulator for GC Fleet**

```rust
pub enum WorkerAction {
    Complete(HandoffArtifact),
    Expand(Vec<NodeSpec>),
    InjectGap(Vec<NodeSpec>),
    Fail,
}

pub fn simulate(graph: &mut TaskGraph, max_workers: usize, max_steps: usize,
                worker: &mut dyn FnMut(&str, NodeKind, &str) -> WorkerAction)
    -> Result<SimReport>;
```

**D. Artifact Model with Confidence Levels**

```rust
pub struct HandoffArtifact {
    pub findings: String,
    pub evidence: Vec<FileLineRef>,
    pub validation: Vec<String>,
    pub open_questions: Vec<String>,
    pub confidence: Option<String>,  // parsed to ConfidenceLevel
    pub what_i_did_not_check: Vec<String>,
}

pub enum ConfidenceLevel { Low, Medium, High }
```

### 5.3 Critical Differences from Our Approach

| Dimension | JCode | GC Fleet (Current) | Implication |
|-----------|-------|-------------------|-------------|
| **Language** | Single Rust binary with ~75 crates | Multi-language: Rust + Go + scripts | Our coordination boundary (Go ↔ Rust) needs the bridge pattern more urgently |
| **Protocol** | Unix socket NDJSON (same process) | A2A2A Go bridge (network boundary) | Channel pub/sub needs serialization; JCode's is in-process |
| **Agent identity** | Each agent = a headless LLM session spawned by the server | 11 named agents with fixed roles (Kanban, Harness, etc.) | JCode's fungible worker pool differs from our role-based fleet |
| **Goal model** | Persistent JSON files, agent-driven | PRODUCT.md + Kanban board | JCode's persistence is simpler; our multi-file approach is more auditable |
| **Decomposition** | DAG-first: agents expand composite nodes into parallel children | Sequential: agents pick up next card | DAG parallelism is more efficient for deep investigation |
| **Gate enforcement** | Engine-validated: server rejects incomplete artifacts | Manual peer review / CI | Automated gate enforcement prevents gaps |
| **Provider routing** | Runtime-selected per request with failover | Hermes config static route | JCode's dynamic failover is more resilient |
| **Worker lifecycle** | Full spawn/assign/await/cleanup cycle | Script-runner pattern (fire and forget) | JCode's await + report-back enables complex coordination |

### 5.4 Recommendations for Applying Each Pattern

#### HIGH PRIORITY: Task DAG with gate enforcement

**Apply to:** `gc-runtime-core` v0.1.0

Replace the current linear Kanban execution with a DAG in the Rust runtime:

1. Create `NodeKind`, `NodeStatus`, `TaskGraph` types (mirror jcode's `dag/mod.rs`)
2. Implement validated `seed`, `complete_node`, `expand_node`, `inject_from_gate` ops
3. Add `bridge.rs` to lift/lower between DAG and persisted plan state
4. Implement `ready_nodes()` scheduler in Rust
5. Wire to the Go bridge via serialized `TaskGraphNodeSpec` wire type

**Implementation order:**
1. Node model types + serialization
2. `seed()` + acyclicity validation
3. `ready_nodes()` scheduler
4. `complete_node()` + artifact validation
5. `expand_node()` + gate auto-insertion (deep mode)
6. Bridge to Go orchestration layer

#### HIGH PRIORITY: Channel-based A2A pub/sub

**Apply to:** `gc-orch` A2A2A bridge (port :8721)

1. Add `ChannelIndex` struct to Go
2. Implement `Subscribe/Unsubscribe/Publish/Members` operations
3. Add channel routing to message dispatch logic
4. Each agent registers interest in relevant channels on startup
5. Bridge channels to the Rust runtime across the A2A2A boundary

#### HIGH PRIORITY: Spawn tree with report-back

**Apply to:** gc-orchestrator agent spawning logic

1. Add `parent_session_id` field to agent registration
2. Implement `walk_ancestors()` to reconstruct spawn tree
3. Add auto-cleanup that traverses owned subtree
4. Surface spawn tree in `swarm status` output

#### HIGH PRIORITY: Idempotent swarm mutations

**Apply to:** Go orchestration queue

1. Generate request hash from (session_id, action, payload_hash)
2. Store pending state with `created_at_unix_ms` + 30min TTL
3. On duplicate request, replay stored final response
4. Clean up completed entries after 30s

#### MEDIUM PRIORITY: Bridge pattern

**Apply to:** boundary between gc-runtime-core (Rust) and gc-orch (Go)

1. Define `PlanItem`, `TaskGraphNodeSpec`, `HandoffArtifact` as serializable types
2. `bridge.rs` lifts Go-persisted plan into Rust `TaskGraph`
3. Rust engine applies validated mutations
4. `bridge.rs` lowers back to Go-friendly wire format
5. Go handles persistence and broadcast

#### MEDIUM PRIORITY: Growth accounting

**Apply to:** Rust runtime metrics

1. Track `NodeOrigin` (Seed/Expand/Gap/Gate) per node
2. Compute `seeded_count` vs `grown_count` on status queries
3. Report in swarm status output
4. Alert when deep plan has zero growth

#### MEDIUM PRIORITY: Deterministic simulator

**Apply to:** Rust runtime CI pipeline

1. Implement `WorkerAction` enum and mock worker closure type
2. Build `simulate()` that round-robins ready nodes to bounded pool
3. Add test cases for both deep and light modes
4. Verify gate enforcement, gap injection, and retry mechanics

#### MEDIUM PRIORITY: Multi-provider failover

**Apply to:** Hermes config + Go provider selector

1. Define provider fallback chain in config
2. Implement same-provider account failover (rotate keys)
3. Add credential failure circuit breaker
4. Surface active provider in agent status

#### LOW PRIORITY: Capacity management

**Apply to:** Go orchestrator

1. Set configurable per-swarm worker cap
2. When cap hit, cleanup finished workers before spawning more
3. Fall back to worker reuse if cleanup insufficient

---

## 6. Key File Reference (JCode Codebase)

| File | Purpose | Lines |
|------|---------|-------|
| `crates/jcode-plan/src/dag/mod.rs` | Task graph node model + engine types | 682 |
| `crates/jcode-plan/src/dag/ops.rs` | Validated graph mutations (seed/expand/complete/inject) | 878 |
| `crates/jcode-plan/src/dag/schedule.rs` | Scheduler (ready set, dispatch, dataflow) | 106 |
| `crates/jcode-plan/src/dag/sim.rs` | Deterministic simulator with mock workers | 155 |
| `crates/jcode-plan/src/bridge.rs` | Lift/lower between VersionedPlan and TaskGraph | 503 |
| `crates/jcode-app-core/src/tool/communicate.rs` | Swarm tool orchestration (spawn/assign/await/run_plan) | 3345 |
| `crates/jcode-app-core/src/server/swarm.rs` | Server-side swarm state management | 3170 |
| `crates/jcode-app-core/src/server/comm_graph.rs` | Task graph mutation handlers on server | 545 |
| `crates/jcode-app-core/src/server/swarm_channels.rs` | Channel subscription operations | 88 |
| `crates/jcode-app-core/src/server/swarm_mutation_state.rs` | Persisted idempotent mutation state | 281 |
| `crates/jcode-swarm-core/src/lib.rs` | Swarm types (role, lifecycle, channel index) | 837 |
| `crates/jcode-protocol/src/wire.rs` | Wire protocol (all Request/ServerEvent variants) | 1439 |
| `crates/jcode-protocol/src/comm_format.rs` | Communication formatting (human-readable output) | 646 |
| `crates/jcode-base/src/provider/dispatch.rs` | MultiProvider dispatch to specific provider runtimes | 355 |
| `crates/jcode-base/src/provider/failover.rs` | Cross-provider failover chain | 78 |
| `crates/jcode-base/src/provider/account_failover.rs` | Same-provider multi-account failover | 152 |
| `crates/jcode-base/src/provider/selection.rs` | Provider/model selection and routing | 801 |
| `crates/jcode-base/src/provider/multi_provider.rs` | MultiProvider orchestrator | 118 |
| `crates/jcode-provider-core/src/lib.rs` | Provider trait and core abstractions | 1642 |
| `crates/jcode-base/src/goal.rs` | Goal CRUD and persistence | 714 |
| `crates/jcode-task-types/src/lib.rs` | Goal, Todo, and task type definitions | 321 |
| `crates/jcode-agent-runtime/src/lib.rs` | Agent interrupt signal and runtime types | 282 |

**Total Rust LOC in repo:** ~80,000+ (1500+ source files)
**Core swarm/plan/DAG LOC (relevant to us):** ~12,000
