# SIRINX Full Local OS Lane Contracts

Date: 2026-05-26
Mode: local-only
Status: implementation contract

## Purpose

This file extends the v1 VibeCoding wiring map into the Full Local OS plan without changing the approval boundary. It is a lane contract for local code, dashboard visibility, SOC read-only reporting, and architecture/provenance docs.

## Added Lanes

| Lane | Status | Verification | External boundary |
| --- | --- | --- | --- |
| SOC Monitor | active local read-only | `pnpm soc:check`, `pnpm soc:test` | Telegram delivery blocked until evidence and exact approval |
| Truth Protocol | active local read-only | `pnpm soc:test`, `pnpm verify` | No unobserved real-world claims |
| Model Fusion Router | blueprint local-only | architecture doc review | No paid API or multi-model call |
| AI Access Gateway | blueprint local-only | architecture doc review | No API resale, credential sharing, or rate-limit bypass |
| n8n Bridge | dry-run only | dashboard/API review | No external workflow activation |
| Obsidian Provenance | active local notes | local file existence and secret scan | No raw secrets, raw chat logs, or private identifiers |
| Telegram Report Gate | blocked until evidence | `pnpm external-gates:evidence-check` | No send before token/recipient evidence and exact approval |

## SOC v1 Contract

SOC v1 may:

- Read local CPU, memory, and disk metrics.
- Mark Docker as observed, unavailable, or not run.
- Expose read-only status through `GET /api/soc/status`.
- Write local JSON/A2A artifacts only through `pnpm soc:dry-run`.

SOC v1 must not:

- Send Telegram, LINE, email, SMS, or customer messages.
- Restart containers or kill processes.
- Delete files.
- Deploy, push, publish, activate connectors, run real MCP, call paid APIs, or read/print secrets.

## Truth Protocol

Every report field must be one of:

- `observed`: measured by local code in the current run.
- `template`: layout or placeholder only.
- `blocked`: intentionally stopped by policy, evidence, or approval gates.
- `not_run`: not collected in this run.

Telegram delivery can only be `observed` after a separately approved send. Until then it is `blocked`.

## Stop Point

```text
FULL LOCAL OS LANE CONTRACT READY — LOCAL ONLY — WAITING FOR IMPLEMENTATION APPROVAL
```
