---
name: start-run-debug
description: Start, stop, verify, and debug the local SIRINX OS Hermes dashboard stack. Use for run settings, ports, tmux sessions, logs, and startup errors.
allowed-tools: Bash Read Grep Glob
---

# Start Run Debug

Commands:

```bash
pnpm dashboard:run
pnpm dashboard:status
pnpm dashboard:e2e
pnpm dashboard:stop
```

Global shortcut:

```bash
hermes-dashboard start
hermes-dashboard status
hermes-dashboard stop
```

Runtime:

- API tmux session: `sirinx-dev-control-api`
- Dashboard tmux session: `sirinx-dev-dashboard`
- Logs: `ops/logs/dev-control-api.log`, `ops/logs/dev-dashboard.log`
- Pids: `ops/pids/dev-control-api.pid`, `ops/pids/dev-dashboard.pid`

Debug order:

1. `pnpm verify`
2. `pnpm dashboard:status`
3. Inspect logs in `ops/logs/`
4. Check ports `8710` and `8711`
5. Restart with `pnpm dashboard:stop && pnpm dashboard:run`
6. Run `pnpm dashboard:e2e`
