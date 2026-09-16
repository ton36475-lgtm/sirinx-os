# MaxPlus Hermes Secret Handling Policy

## Principle

The repo may store setup docs, redacted templates, validation scripts, blocked
receipts, and evidence. The repo must not store live MaxPlus keys, Hermes token
values, messaging bot tokens, provider cookies, browser session data, or private
keys.

## Allowed

- Placeholder variable names such as `MAXPLUS_CODEX_API_KEY`.
- Non-secret provider URLs.
- Model names and routing aliases.
- Presence-only checks, for example "is an env var set".
- Local validation reports that state pass/fail without secret values.

## Blocked

- Literal `ccsk-` or `sk-` style API keys in repo files.
- Reading or printing private Hermes env files.
- Committing `~/.hermes/.env` or copied env content.
- Sending a test chat or provider call automatically.
- Remote installer execution without review and a separate gate.

## Review Checklist

Before any real Hermes MaxPlus runtime is started:

1. Confirm the key is stored only in the private operator environment.
2. Confirm templates in the repo still contain placeholders only.
3. Confirm gateway live sends are disabled.
4. Confirm cron jobs do not trigger provider calls.
5. Confirm receipts describe presence and validation, not secret values.

