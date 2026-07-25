# MaxPlus Hermes Provider Call Gate

Mission ID: `MAXPLUS-HERMES-CHINESE-MODEL-20260630`

## Purpose

This gate defines the exact boundary between local-safe setup and any Hermes
runtime action that could spend MaxPlus credit.

## Current State

Local-safe setup is allowed and implemented:

- redacted config template
- redacted env template
- secret-handling policy
- safe launcher with `--dry-run`
- preflight script that does not read private env content
- blocked action receipt

Runtime provider smoke is still closed.

Private home-config write is a separate gate:

```text
APPROVE_WRITE_PRIVATE_HERMES_MAXPLUS_CONFIG=1
```

## Gate Phrase

The next provider-call gate must be explicit and narrow:

```text
APPROVE_MAXPLUS_HERMES_PROVIDER_SMOKE_ONE_TURN
```

## Allowed If Gate Is Opened

- Verify `MAXPLUS_CODEX_API_KEY` is present without printing it.
- Start Hermes with `scripts/launchers/hermes-maxplus-openai-chat-safe`.
- Send one minimal non-private smoke prompt.
- Record provider/model, timestamp, pass/fail, and token/cost metadata if
  available.

## Still Blocked

- Printing keys or reading `~/.hermes/.env` content.
- Sending repo secrets or private customer data to the provider.
- Running cron jobs that repeatedly call the provider.
- Starting Telegram/Discord/Signal gateway live sends.
- Deploy, push, migrations, global installs, or model downloads.
