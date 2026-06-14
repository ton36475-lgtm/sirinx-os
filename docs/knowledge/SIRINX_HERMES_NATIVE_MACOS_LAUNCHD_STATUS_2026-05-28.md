# SIRINX Hermes Native macOS Launchd Status - 2026-05-28

Status: VERIFIED RUNNING, NO INSTALL NEEDED

Mode: read-only audit, no restart, no secret read, no gateway mutation

## Summary

Hermes is already installed natively on this Mac mini under `/Users/sirinx/.hermes/hermes-agent` and is already managed by a macOS LaunchAgent at:

```text
/Users/sirinx/Library/LaunchAgents/ai.hermes.gateway.plist
```

The LaunchAgent is loaded and running as `ai.hermes.gateway` with PID `90360`.

## Current Native Layout

| Item | Current path/status |
| --- | --- |
| Hermes home | `/Users/sirinx/.hermes` |
| Hermes code | `/Users/sirinx/.hermes/hermes-agent` |
| Python venv | `/Users/sirinx/.hermes/hermes-agent/venv` |
| Gateway service plist | `/Users/sirinx/Library/LaunchAgents/ai.hermes.gateway.plist` |
| Gateway stdout log | `/Users/sirinx/.hermes/logs/gateway.log` |
| Gateway stderr log | `/Users/sirinx/.hermes/logs/gateway.error.log` |
| Gateway process | running via launchd |
| Gateway state file | `/Users/sirinx/.hermes/gateway_state.json` |

## Version

```text
Hermes Agent v0.14.0 (2026.5.16)
Project: /Users/sirinx/.hermes/hermes-agent
Python: 3.11.15
OpenAI SDK: 2.24.0
```

Hermes reported an update is available, but no update was run.

## LaunchAgent Validation

`plutil -lint` result:

```text
/Users/sirinx/Library/LaunchAgents/ai.hermes.gateway.plist: OK
```

LaunchAgent program:

```text
/Users/sirinx/.hermes/hermes-agent/venv/bin/python -m hermes_cli.main gateway run --replace
```

Working directory:

```text
/Users/sirinx/.hermes/hermes-agent
```

Environment:

```text
HERMES_HOME=/Users/sirinx/.hermes
VIRTUAL_ENV=/Users/sirinx/.hermes/hermes-agent/venv
PATH includes Hermes venv, Hermes node_modules/.bin, Homebrew, local bin, and Node paths
```

## Local Bind Check

Observed listening services are bound to loopback addresses:

| Port | Process | Bind |
| --- | --- | --- |
| `3000` | WhatsApp bridge node process | `127.0.0.1:3000` |
| `8642` | Hermes gateway Python process | `127.0.0.1:8642` |
| `9119` | Hermes dashboard Python process | `127.0.0.1:9119` |
| `8710` | SIRINX dev dashboard | `127.0.0.1:8710` |
| `8711` | SIRINX dev control API | `127.0.0.1:8711` |
| `8720` / `8730` | local node services | `127.0.0.1` |

No Hermes-related listener observed on `0.0.0.0` in this audit.

## Gateway Platform State

Sanitized gateway state:

| Platform | State |
| --- | --- |
| Telegram | connected |
| WhatsApp | connected |
| API server | connected |
| Home Assistant | paused / failed to reconnect |

## Current Runtime Warnings

The native install itself is functioning, but logs show runtime issues unrelated to launchd installation:

1. OpenRouter `qwen/qwen3-coder:free` is rate-limited upstream with HTTP `429`.
2. Docker backend/tool execution attempts fail because Docker daemon is not responding.
3. Cron job `youtube-skill-learner` reports `Skill 'web' not found`.
4. Telegram MarkdownV2 parse warnings appear, with fallback to plain text.

These are model/tool/config issues, not native macOS install blockers.

## Current Clean Plist Shape

