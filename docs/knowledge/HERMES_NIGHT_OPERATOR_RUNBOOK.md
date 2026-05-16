---
type: hermes-night-operator-runbook
project: SIRINX OS
status: active-local
date: 2026-05-17
---

# Hermes Night Operator Runbook

## Goal

Allow Hermes and Codex to keep supervising the SIRINX local control plane while the operator is asleep or busy, without pretending to have unsafe autonomy.

This is not full autonomous production control. It is a safe overnight operator loop:

```text
Observe -> record -> classify risk -> continue dry-run work or stop for approval
```

## Current Verified State

- Public company website source: `/Users/sirinx/restore-sources/ton36475-lgtm-sirinx`
- Public website live domain: `https://www.sirinx.co`
- Latest public commits:
  - `c5a9a2c feat: add province SEO metadata and static pages`
  - `3790770 perf: improve homepage pagespeed and accessibility`
- SIRINX OS control repo: `/Users/sirinx/sirinx-os`
- Latest SIRINX OS commit: `4270589 feat: add Codex Hermes command center controls`
- Obsidian vault: `/Users/sirinx/Documents/Obsidian Vault/SIRINX`
- Hermes dashboard: `http://127.0.0.1:9119`
- Developer dashboard: `http://127.0.0.1:8710`
- Dev control API: `http://127.0.0.1:8711/health`
- Hermes gateway: running manually, not as a system service.
- Codex filesystem memory bridge: MCP filesystem server is running for `/Users/sirinx/sirinx-os` and `/Users/sirinx/Documents/Obsidian Vault`.

## Overnight Command

Run a snapshot manually:

```bash
cd /Users/sirinx/sirinx-os
pnpm night-watch
```

The command appends a safe local status snapshot to:

```text
/Users/sirinx/Documents/Obsidian Vault/SIRINX/Hermes Night Watch Log.md
```

## What The Snapshot Checks

- Local SIRINX stack status.
- Hermes Desktop status.
- Hermes gateway status.
- Hermes kanban stats and ready tasks.
- Live public website status.
- Sitemap count.
- Province route count.
- Public website git branch, commit, and dirty state.
- SIRINX OS git branch, commit, and dirty state.

## Hard Stops

Hermes/Codex must stop and request approval before:

- Cloudflare DNS, Worker, Pages config, secret, or routing mutation.
- Git push.
- Production deploy.
- LINE, Telegram, email, CRM, or customer-facing send.
- Supabase write or migration.
- Solis inverter or physical load-control command.
- Reading, printing, copying, or uploading secrets.

## Allowed While Operator Sleeps

- Read-only website status checks.
- Read-only local git status.
- Read-only Hermes board inspection.
- Local docs and Obsidian notes.
- Dry-run build/type/test checks.
- Dry-run subdomain preflight.
- Drafting implementation plans and review summaries.

## Pending Work Queue

1. Verify production contact form lead delivery before paid traffic.
2. Add uptime checks for `/`, `/assessment`, `/pricing`, `/contact`, and one province route.
3. Decide production analytics architecture.
4. Push public website commits only after explicit approval.
5. Select first subdomain candidate and run build verification only.
6. Rotate/revoke legacy Telegram credentials before any production Telegram send.
7. Verify local Ollama brain responses.
8. Verify thClaws agent team and KMS brain.
9. Review external connector write gates.
10. Continue Solis load-balancing only in read-only/dry-run mode.

## Codex Memory Rule

Every long vibe-coding session must end by writing:

- Work summary.
- Changed files.
- Tests and checks.
- Deploy status, if any.
- Risks and blocked approvals.
- Next exact task.

Primary memory target:

```text
/Users/sirinx/Documents/Obsidian Vault/SIRINX/Hermes Night Watch Log.md
```

Stable knowledge target:

```text
/Users/sirinx/Documents/Obsidian Vault/SIRINX/SIRINX OS Knowledge Base/
```
