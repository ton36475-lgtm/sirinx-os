# Mac Mini Codex Mobile And Hermes Control Plane

Date: 2026-05-16
Host: Mac mini ของ Sirinx / MacminiSirinx
Mode: local control plane, dry-run first, approval-gated external actions

## Goal

Use this Mac mini as the real operational host for:

- Codex Mobile command, review, and approval from ChatGPT mobile.
- Hermes dashboard and messaging gateway.
- SIRINX OS Developer Command Center.
- Public website management without mixing internal systems into `www.sirinx.co`.
- Project inventory and subdomain planning across local repos.

Mobile is the command and approval surface. The Mac mini is the execution surface.

## Verified Host State

Checked without reading secrets:

- macOS on Apple Silicon: `arm64`
- Codex App is running.
- Codex CLI is installed at `/opt/homebrew/bin/codex`.
- Codex CLI version: `0.130.0`
- Computer sleep on AC power: `sleep 0`
- Dev Control API: `http://127.0.0.1:8711/health`
- Developer Command Center: `http://127.0.0.1:8710`
- Hermes dashboard process: `http://127.0.0.1:9119`
- Hermes gateway process is running.
- SIRINX Dev Control API reports `dryRunOnly: true` and `externalWrites: false`.

Not read:

- `.env`
- `/Users/sirinx/.hermes/auth.json`
- `/Users/sirinx/.hermes/config.yaml`
- any token, API key, passkey, OAuth secret, or private credential

## Source Of Truth Map

| Area | Path | Role | Rule |
| --- | --- | --- | --- |
| Public website | `/Users/sirinx/restore-sources/ton36475-lgtm-sirinx` | `www.sirinx.co` source | Protected. Do not mix internal dashboards into it. |
| SIRINX OS | `/Users/sirinx/sirinx-os` | command center, release gates, Solis plans, project registry | Main control plane. |
| Hermes runtime | `/Users/sirinx/.hermes/hermes-agent` | local agent runtime, dashboard, messaging gateway | Keep local/private unless explicitly approved. |
| GitHub audit clones | `/Users/sirinx/restore-sources/github-audit` | subdomain/reference sources | Build-verify before use. |
| OZ / OpenClaw / thClaws | `/Users/sirinx/OZ-CORP-MONOREPO`, `/Users/sirinx/OZ-CORP/services/openclaw-worker`, `/Users/sirinx/thClaws` | legacy/reference agent systems | Internal reference only until reviewed. |

## Filesystem Scan Boundary

The Mac mini contains additional Git repositories under tool caches, vendored
skills, downloaded folders, and archived Codex workspaces. Treat these as
non-operational unless a specific task explicitly promotes one of them:

- `/Users/sirinx/.codex/**`
- `/Users/sirinx/.cursor/plugins/**`
- `/Users/sirinx/Documents/Codex/**`
- `/Users/sirinx/Downloads`
- `/Users/sirinx/.nvm`

Operational project reads should start from the source-of-truth map above and
the Developer Command Center project inventory. This prevents cache/plugin
repos from being mistaken for deployable SIRINX systems.

## Codex Mobile Setup

Use the official Codex remote connection flow:

1. On the Mac mini, open Codex App.
2. Use `Set up Codex mobile` or `Settings > Connections`.
3. Show the QR code.
4. On the phone, open ChatGPT mobile with the same ChatGPT account and workspace.
5. Open Codex, scan the QR, complete MFA/SSO/passkey if required.
6. Confirm the Mac mini host appears on mobile.
7. Keep Codex App open, Mac mini online, and the Mac awake.

If mobile cannot see the host:

- Confirm the same ChatGPT account and workspace.
- Confirm workspace Remote Control permission is enabled if your plan requires it.
- Confirm Codex App is running on the Mac mini.
- Confirm the Mac did not sleep or lose network.
- Re-open `Settings > Connections` and pair again.

## Mobile Operating Prompt

Use this first prompt from Codex Mobile when starting a real task:

```text
Read AGENTS.md first.

Operate on this Mac mini host only.

Mission:
Inspect SIRINX project state and report the next safe action.

Rules:
- Do not deploy.
- Do not push.
- Do not mutate Cloudflare, GitHub settings, DNS, databases, or messaging channels.
- Do not read .env, auth.json, config.yaml secrets, tokens, or private credentials.
- Do not send Telegram, LINE, email, SMS, or customer messages.
- Work dry-run first.

Output:
1. current repo
2. changed files
3. running services
4. project inventory summary
5. safest next action
```

## Hermes Commands

Safe status checks:

```bash
cd /Users/sirinx/sirinx-os
pnpm stack:status
curl http://127.0.0.1:8711/health
curl http://127.0.0.1:8711/api/project-inventory
```

Hermes local checks:

```bash
hermes status
hermes gateway status
hermes dashboard --status
```

Start commands when needed:

```bash
cd /Users/sirinx/sirinx-os
pnpm dashboard:run
```

```bash
hermes dashboard --host 127.0.0.1 --port 9119 --no-open
hermes gateway run --accept-hooks
```

Do not run `hermes setup`, `hermes config edit`, or channel setup commands from mobile unless the task is specifically to configure that channel and the user is ready to provide/confirm credentials on the host.

## Real-Use Control Flow

```text
ChatGPT Mobile / Codex Mobile
  -> Codex App on Mac mini
  -> local repos, shell, plugins, MCP, browser, Computer Use configuration
  -> SIRINX OS Dev Control API
  -> Hermes dashboard/gateway
  -> dry-run approval queue
  -> human approval
  -> GitHub / Cloudflare / Telegram / LINE / Supabase actions
```

External writes are blocked by default. Production writes require a specific approval at the moment of action.

## Safe First Production Sequence

1. Finish current public website working tree: review, commit, deploy only after explicit approval.
2. Finish current `sirinx-os` command center working tree: `pnpm verify` and `pnpm dashboard:e2e`.
3. Pair Codex Mobile QR.
4. From mobile, run inventory-only prompts.
5. Select one subdomain candidate.
6. Build/check that candidate locally.
7. Draft Cloudflare Access/DNS/Pages plan.
8. Apply only after explicit approval.

## Hard Blocks

- No real Telegram/LINE sends until credentials and allowed users are reviewed.
- No Cloudflare DNS/route/deploy changes without approval.
- No database migrations without approval.
- No public exposure for Hermes dashboard, local AI, MCP servers, or internal control panels.
- No raw chat logs or secrets may become memory.
- No internal app may replace `www.sirinx.co`.
