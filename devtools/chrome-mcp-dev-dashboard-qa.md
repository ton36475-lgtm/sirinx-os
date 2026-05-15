# Chrome MCP QA: Developer Command Dashboard

Target:

```text
http://localhost:8710
```

API:

```text
http://localhost:8711
```

## Checks

- [ ] Dashboard loads without console errors.
- [ ] Layout is readable at desktop width.
- [ ] Layout is readable at mobile width.
- [ ] API status changes from pending to online when the API is running.
- [ ] Fallback mode appears when the API is stopped.
- [ ] Release gates render with pass, warn, and block states.
- [ ] Dry-run buttons append audit events.
- [ ] No action performs external writes.
- [ ] No real secret appears in DOM text, network responses, or local files.
- [ ] No public production endpoint is referenced.

## Evidence To Capture

- Desktop screenshot.
- Mobile screenshot.
- Network calls for `/health`, `/api/gates`, `/api/actions`, and `/api/dry-run`.
- Console output showing no uncaught exceptions.
