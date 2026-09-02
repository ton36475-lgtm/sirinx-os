# SIRINX PC Node — Product Design Specification

Status: design contract only. No executable control is added by this document.

## Product promise

The PC Node console lets an operator answer five questions without reading logs:

1. Is this PC paired and currently observable?
2. Which model alias will handle the task?
3. Which component owns routing and retries?
4. Is the selected route eligible for this data class, budget, and capability?
5. What evidence proves the final result?

The interface must never turn configuration, catalog presence, or a recent
heartbeat into a false “live” claim.

## Information architecture

Place **PC Node / Model Fabric** inside the existing Developer Command Center,
next to Gateway, Team Runtime, and Fleet controls. It is a governed workflow
panel, not a separate product.

Primary views:

- **Overview** — node identity, pairing, heartbeats, release manifest, current
  lease, resource pressure, and stop point;
- **Aliases** — task-facing model aliases and their eligibility;
- **Providers** — direct providers, local runtimes, OpenRouter broker, and
  experimental adapters;
- **Agents** — DSH, jcode, AutoClaw/OpenClaw, and worker processes;
- **MCP & Tunnel** — Serena project, tool policy, tunnel identity, readiness, and
  current authorized workspace;
- **Approvals** — action-bound canaries, budget, expiry, and payload hash;
- **Receipts** — actual provider/model, attempts, cost, latency, checker verdict,
  artifacts, and post-action verification.

## Overview layout

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ PC NODE · WINDOWS         REGISTRY ONLY / DISABLED         [STOP POINT]     │
│ Node identity · Pairing · Last signed heartbeat · Manifest SHA              │
├─────────────────────┬─────────────────────┬─────────────────────────────────┤
│ Current lease       │ Resource envelope   │ Routing ownership               │
│ task / path / TTL   │ CPU / RAM / GPU     │ Local: OmniRoute                │
│ one writer          │ queue / thermal     │ Cloud: LiteLLM                  │
│ cancellation state  │ admission verdict   │ Emergency: OpenRouter direct    │
├─────────────────────┴─────────────────────┴─────────────────────────────────┤
│ Alias eligibility matrix                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ Provider health · stale state · budgets · latest bounded canary             │
├─────────────────────────────────────────────────────────────────────────────┤
│ Recent receipts and unresolved reconciliation                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Truth-state vocabulary

Every status uses text and an icon; color is supplementary.

| State | Meaning | Allowed visual treatment |
| --- | --- | --- |
| `VERIFIED` | Evidence is current and passed the declared gate | Positive icon plus timestamp |
| `CANARY_READY` | Bounded canary passed; route is not generally promoted | Cyan/neutral, never “Production” |
| `APPROVED_ROUTE` | Route is explicitly promoted for a defined scope | Positive icon plus scope label |
| `DEGRADED` | Working with measured impairment | Warning icon plus effect |
| `STALE` | Evidence TTL expired | Clock icon plus last observation |
| `UNVERIFIED` | Config/source exists, runtime not proven | Hollow icon; no green |
| `DISABLED` | Intentionally unavailable | Pause icon |
| `BLOCKED` | Policy, data, budget, auth, or gate denied it | Stop icon plus reason |
| `UNKNOWN_RESULT` | Side effect may have happened but is unreconciled | Critical icon; retry disabled |

Never use “connected,” “healthy,” “online,” or a green dot without an evidence
source, observation time, TTL, and verifier.

## Alias cards

Each alias card shows:

- alias name and purpose;
- allowed data classes;
- required capabilities: code, reasoning, image, structured output, tools, long
  context;
- selected lane and retry owner;
- eligible provider count after current discovery;
- current budget and quota posture;
- checker separation requirement;
- latest canary and staleness;
- blockers and the exact next gate.

Raw provider model IDs are hidden in the default view. An **Evidence details**
drawer may show them together with provider, endpoint class, catalog time,
capabilities, and receipt hashes.

## Provider cards

Provider cards are grouped by failure domain, not by marketing rank. Required
fields:

- provider family and adapter protocol;
- state and last observation;
- credential reference status: present/missing, never the value;
- account-visible model count;
- eligible aliases;
- data policy and allowed data classes;
- rate-limit/capacity status;
- p50/p95 latency and error rate over a stated window;
- budget consumed and cap;
- circuit-breaker state;
- retry ownership;
- latest canary receipt;
- disable reason.

The free-provider area must say **Best effort — not SLA**. The OpenRouter free
router must say **Model chosen dynamically**; explicit free variants display the
actual requested model. AIPass is placed in an **Experimental / Manual** section,
not among normal capacity.

## Error experience

The current AutoClaw screenshot reduces a failure to “LLM request failed.” The PC
Node console replaces this with a structured incident card:

```text
CAPACITY_EXHAUSTED
Alias: sirinx-code
Lane: cloud-governed
Retry owner: LiteLLM
Attempt: 1 of 2
Provider/model: hidden until receipt / unavailable if request never started
Data class: internal
Next action: wait for cooldown or request a bounded alternate-route approval
Automatic client retry: disabled
```

Other first-class error types:

- `AUTH_MISSING` / `AUTH_REJECTED`;
- `MODEL_NOT_VISIBLE_TO_ACCOUNT`;
- `MODEL_STALE_OR_REMOVED`;
- `CONTEXT_LIMIT_EXCEEDED`;
- `CAPABILITY_MISMATCH`;
- `POLICY_DENIED`;
- `BUDGET_DENIED`;
- `TOOL_SCHEMA_REJECTED`;
- `STRUCTURED_OUTPUT_INVALID`;
- `CHECKER_REJECTED`;
- `POST_ACTION_VERIFY_FAILED`;
- `UNKNOWN_RESULT_REQUIRES_RECONCILIATION`.

