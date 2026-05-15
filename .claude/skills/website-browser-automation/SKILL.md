---
name: website-browser-automation
description: Run and maintain local website browser automation for the Hermes Developer Command Center. Use for Playwright, screenshots, mobile checks, console errors, and dashboard QA.
allowed-tools: Bash Read Grep Glob
---

# Website Browser Automation

Target:

```text
http://127.0.0.1:8710
```

API:

```text
http://127.0.0.1:8711/health
```

Checklist:

1. Run `pnpm dashboard:status`.
2. Start the stack with `pnpm dashboard:run` if needed.
3. Run `pnpm dashboard:e2e`.
4. Check desktop and mobile layout.
5. Check API online and fallback behavior.
6. Check dry-run buttons append audit events.
7. Check no console errors and no external writes.

Do not test production endpoints, real customer messages, paid APIs, or external writes without explicit approval.
