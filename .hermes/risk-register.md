# Hermes Risk Register

| Risk | Status | Mitigation |
|---|---|---|
| Agent writes code before spec | Blocked | Require context, spec, implementation plan, and exact approval phrase |
| Agent assumes stack incorrectly | Blocked | Environment Scanner must inspect repo files first |
| Agent adds unapproved feature | Blocked | Coder Agent must implement only from approved spec |
| Agent claims completion without tests | Blocked | QA and Reporter must include command evidence |
| Package install or provider call sneaks into planning | Blocked | API exposes dry-run/status only and capability flags stay false |
| Secrets leak into docs or dashboard | Blocked | Secret scan covers this contract and APIs return no secret values |
