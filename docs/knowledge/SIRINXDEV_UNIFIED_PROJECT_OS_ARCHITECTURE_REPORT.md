# SIRINXDev Unified Project OS Architecture Report

Date: 2026-05-20
Status: architecture report captured for controlled implementation
Source scope: user-provided Unified Project OS report, current `sirinx-os` repo state, canonical `AGENTS.md`, Command Center design docs
Write policy: documentation only; no runtime install, no deploy, no external SaaS writes

## Executive Summary

SIRINXDev Unified Project OS is the target architecture for moving SIRINX from separate operational tools into a controlled, auditable, AI-assisted project operating system.

The design direction is sound: a single control-plane repository should coordinate the public website, Command Center, Hermes, thClaws-style async execution, release gates, SOC evidence, Obsidian memory, and future subdomain operations. The critical implementation rule is that the system must distinguish **target architecture** from **installed reality**. Internal dashboards and agents must not be treated as live production controls until each external gate has evidence, approval, rollback, and smoke-test proof.

Current source of truth:

- Public website: `/Users/sirinx/restore-sources/ton36475-lgtm-sirinx`
- Control plane: `/Users/sirinx/sirinx-os`
- Canonical operating protocol: `/Users/sirinx/sirinx-os/AGENTS.md`
- Command Center: local `http://127.0.0.1:8710`
- Dev Control API: local `http://127.0.0.1:8711`
- External gate evidence: `docs/knowledge/external-gates/`

## Target Architecture Doctrine

### Core Philosophy

The system should behave as a controlled agentic platform, not as an unbounded swarm.

Required operating properties:

- controlled execution
- explicit approval before risk
- local dry-run by default
- reversible deployment where possible
- append-only audit evidence
- no raw secrets or raw chat logs in memory
- public website separated from internal control surfaces

### Recommended Naming

Use `Unified Project OS` as the product architecture name and `Sovereign Agentic Swarm` as an internal design metaphor only. In implementation docs, prefer concrete names:

- Revenue Plane
- Control Plane
- Agent Runtime Plane
- Async Execution Plane
- Security/SOC Plane
- Memory Plane
- Creative Factory Plane

This keeps operator behavior testable and avoids vague autonomy claims.

## Current Reality Versus Target

| Area | Current verified state | Target state | Implementation rule |
| --- | --- | --- | --- |
| Public website | `www.sirinx.co` live, protected, performance-tuned | Public solar company website remains revenue surface | Do not merge internal apps into public homepage |
| Command Center | local dashboard/API working | future `dev.sirinx.co` with Access protection | No DNS/Access change without Cloudflare approval |
| External gates | 4 current gates tracked locally | evidence-driven gate execution | Use `pnpm external-gates:evidence-check` before action |
| Hermes | gateway running locally; pairing not complete | Commander/intake/router | Telegram/LINE sends remain blocked |
| Codex Mobile | QR/MFA not complete | mobile command/review/approval surface | Human manual gate |
| thClaws | local/reference only in current repo inventory | async execution runtime | validate binary/API/version before runtime claims |
| Solis | policy and read-only plan exist | read-only telemetry, later recommendations | consent, credential, station mapping required |
| SOC | design concept exists | log ingest, risk scoring, release evidence | start as local audit/event model |
| Obsidian | local memory and digest active | project knowledge graph | summary only, no secrets |

## Monorepo Strategy

The report proposes a monorepo to create shared context for agents and operators. The current `sirinx-os` already acts as the control-plane monorepo. A separate `/sirinxdev` root should not be created unless the team intentionally migrates from `sirinx-os`.

Recommended canonical layout:

| Directory | Target purpose | Current action |
| --- | --- | --- |
| `apps/public-site` | public website app if migrated into monorepo | keep separate for now; source remains `ton36475-lgtm-sirinx` |
| `apps/dev-dashboard` | Command Center UI | already exists |
| `apps/solar-intelligence` | solar proposal/ROI/intelligence service | already exists |
| `apps/agent-marketplace` | future MVP | create only after control-plane gates stabilize |
| `apps/live-agent-studio` | future live agent monitoring | backlog candidate |
| `apps/line-oa-richmenu-studio` | future LINE OA tool | blocked until LINE credential policy is ready |
| `services/dev-control-api` | local Command Center API | already exists |
| `services/hermes-api` | future Hermes inbox/intent bridge | design before implementation |
| `services/thclaws-runtime` | future async runner bridge | validate thClaws runtime first |
| `services/callback-gateway` | future signed callbacks | use HMAC/signature policy |
| `services/soc-log-ingestor` | future log/audit ingest | start local-only |
| `packages/async-core` | retry/idempotency primitives | create when first async runner is implemented |
| `packages/policy-core` | approval/risk/claim policy | promote from existing gate logic when repeated |
| `packages/agent-core` | role/profile/task contract | align with Hermes profiles and AGENTS.md |
| `packages/security` | crypto/auth/masking helpers | use for reusable local helpers only |
| `docs/knowledge` | architecture/runbooks/status | active |
| `infra` | Cloudflare/Workers/tunnel/IaC | approval-gated |
| `scripts` | local checks and safe tooling | active |

