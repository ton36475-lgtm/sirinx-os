# GC Priority Queue Architecture

## Overview

The GC Priority Queue provides a unified priority-based task queuing system for
the GhostClaw fleet orchestration layer. It has been unified from a dual
(bash-file + Go-memory) implementation into a single Go-backed REST API with a
backward-compatible bash shim.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLI / Scripts                         │
│                                                          │
│  scripts/gc-priority-queue.sh  (bash shim, curl-based)  │
│                                                          │
│  All queue operations delegated via HTTP                 │
└──────────────────────┬──────────────────────────────────┘
                       │  :8721
                       ▼
┌─────────────────────────────────────────────────────────┐
│               go/gc-orch  (Go binary)                    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  QueueStore (in-memory, mutex-protected)         │   │
│  │  - P0 (Blocker):    critical path blockers       │   │
│  │  - P1 (Feature):    feature work                 │   │
│  │  - P2 (Improvement): improvements / tech debt    │   │
│  │  - P3 (Background):  nice-to-have / idle work    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  REST API (Go 1.22+ ServeMux)                           │
│  - GET    /queue          list all items                │
│  - POST   /queue          create a new item             │
│  - GET    /queue/next     get highest-priority pending  │
│  - PATCH  /queue/{id}     update item status            │
│  - DELETE /queue/{id}     remove an item                │
│  - GET    /status         bridge + queue stats          │
│  - GET    /agents         agent state snapshot          │
└─────────────────────────────────────────────────────────┘
```

## Priorities

| Level | Label        | Meaning                         |
|-------|--------------|---------------------------------|
| P0    | Blocker      | Critical path, must act now     |
| P1    | Feature      | Planned feature work            |
| P2    | Improvement  | Improvements, tech debt         |
| P3    | Background   | Nice-to-have, idle-time work    |

## Item States

- `pending` — waiting to be picked up
- `in_progress` — being worked on
- `done` — completed

## Unification History

### Phase 1 (bash-only)
`gc-priority-queue.sh` managed JSON files in `.ghostclaw_runtime/queue/`.
Fine for small scale but slow (`grep`/`find` over files), no concurrency
control, and fragile under parallel access.

### Phase 2 (Go rewrite)
`go/gc-orch/main.go` introduced `QueueStore` — an in-memory, mutex-protected
priority queue with the same P0–P3 scheme. The Go service runs on port 8721.

### Phase 3 (Unification — current)
`gc-priority-queue.sh` was rewritten as a thin bash shim that delegates
every operation to the Go REST API via `curl`. The file-based queue is
deprecated. All new queue operations go through the Go backend.

## Usage

```bash
# Via bash shim (backward-compatible)
bash scripts/gc-priority-queue.sh status
bash scripts/gc-priority-queue.sh list
bash scripts/gc-priority-queue.sh add "Fix login bug" P0 "dev"
bash scripts/gc-priority-queue.sh process

# Via curl (direct API)
curl -s http://localhost:8721/queue
curl -s -X POST http://localhost:8721/queue \
  -H 'Content-Type: application/json' \
  -d '{"title":"Fix login bug","priority":"P0","owner":"dev"}'
curl -s http://localhost:8721/queue/next
curl -s -X PATCH http://localhost:8721/queue/TASK-20260724-001 \
  -H 'Content-Type: application/json' \
  -d '{"status":"in_progress"}'
curl -s -X DELETE http://localhost:8721/queue/TASK-20260724-001

# Via env vars (custom host/port)
GC_ORCH_HOST=10.0.0.5 GC_ORCH_PORT=8721 bash scripts/gc-priority-queue.sh status
```

## Related Files

| Path | Role |
|------|------|
| `go/gc-orch/main.go` | Go service: QueueStore + REST handlers |
| `go/gc-orch/gc-orch` | Pre-built binary |
| `scripts/gc-priority-queue.sh` | Bash shim → curl → Go REST API |
| `go/gc-orch/go.mod` | Go module definition |
