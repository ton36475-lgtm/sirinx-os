# MaxPlus Hermes Chinese Model Safe Setup

Mission ID: `MAXPLUS-HERMES-CHINESE-MODEL-20260630`

## Status

Safe setup pack only. The pasted source included a live MaxPlus-style API key
and a remote installer pattern, so this lane intentionally does not copy the key,
does not write `~/.hermes/config.yaml`, does not write `~/.hermes/.env`, does
not run a provider request, and does not run a remote installer.

## Objective

Prepare Hermes Agent to use a MaxPlus OpenAI-compatible Chinese model pool with
`transport: openai_chat` and `api_mode: openai_chat`, while keeping all secret
handling outside the repo and behind an operator gate.

## Local Truth Observed

- `hermes` binary is present at `/Users/sirinx/.local/bin/hermes`.
- `uv` is present at `/opt/homebrew/bin/uv`.
- `~/.hermes` directory exists.
- Real Hermes config and env files were not read because they may contain
  secrets.

## Provider Shape

Use this shape for a private local Hermes config after owner review:

- provider name: `maxplus-codex`
- Hermes provider reference: `custom:maxplus-codex`
- base URL: `https://api.maxplus-ai.cc/deepseek/v1`
- transport: `openai_chat`
- API mode: `openai_chat`
- default model: `deepseek-v4-flash`
- alternate aliases: `deepseek-v4-pro`, `kimi-k2.6`, `minimax-m3`, `glm-5.2`,
  `glm-5.1`

## Templates

- Redacted config template:
  `docs/ghostclaw/templates/hermes-maxplus-config.yaml.template`
- Redacted private env template:
  `docs/ghostclaw/templates/hermes-maxplus-env.template`
- Safe launcher:
  `scripts/launchers/hermes-maxplus-openai-chat-safe`
- Private config applicator:
  `scripts/ghostclaw/apply_hermes_maxplus_private_config.py`

These templates are not live config files. They contain placeholders and env
references only.

## Safe Manual Install Review

Do not pipe a remote installer directly into a shell from Codex. If the owner
wants to reinstall or upgrade Hermes, use a review-first workflow:

1. Download the installer to a temporary review path.
2. Record file size and SHA-256.
3. Inspect the first lines and classify install actions.
4. Confirm it does not print, upload, or transform secrets.
5. Execute only after a separate explicit install gate.

## Blocked Actions

- Writing pasted API keys into repo files.
- Reading or printing `~/.hermes/.env`.
- Reading or printing `~/.hermes/config.yaml` if it may contain a literal key.
- Running remote installer scripts directly.
- Running `hermes doctor`, `hermes status`, or a chat prompt if it could spend
  provider credit before a provider-call gate.
- Starting Telegram, Discord, Signal, or gateway live sends.
- Enabling cron tasks that call paid providers.
- Push, deploy, migration, global install, or destructive actions.

## Manual Operator Steps After Gate

After the owner confirms the private credential path, they can copy the
templates into the private Hermes home directory and replace placeholders there.
Do not commit those private files.

```text
copy docs/ghostclaw/templates/hermes-maxplus-config.yaml.template to ~/.hermes/config.yaml
copy docs/ghostclaw/templates/hermes-maxplus-env.template to ~/.hermes/.env
chmod 600 ~/.hermes/config.yaml ~/.hermes/.env
```

The first safe runtime check should verify presence only, not values:

```text
check that MAXPLUS_CODEX_API_KEY is set without printing it
check that Hermes resolves provider custom:maxplus-codex without live chat
```

After the private env is set by the owner, the local launcher is:

```bash
scripts/launchers/hermes-maxplus-openai-chat-safe
```

The launcher checks presence only and then opens Hermes. It does not write
config files and does not run a smoke prompt by itself.

## Validation

Run:

```bash
python3 scripts/ghostclaw/validate_maxplus_hermes_safe_setup.py
```

The validator checks that required files exist, templates contain openai chat
transport markers, and no created repo artifact contains a live-looking API key
or private-key literal.


## Latest Preflight - 2026-06-30T13:10:00+07:00

- Hermes binary present: `True`
- uv binary present: `True`
- Hermes home present: `True`
- Private Hermes env file exists: `True`
- Current Codex shell key presence: `False`
- Runtime ready: `False`

The private env file was not read. Runtime remains closed until the owner sets
private env in the runtime shell and opens the provider-call gate.

## Private Config Applicator

Codex must not run the write mode automatically. The safe check is:

```bash
python3 scripts/ghostclaw/apply_hermes_maxplus_private_config.py --dry-run
```

Only the owner should run write mode from a private shell where
`MAXPLUS_CODEX_API_KEY` is already set:

```bash
APPROVE_WRITE_PRIVATE_HERMES_MAXPLUS_CONFIG=1 \
python3 scripts/ghostclaw/apply_hermes_maxplus_private_config.py --write
```

The write mode uses the environment value and writes private files under
`~/.hermes` with mode `0600`. It must not print the key.
