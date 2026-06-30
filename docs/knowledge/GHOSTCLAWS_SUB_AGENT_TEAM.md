# GhostClaws Sub-Agent Team

Date: 2026-06-30
Mode: local-first, approval-gated, no live provider calls

## Purpose

This document defines the AGENT GHOSTCLAWS worker team used by Hermes and
Codex for the Thai Jarvis local operating system. It is a local execution and
review contract, not authorization for push, deploy, live customer messaging,
secret access, paid model calls, package installs, or cloud mutation.

## Team Roles

| Worker | Role | Default Authority |
| --- | --- | --- |
| Hermes Commander | Command intake, routing, mission decomposition, final report | Route and approve only with receipts |
| Codex Builder | Repo inspection, patches, tests, receipts, local commits | Local allowed paths only |
| Repo Mapper | Read-only source map and changed-file classification | No mutation |
| Policy Guardian | Action tier enforcement and hard-stop checks | Final local policy authority |
| Validator Worker | JSON validation, tests, diff checks, receipt verification | No source mutation except receipts/status |
| Browser Use Worker | Local dashboard smoke evidence only | No login, payment, private data, or send flows |
| Vibe Coding Agent | Natural-language task graph, worker selection, approval request | Routes through policy and receipts |
| Model Router | Logical lane selection for coding, mapping, architecture, critic review | No live provider call or key read |
| Kimi Worker Lane | Coding reference, patch planning, test planning, reference vote | No model download or live inference |
| GLM Repo Mapper | Long-context map reference lane | Read-only |
| DeepSeek Reasoner | Architecture/reference reasoning lane | Read-only unless routed through Codex |
| Opus Critic | Safety, bug, uncertainty, and architecture critique | No final execution |
| GitHub Toptrend Research Worker | Public metadata research only | No clone, install, or unknown code execution |
| EdgeOne Readiness Worker | R3 readiness packets and checklists | No preview or production deploy |
| Receipt / Memory Worker | Receipts, logs, archive, Obsidian pulse summaries | Never deletes audit trails |

## MoA-Gated Brainstorm Contract

The brainstorm lane is a gated review process, not an execution bypass.

Required references:

- `ref_A_safety_risk`
- `ref_B_speed_cost`
- `ref_C_correctness_proof`

Hermes aggregates votes and records the decision evidence. MoA score is a
confidence signal only. Safety disagreement is a hard veto. MoA cannot override
the policy gate, start recursive agent loops, deploy, push, read secrets, call
providers, or send public/customer messages.

## Approval Rules

- Self-approval is forbidden.
- `requester_agent` and `approver_agent` must differ.
- `decision_id`, `evidence_pack`, and receipt are required.
- A/B tier local work can be approved by autonomous mutual approval.
- C tier requires quorum or a rollback plan.
- D/X tier actions are blocked.
- Local commit approval requires validation passed, allowed files only, and no
  blocked actions.

## Hard Stops

Stop and write a receipt if any task requires:

- `git push`, deploy, production action, or DNS/cloud mutation
- secrets, `.env`, tokens, customer/private data, banking, wallet, or password access
- Telegram/LINE/email/customer live send
- package install, global install, postinstall script, or unknown repo execution
- model download, GPU live inference, paid provider call, or API key read
- login, payment, security setting, captcha bypass, or private browser flow

## Current Evidence

- Worker registry: `GHOSTCLAW/workers/registry/worker-registry.json`
- A2A protocol: `GHOSTCLAW/protocols/A2A2A_PROTOCOL.md`
- Action tier cap: `GHOSTCLAW/policies/action-tier-cap.yaml`
- Auto approval engine: `GHOSTCLAW/agents/auto-approve-engine.mjs`
- Model router: `GHOSTCLAW/models/model-router.mjs`
- Browser smoke worker: `GHOSTCLAW/workers/browser-use/browser-use-smoke.mjs`
- Final receipt validator: `GHOSTCLAW/receipts/final-receipt-validator.mjs`

This document does not claim the full AGENT GHOSTCLAWS mission is complete.
It closes the Phase 8 sub-agent team documentation surface and keeps remaining
external actions gated.
