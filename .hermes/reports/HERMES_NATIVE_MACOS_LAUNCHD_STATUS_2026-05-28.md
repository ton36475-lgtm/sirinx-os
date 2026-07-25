# Hermes Native macOS Launchd Status - 2026-05-28

Result: VERIFIED RUNNING

## Key Findings

- Hermes native install exists at `/Users/sirinx/.hermes/hermes-agent`.
- Python venv exists at `/Users/sirinx/.hermes/hermes-agent/venv`.
- LaunchAgent exists at `/Users/sirinx/Library/LaunchAgents/ai.hermes.gateway.plist`.
- `plutil -lint` passes.
- `launchctl print gui/501/ai.hermes.gateway` shows state `running`, PID `90360`.
- Gateway state says Telegram, WhatsApp, and API server are connected; Home Assistant is paused/failed reconnect.
- Relevant listeners are bound to `127.0.0.1`, not public interfaces.
- Dashboard answers on `127.0.0.1:9119`; `HEAD` returns `405 Method Not Allowed` with `allow: GET`, which confirms an HTTP server is present.

## Runtime Issues Observed

- OpenRouter free model rate limit: `qwen/qwen3-coder:free` HTTP `429`.
- Docker backend attempts fail because Docker daemon is not responding.
- Cron job `youtube-skill-learner` references missing `web` skill.
- Telegram MarkdownV2 parser warnings fall back to plain text.

## Decision

No native install action is required. Do not reinstall or reload launchd right now. The next work should be config/runtime hygiene:

1. model policy for cron/gateway,
2. no-Docker local terminal backend setting,
3. stale cron skill cleanup,
4. log rotation.

## Safety

No secrets printed. No `.env` values printed. No service restart or mutation performed.