## Operating File Stack

The proposed seven-file stack is useful, but it should be introduced as a controlled proposal rather than replacing the current repo rules.

Target stack:

| File | Role | Current recommendation |
| --- | --- | --- |
| `AGENTS.md` | canonical operating rules | already active; update only by reviewed proposal |
| `PROJECT_STATE.md` | machine-readable status | create after schema is agreed |
| `NEXT_ACTIONS.md` | ordered queue | can be generated from backlog docs |
| `RULES_FOR_CODEX.md` | coding constraints | derive from `AGENTS.md` and current Codex practice |
| `MCP_MAP.md` | MCP/tool map | derive from current `docs/mcp-and-connector-map.md` |
| `SKILLS_REGISTRY.md` | reusable skills | start as doc-only registry |
| `TOOLS_REGISTRY.md` | local tools and permissions | start as doc-only registry |

Do not duplicate or contradict `AGENTS.md`. Treat new files as projections of the canonical protocol.

## Three-Layer Runtime Model

### Channel Layer

Purpose:

- normalize Telegram, LINE, Discord, web dashboard, and future channel events into a single internal event shape

Minimum event envelope:

```json
{
  "event_id": "uuid",
  "source": "telegram|line|dashboard|callback",
  "actor_type": "human|agent|system",
  "actor_ref": "masked-ref",
  "intent": "string",
  "payload_ref": "local-or-signed-ref",
  "received_at": "iso8601",
  "risk_hint": "low|medium|high",
  "external_write_requested": false
}
```

Implementation guardrails:

- verify signatures before trusting webhook payloads
- mask PII in logs
- never put raw tokens in payloads
- keep customer messaging disabled until recipient evidence passes

### Brain Layer

Purpose:

- classify intent
- route work to deterministic pipelines or bounded agents
- produce approval packets and risk explanations

Important correction:

- Do not store chain-of-thought. Store decisions, assumptions, tool inputs, outputs, and audit summaries only.

Recommended record:

```json
{
  "decision_id": "uuid",
  "intent": "release-gate-check",
  "agent": "hermes-commander",
  "inputs": ["masked refs"],
  "decision": "blocked",
  "reason_summary": "Cloudflare approval missing",
  "required_evidence": ["candidate rule", "rollback path"],
  "created_at": "iso8601"
}
```

### Body Layer

Purpose:

- execute local checks, async jobs, browser QA, builds, and future sandboxed tasks

Target async run envelope:

```json
{
  "prompt": "summarize ISO27001 alignment from local audit logs",
  "model": "validated-model-id",
  "idempotency_key": "task-uuid",
  "callback_url": "local-or-approved-url",
  "limits": {
    "max_tokens": 10000,
    "timeout_seconds": 300
  },
  "risk": {
    "external_write": false,
    "paid_api": false,
    "requires_human_approval": false
  }
}
```

Implementation guardrails:

- idempotency required for every async job
- retries must be bounded
- callbacks must be signed
- sandbox network defaults to disabled
- paid APIs require explicit gate

## Release Gate Model

The proposed 10-gate release model is useful as a target, but the current system already has active external gates. Do not replace the current four-gate external workflow; layer the 10-gate model as an internal release pipeline.

Target release gates:

| Gate | Name | Requirement | Controller |
| --- | --- | --- | --- |
| 00 | Scope Lock | file scope, risk, expected result recorded | Commander |
| 01 | Static Analysis | syntax/type/static checks pass | Lint agent |
| 02 | Unit/E2E Tests | relevant tests pass | Test runner |
| 03 | Dependency Audit | dependency and secret exposure reviewed | SCA/SOC |
| 04 | Build Integrity | build artifact verified | CI/local build |
| 05 | Public Leak Audit | secrets, raw chat logs, PII blocked | Security guard |
| 06 | Access Audit | auth/MFA/Access scope checked | Security officer |
| 07 | Async Smoke Test | async/dry-run execution checked | Async monitor |
| 08 | Hermes Approval | intent/risk/rollback packet reviewed | Hermes |
| 09 | Human Board | human confirms external action | Operator |
| 10 | Readiness | smoke, rollback, monitoring complete | Final auditor |

