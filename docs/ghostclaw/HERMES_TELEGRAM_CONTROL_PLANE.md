# Hermes Telegram Control Plane

**Date:** 2026-06-30
**Control Plane:** Telegram only
**No Human Prompt Loop:** true

---

## Supported Commands

| Command | Behavior |
|---|---|
| /ghostclaw-run | Start mission from packet |
| /gc status | Read status files only |
| /gc queue | Summarize queue only |
| /gc receipts | Summarize receipts only |
| /gc blocked | Summarize blocked actions only |
| /gc report | Return latest final report |
| /gc validate | Run safe validation only |
| /gc archive | Archive completed mission |
| /gc stop | Graceful stop after current safe step |
| /gc resume | Resume from status and receipts |
| /fable5 preview | Preview OpenRouter Fable5 request route only; no provider call |
| /a2a2a status | Preview A2A2A P002-P004 gate status only |
| /a2a2a dispatch preview | Preview P004 local worker envelope writes only |
| /a2a2a gate check <exact gate> | Check whether the supplied local dispatch gate is exact; no execution |
| /a2a2a execute readiness | Preview whether P004 execute preconditions are satisfied; no execution |
| /a2a2a execute command preview <exact gate> | Preview the local P004 executor command; no execution |
| /a2a2a completion audit | Confirm the local-safe A2A2A chain is complete; no live actions |
| /a2a2a live gate readiness | Confirm prerequisites before requesting one live Telegram/runtime gate; no live actions |

## Policy

- No real bot token in docs — placeholders only
- No external Telegram broadcast without explicit gate
- All commands are local-safe (Tier A/B)
- D/X actions auto-blocked with receipt

## Config-First Gate

Canonical local-safe config:

```text
configs/hermes_telegram_gateway.config.json
```

Current mode:

```text
dry_run_first
defaultLiveSend=false
webhook.enabled=false
polling.enabled=false
```

The command router must preview by default. Live Telegram send requires an
explicit `liveSend=true` runtime option plus the gate named in the config. The
config stores only environment variable key names and policy paths; it must not
store bot tokens, chat IDs, cookies, customer identifiers, or webhook secrets.

Closed gates:

- `APPROVE_TELEGRAM_GATEWAY_LIVE_SEND_A019E53EE`
- `APPROVE_TELEGRAM_GATEWAY_WEBHOOK_ACTIVATION_A019E53EE`
- `APPROVE_HERMES_GATEWAY_RESTART_A019E53EE`
- `APPROVE_OPENROUTER_FABLE5_PROVIDER_CALL_A019E53EE`

Until these gates are opened with target evidence, the Telegram lane may only
produce local previews, A2A2A dry-run packets, reports, receipts, and validation
evidence.

## OpenRouter Fable5 Route

Hermes Telegram is configured to expose Fable5 as a preview-only high-reasoning
route:

```text
provider=openrouter
model=anthropic/claude-fable-5
profile=fable5
defaultProviderCall=false
command=/fable5 preview
```

This route is for architecture, strategy, complex debugging, and founder-level
decisions. It must not be used for heartbeat polling, repeated status checks,
routine summaries, formatting, bulk documentation, or unbounded retry loops.
Provider execution requires the separate gate
`APPROVE_OPENROUTER_FABLE5_PROVIDER_CALL_A019E53EE`, OpenRouter key presence
evidence, budget confirmation, and model availability verification.

## A2A2A Status Preview

The local router accepts `/a2a2a status`, `cmd:a2a2a-status`,
`/a2a2a dispatch preview`, `cmd:a2a2a-dispatch-preview`,
`/a2a2a gate check <exact gate>`, `cmd:a2a2a-gate-check`,
`/a2a2a execute readiness`, `cmd:a2a2a-execute-readiness`,
`/a2a2a execute command preview <exact gate>`,
`cmd:a2a2a-execute-command-preview`, `/a2a2a completion audit`,
`cmd:a2a2a-completion-audit`, `/a2a2a live gate readiness`, and
`cmd:a2a2a-live-gate-readiness` as read-only commands. The status command
reads local evidence files for P002, P003, P004, and the Telegram config. The
dispatch preview command reads P004 planned writes and shows the exact gate
required before any local worker envelope files can be written. The gate-check
command compares the supplied text to the required dispatch gate without
echoing mismatched input and without enabling P004 execution. The
execute-readiness command reports the remaining preconditions for P004 execute
mode while keeping all writes closed. If a gate is supplied to
execute-readiness, the router evaluates it without echoing the supplied gate in
the top-level command field. The execute-command preview shows the local P004
executor command only after the exact gate matches; it does not run the command.
The completion audit command confirms that P004 dispatch and P014 local
acknowledgement receipts are complete while all live and external gates stay
closed. The live-gate readiness command confirms that the local-safe chain,
config gates, recipient-evidence requirement, and token-presence-only rule are
in place before any separate exact live action gate is requested.

This command must not:

- write worker inbox packets
- execute queue payloads
- start or restart workers
- send live Telegram messages unless the separate live-send gate is opened
- call providers
- read secret values
- push, deploy, install, or mutate cloud resources