Each error includes owner, evidence, last attempted action, safe next step, and
whether retry is allowed.

## Provider onboarding flow

1. **Choose adapter protocol** — OpenAI compatible, OpenAI Responses, Anthropic
   Messages, or provider native.
2. **Register endpoint** — name and secret reference only; no secret value in UI
   logs or review payload.
3. **Discover account-visible models** — preview differences from the prior
   catalog.
4. **Declare capabilities** — text/image/tools/JSON/reasoning/context. Unverified
   claims remain warnings.
5. **Map aliases** — no automatic promotion.
6. **Set data policy and budget** — public/internal/sensitive eligibility, ZDR,
   collection policy, token and cost limits.
7. **Run negative auth test** — verify rejection without disclosure.
8. **Request bounded canary approval** — bind prompt, model, cap, expiry, and
   expected schema.
9. **Review receipt** — actual provider/model, attempts, cost, latency, output
   hash, checker verdict.
10. **Promote or hold** — promotion is scoped and reversible.

## Approval interaction

The approval sheet must visibly bind:

- action type;
- provider family and model alias;
- exact payload or prompt hash;
- data class and purpose;
- maximum input/output tokens;
- maximum cost;
- retry owner and maximum attempts;
- tool allowlist;
- target workspace/path;
- expiry and nonce;
- rollback or cancellation strategy;
- required evidence fields.

The operator cannot approve by typing a vague natural-language phrase. Approval
is one-use, action-bound, and consumed by the executor.

## DSH and jcode surfaces

The console shows DSH and jcode as **clients** with:

- installed artifact version and hash;
- command path and all duplicate PATH resolutions;
- selected SIRINX gateway profile;
- selected alias;
- workspace root and permission mode;
- active process identity;
- last request receipt;
- provider routing disabled/enabled state inside the client.

A duplicate Node/npm/npx resolution is a warning because desktop applications
may use bundled runtimes while the terminal uses nvm or a system installation.
The operator sees the exact executable path used by each process.

## Serena tunnel surface

The tunnel view shows:

- tunnel ID fingerprint, not full secret material;
- organization/workspace association;
- runtime-key permission class;
- DPAPI storage state;
- `tunnel-client doctor` verdict;
- local readiness and status-UI port;
- active Serena project path;
- allowed and denied tools;
- start time, last heartbeat, and stop control;
- unreviewed tool-list changes.

A prominent banner says **READ-ONLY PILOT**. Write/shell tools appear in the denied
list and cannot be enabled from the status panel. A separate security-reviewed
change is required.

## Offline, stale, and recovery states

- When the PC is offline, retain the last receipt projection but mark every
  runtime field stale.
- Queue age and lease expiry are visible.
- Never replay an expired approval.
- A restarted gateway begins `UNVERIFIED` until identity, config hash, and health
  canary are reconciled.
- If a provider returns an ambiguous timeout after a consequential request, mark
  `UNKNOWN_RESULT` and disable automatic retry.
- Recovery controls are separate from health checks and require approval.

## Accessibility

- WCAG 2.2 AA contrast target;
- status never communicated by color alone;
- full keyboard navigation and visible focus;
- 44×44 CSS-pixel minimum touch targets where the console is used remotely;
- semantic headings, landmarks, tables, and live regions;
- reduced-motion mode;
- monospace only for IDs, hashes, and commands;
- numerical metrics include units and observation windows;
- charts provide text summaries;
- Thai and English copy must fit without truncating critical states.

## Visual system

Use the existing SIRINX command-center language:

- deep navy foundation;
- cyan for active evidence paths;
- gold for warnings and approvals;
- green only for verified success;
- red only for denial, failed verification, or unresolved consequence;
- neutral gray for disabled and unavailable states.

Status chips include icon + text + timestamp. Cards use a clear information
hierarchy rather than decorative gradients. Animation is limited to active
progress with a deterministic completion or timeout state.

## Responsive behavior

Desktop widths use the three-column overview. At narrower widths:

1. node identity and stop point;
2. current lease and routing owner;
3. alias eligibility;
4. provider health;
5. receipts.

Do not hide blockers, approval expiry, data class, or retry owner behind hover.

## Product analytics and audit

Product analytics must never capture prompts, source code, secrets, raw tool
arguments, or private file paths. Permitted operational counters include:

- route-preview count by alias;
- blocked reason class;
- time to canary decision;
- stale-provider count;
- mean time to reconcile unknown results;
- percentage of receipts with complete evidence;
- operator cancellation and rollback success.

Audit events are append-only and hash-linked. Analytics never outrank audit or
runtime evidence.

## Visual and interaction QA

Required tests before implementation is promoted:

- all truth states render without relying on color;
- long Thai and English strings wrap without covering controls;
- no secret values appear in DOM snapshots, logs, accessibility names, or error
  boundaries;
- stale state appears after TTL expiry;
- a catalog-only provider cannot render green;
- capacity failure identifies retry owner and remaining attempts;
- AIPass cannot be selected for internal/sensitive data;
- raw model IDs cannot be selected from the primary task flow;
- approval review shows payload hash, budget, expiry, and target;
- keyboard-only provider onboarding completes;
- 200%, 300%, and 400% zoom preserve critical information;
- reduced-motion mode removes nonessential animation;
- visual-regression baselines cover overview, provider, approval, receipt,
  offline, stale, denied, and unknown-result states.

## Definition of done

The product-design phase passes only when an operator can distinguish source,
config, runtime, canary, promoted route, attempted action, verified success, and
unknown result without opening raw logs—and every mutation remains behind an
action-bound approval and evidence receipt.
