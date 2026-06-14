# 04 - MCP Tasks Lifecycle Grid

Status: verified technical source required before implementation

```mermaid
stateDiagram-v2
  [*] --> working: CreateTaskResult
  working --> input_required: receiver needs input
  input_required --> working: tasks/input_response
  working --> completed: success
  working --> failed: execution error
  working --> cancelled: tasks/cancel
  input_required --> cancelled: tasks/cancel
  completed --> [*]
  failed --> [*]
  cancelled --> [*]
```

## Definition Of Done

- Long-running work returns a `task_id` instead of blocking the request.
- `tasks/get` can inspect state without mutating production.
- `tasks/cancel` must be idempotent and safe.