The existing plist already matches the recommended native shape:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>ai.hermes.gateway</string>
  <key>ProgramArguments</key>
  <array>
    <string>/Users/sirinx/.hermes/hermes-agent/venv/bin/python</string>
    <string>-m</string>
    <string>hermes_cli.main</string>
    <string>gateway</string>
    <string>run</string>
    <string>--replace</string>
  </array>
  <key>WorkingDirectory</key>
  <string>/Users/sirinx/.hermes/hermes-agent</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>HERMES_HOME</key>
    <string>/Users/sirinx/.hermes</string>
    <key>VIRTUAL_ENV</key>
    <string>/Users/sirinx/.hermes/hermes-agent/venv</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key>
    <false/>
  </dict>
  <key>StandardOutPath</key>
  <string>/Users/sirinx/.hermes/logs/gateway.log</string>
  <key>StandardErrorPath</key>
  <string>/Users/sirinx/.hermes/logs/gateway.error.log</string>
</dict>
</plist>
```

The live plist also includes an expanded `PATH`, which is useful for Homebrew and Node-based integrations.

## Commands Used

```bash
ls -la /Users/sirinx/.hermes
find /Users/sirinx/.hermes -maxdepth 3 ...
find /Users/sirinx/Library/LaunchAgents -maxdepth 1 -name '*hermes*plist'
pgrep -alf 'hermes|gateway|whatsapp-bridge|bridge.js'
plutil -p /Users/sirinx/Library/LaunchAgents/ai.hermes.gateway.plist
launchctl print gui/$(id -u)/ai.hermes.gateway
lsof -nP -iTCP -sTCP:LISTEN
/Users/sirinx/.hermes/hermes-agent/venv/bin/python --version
/Users/sirinx/.hermes/hermes-agent/venv/bin/python -m hermes_cli.main --version
/Users/sirinx/.local/bin/hermes --version
curl -fsSI http://127.0.0.1:9119
```

## Actions Not Taken

- No secrets were read or printed.
- No `.env` values were printed.
- No `launchctl unload`, `load`, `bootstrap`, `bootout`, `kickstart`, `start`, or `stop` was run.
- No Hermes gateway restart was run.
- No `hermes update` was run.
- No Docker was started.
- No n8n/Hermes/WhatsApp service was killed or restarted.

## Recommended Next Fixes

1. Keep the current launchd service. It is already installed and running.
2. Fix model policy for cron/gateway to avoid repeated OpenRouter free-tier `429` loops.
3. Disable Docker backend or switch Hermes terminal environment to local/native if the intended runtime is no Docker.
4. Fix or disable the stale `youtube-skill-learner` cron job that references missing `web` skill.
5. Keep WhatsApp bridge on port `3000`; keep Hermes Office on a separate port such as `3100` if needed.
6. Add log rotation for `/Users/sirinx/.hermes/logs/*.log` if not already handled.

## 2026-05-28 13:51 +0700 Hygiene Update

Applied two reversible local config hygiene fixes after operator approval:

- Changed `/Users/sirinx/.hermes/config.yaml` `terminal.backend` from `docker` to `local`.
- Removed missing `web` skill from `/Users/sirinx/.hermes/cron/jobs.json` for `youtube-skill-learner`.

Backups:

- `/Users/sirinx/.hermes/config.yaml.bak.codex-native-terminal-20260528-135036`
- `/Users/sirinx/.hermes/cron/jobs.json.bak.codex-remove-missing-web-20260528-135101`

Validation:

```text
config-yaml-ok
terminal.backend=local
cron-json-ok
youtube.skills=youtube-content,skill-creator
```

No gateway restart was performed.

## Safe Restart Commands If Needed Later

Do not run these while active Telegram/WhatsApp sessions are processing messages unless explicitly approved:

```bash
launchctl print gui/$(id -u)/ai.hermes.gateway
launchctl kickstart -k gui/$(id -u)/ai.hermes.gateway
tail -f /Users/sirinx/.hermes/logs/gateway.log
```

For service reload after editing the plist:

```bash
launchctl bootout gui/$(id -u) /Users/sirinx/Library/LaunchAgents/ai.hermes.gateway.plist
launchctl bootstrap gui/$(id -u) /Users/sirinx/Library/LaunchAgents/ai.hermes.gateway.plist
launchctl kickstart -k gui/$(id -u)/ai.hermes.gateway
```

These commands are not needed for the current state.
