# SIRINX Hermes Adaptive Command Gateway v0.2

Date: 2026-05-27
Status: local-only dry-run contract
Stop point: HERMES ADAPTIVE COMMAND GATEWAY V0.2 READY - FAST ACK QUEUE DRY-RUN - WAITING FOR GATEWAY RELOAD APPROVAL

## Purpose

Hermes Adaptive Command Gateway v0.2 turns Telegram commands into fast, structured local gateway decisions. It fixes the slow path where Telegram waits for a full model or agent run by separating quick command handling from long-running planning work.

The v0.2 implementation is a status and dry-run layer only. It does not send Telegram messages, call OpenRouter, start Hermes workers, start MCP, install packages, deploy, push, publish, or run Codex/Antigravity.

## Local API

```text
GET /api/hermes-adaptive-command-gateway
POST /api/hermes-adaptive-command-gateway/telegram/dry-run
```

Both endpoints return JSON only. The dry-run endpoint previews ACK text, parser output, queue intent, mission object, progress callbacks, and blocked capabilities.

## Core Rules

- Fast ACK first.
- Queue long jobs.
- Route before reasoning.
- Approve before execution.
- PC node executes only after approval.
- Mobile node monitors and approves.
- Telegram reports status only in v0.2.
- LAN PC marketing worker sync is a dry-run/report lane until a separate pairing and platform approval exists.
- Gemini Daily Report is a local packet for manual Gemini CLI review; the gateway must not auto-run Gemini.
- GHOSTCLAW Autoflow and Autocut may prepare briefs, checklists, cut lists, and asset manifests only. Live run, render, export, upload, publish, spend, or customer send remains blocked.

## Command Registry

```text
/clear
/reset
/status
/jobs
/jobs get <job_id>
/kanban boards list
/kanban boards switch <slug>
/mission create "<name>"
/mission route "<route>" --provider <provider> --sync <targets> --mode <mode>
/mission status
/hermes approve <job_id>
/hermes cancel <job_id>
/hermes sync pc
/hermes sync mobile
/hermes mission create --board <slug> --name "<name>" --route "<route>" --provider <provider> --sync <targets> --mode <mode>
```

`/clear` is an alias for `/reset`.

## Model Split

Router lane:

```text
provider: openrouter
model: qwen/qwen3.7-max
context_length: 1000000
max_tokens: 512
temperature: 0.1
```

Planner lane:

```text
provider: openrouter
model: qwen/qwen3.7-max
context_length: 1000000
max_tokens: 4096
temperature: 0.2
```

Reviewer lane:

```text
provider: openrouter
model: qwen/qwen3.7-max
context_length: 1000000
max_tokens: 3000
temperature: 0.1
```

All lanes now use the same 1M-context OpenRouter Qwen model so Hermes, gateway dry-runs, and deep planning reports align with the host runtime. Output token caps stay bounded so context capacity does not become unbounded response spend. Provider calls remain blocked in v0.2.

## Queue Contract

```text
backend: sqlite
db_path: .hermes/jobs.sqlite
worker_concurrency: 2
retry_attempts: 2
retry_backoff_ms: 3000
persisted_by_dry_run: false
```

Dry-run responses show the queue packet but do not write jobs to the SQLite database.

Supported job states:

```text
QUEUED
ROUTING
PLANNING
RUNNING_CODEX
RUNNING_ANTIGRAVITY
SYNCING_PC_NODE
SYNCING_MOBILE_NODE
WAITING_APPROVAL
DONE
FAILED
```

## Secret Guard

If Telegram input looks like a token, bearer value, model provider key, bot token, or credential assignment, the gateway:

- redacts the value in response payloads,
- does not forward it to model routing,
- does not create a job,
- returns a rotate/revoke recommendation,
- keeps all send/provider/worker flags false.

## Structured Mission Example

```text
/kanban boards switch fusion-team-ai
/mission create "Fusion Team AI: Hermes Codex Antigravity Adaptive Sync"
/mission route "HERMES>CODEX>ANTIGRAVITY" --provider openrouter --sync pc,mobile --mode adaptive
/mission status
```

One-line equivalent:

```text
/hermes mission create --board fusion-team-ai --name "Fusion Team AI" --route "HERMES>CODEX>ANTIGRAVITY" --provider openrouter --sync "pc,mobile" --mode adaptive
```

## Blocked Actions

- agent execution
- real MCP start
- package install
- provider call
- secret read or print
- Telegram/LINE/email/SMS/message send
- deploy
- push
- publish
- external connector activation
- online marketing platform publish/spend
- autoflow live run
- autocut live export/upload
- automatic Gemini CLI execution

## Verification

```bash
pnpm adaptive-command-gateway:test
pnpm check
pnpm verify:workspace
pnpm audit:secrets
pnpm dashboard:e2e
git diff --check
```

No verification command launches Hermes, sends Telegram messages, calls OpenRouter, starts MCP, or installs packages.