## SOC And Security Architecture

Start with local audit, not autonomous production security.

Minimum SOC event:

```json
{
  "event_id": "uuid",
  "source": "dev-control-api|dashboard|hermes|cloudflare|worker",
  "severity": "info|warn|critical",
  "category": "approval|deploy|message|credential|cloud|api",
  "actor": "masked",
  "action": "string",
  "allowed": false,
  "approval_ref": "optional",
  "evidence_ref": "local-file",
  "created_at": "iso8601"
}
```

Safety rules:

- no exploit automation against third-party systems
- no unauthorized scanning
- no stealth behavior
- no autonomous patch/deploy without gate 09
- no deletion of logs or evidence

## Creative Factory Architecture

Creative Factory is valid as a future plane, but it must stay outside production operations until resource and approval rules are defined.

Target capabilities:

- design brief intake
- generated image/video concept planning
- brand token alignment
- presentation/document artifact creation
- approval before external publishing

Blocked until separately approved:

- GPU-heavy render pipelines
- paid media generation at scale
- external publishing
- customer-visible claims

## Assumption Register

The provided report includes names and versions that must be validated before runtime use.

| Claim | Current treatment |
| --- | --- |
| `thClaws 0.10.0` active runtime | target assumption until local binary/API/version is verified |
| `Qwen3.6-27B` | model placeholder until provider availability is verified |
| `Claude Mythos Preview` | model placeholder; do not reference as installed capability without source |
| `SANA-WM` 720p 60s video pipeline | creative research assumption; not active production pipeline |
| Hermes connected to Discord | simulated/target unless `hermes status` proves it |
| SOC DB MCP endpoint | target design; no production endpoint should be assumed |
| OAuth 2.1 PKCE MCP auth | design target; requires implementation proof |

## 14-Day Installation Control Plan

| Day | Focus | Deliverable | Gate |
| --- | --- | --- | --- |
| 1 | Architecture lock | report, file-stack proposal, target/current map | docs only |
| 2 | Project state schema | `PROJECT_STATE.md` and `NEXT_ACTIONS.md` draft | no runtime write |
| 3 | Command Center alignment | dashboard cards for release gates/status | local E2E |
| 4 | Hermes inbox design | `/hermes/inbox` contract and HMAC policy | no external channel |
| 5 | thClaws adapter proof | version/API detection and dry-run adapter | no paid/external calls |
| 6 | Async core | idempotency/retry schema | unit tests |
| 7 | Callback gateway | local signed callback prototype | local only |
| 8 | SOC event schema | append-only local events | secret scan |
| 9 | Release gate model | gates 00-10 rendered in dashboard | E2E |
| 10 | Evidence intake integration | external-gate evidence surfaced in dashboard | no sends |
| 11 | Subdomain preflight | one candidate subdomain design | no DNS |
| 12 | Cloudflare Access plan | Access/WAF/Bot review packet | approval gate |
| 13 | Messaging dry-run | Telegram/LINE dry-run envelope | no customer send |
| 14 | Final readiness review | test matrix, rollback, operator checklist | human approval |

## Immediate Next Work Packages

### P0 - State File Stack Proposal

Create proposal files under docs first:

- `PROJECT_STATE.md` schema
- `NEXT_ACTIONS.md` queue format
- `RULES_FOR_CODEX.md` projection
- `MCP_MAP.md` projection
- `SKILLS_REGISTRY.md` projection
- `TOOLS_REGISTRY.md` projection

Do not activate them as root files until reviewed against `AGENTS.md`.

### P1 - Hermes Inbox Contract

Define:

- `POST /hermes/inbox`
- signed payload shape
- intent classification result
- approval packet output
- audit event output

### P1 - thClaws Runtime Verification

Define:

- how to detect installed version
- how to run safe dry-run health check
- how to prove network isolation
- how to block paid/external calls

### P2 - Release Gate Dashboard

Add local dashboard rendering for gates 00-10, using current safety model:

- no deploy
- no push
- no cloud mutation
- no customer message
- no secret read

## Acceptance Criteria

This architecture is ready to move from report to implementation only when:

- target/current status is clear
- every new runtime route has a local test
- every external action has evidence intake
- every credential dependency has a storage path but no value in docs
- public website remains isolated
- `pnpm verify`, `pnpm dashboard:e2e`, `pnpm external-gates:check`, and `pnpm external-gates:evidence-check` pass

