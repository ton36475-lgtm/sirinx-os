# ROUTE_WIRING_PLAN.md

## Dead Route Wiring Plan for `services/dev-control-api/server.mjs`

**Status:** Architecture — pending Codex implementation
**Date:** 2026-07-16
**Branch:** `migration/v5-rebase`

---

## Problem

Three route handler files exist in `services/dev-control-api/routes/` but are
**never imported** by `server.mjs`. They use Express `Router` middleware, which
is incompatible with the flat `http.createServer` + `handleRequest()` pattern
used by the rest of the API. They are completely dead code.

| File | Framework | Endpoints Defined |
|------|-----------|-------------------|
| `routes/agents.ts` | Express Router | `GET /agents`, `POST /agents/:id/runs`, `GET /task-queue`, `POST /task-queue` |
| `routes/a2a-sync.ts` | Express Router | `GET /status`, `POST /connect/:agent` |
| `routes/thaimart-workflow.mjs` | Plain function | `GET /api/thaimart/workflow/status`, `POST /api/thaimart/workflow/create`, `POST /api/thaimart/workflow/advance` |

## Current Architecture

`server.mjs` uses **Node.js `http.createServer`** with a single `handleRequest()`
function containing flat `if (method === "..." && url.pathname === "...")` blocks.
There is **no Express dependency**. Each route:

1. Reads the request (sometimes via `readJson(request)`)
2. Calls a function from `./src/*.mjs`
3. Calls `sendJson(request, response, status, body)` to respond

## Wiring Strategy

**Do NOT add Express.** Instead, port each dead route's handler logic into the
existing flat routing pattern. Below are the exact code blocks to add.

---

### 1. Agents Routes (from `routes/agents.ts`)

#### Required Import (add to import block at top of `server.mjs`)

```javascript
// Agent task management — ported from routes/agents.ts
import { createAgentTaskRun, listAgentTaskQueue, submitAgentTask } from "./src/agent-task-queue.mjs";
```

> **Note:** `./src/agent-task-queue.mjs` does not exist yet. Codex must either:
> - Create it as a new module with the dry-run stubs, OR
> - Port the logic inline into `handleRequest()`.

#### Route Blocks (add inside `handleRequest()`, before the 404 fallthrough)

```javascript
// ===== Agent Task Queue Routes =====

// GET /api/agents — list all agents
if (request.method === "GET" && url.pathname === "/api/agents") {
  sendJson(request, response, 200, listAgentTaskQueue());
  return;
}

// POST /api/agents/:id/runs — create agent run
if (request.method === "POST" && url.pathname.startsWith("/api/agents/") && url.pathname.endsWith("/runs")) {
  const agentId = url.pathname.split("/")[3]; // /api/agents/:id/runs → [3]
  try {
    const body = await readJson(request);
    const result = createAgentTaskRun(agentId, body);
    sendJson(request, response, 201, result);
  } catch (error) {
    sendJson(request, response, 400, {
      error: "agent_run_creation_failed",
      message: error.message
    });
  }
  return;
}

// GET /api/task-queue — get pending tasks
if (request.method === "GET" && url.pathname === "/api/task-queue") {
  sendJson(request, response, 200, listAgentTaskQueue());
  return;
}

// POST /api/task-queue — enqueue task
if (request.method === "POST" && url.pathname === "/api/task-queue") {
  try {
    const body = await readJson(request);
    const result = submitAgentTask(body);
    sendJson(request, response, 201, result);
  } catch (error) {
    sendJson(request, response, 400, {
      error: "task_queue_submit_failed",
      message: error.message
    });
  }
  return;
}
```

---

### 2. A2A Sync Routes (from `routes/a2a-sync.ts`)

#### Required Import

```javascript
// A2A MCP sync — ported from routes/a2a-sync.ts
import { getA2ASyncStatus, requestA2AConnect } from "./src/a2a-sync-status.mjs";
```

> **Note:** `./src/a2a-sync-status.mjs` does not exist yet. Port the logic from
> the Express handler into a new module or inline.

#### Route Blocks

```javascript
// ===== A2A Sync Routes =====

// GET /api/a2a-sync/status — MCP workspace status
if (request.method === "GET" && url.pathname === "/api/a2a-sync/status") {
  sendJson(request, response, 200, getA2ASyncStatus());
  return;
}

// POST /api/a2a-sync/connect/:agent — request MCP sync (dry-run)
if (request.method === "POST" && url.pathname.startsWith("/api/a2a-sync/connect/")) {
  const agent = url.pathname.split("/")[4]; // /api/a2a-sync/connect/:agent → [4]
  sendJson(request, response, 200, requestA2AConnect(agent));
  return;
}
```

---

### 3. ThaiMart Workflow Routes (from `routes/thaimart-workflow.mjs`)

This one is **already close to the right pattern** — it exports a plain async
function `handleThaimartWorkflowRoutes(request, response)`. It just needs to be
called from `handleRequest()`.

#### Required Import (add to import block)

```javascript
// ThaiMart workflow routes — wired from routes/thaimart-workflow.mjs
import { handleThaimartWorkflowRoutes } from "./routes/thaimart-workflow.mjs";
```

#### Route Block (add inside `handleRequest()`, before the 404 fallthrough)

```javascript
// ===== ThaiMart Workflow Routes =====

// Delegate all /api/thaimart/workflow/* routes to the handler function
if (url.pathname.startsWith("/api/thaimart/workflow/")) {
  const result = await handleThaimartWorkflowRoutes(request, response);
  if (result) {
    sendJson(request, response, 200, result);
    return;
  }
  // If handler returned null, fall through to 404
}
```

#### Fix Required in `routes/thaimart-workflow.mjs`

The handler currently uses its own inline `readRequestBody(request)` function.
This is fine but should be replaced with the shared `readJson(request)` from
`server.mjs` for consistency. Codex should either:

- Export `readJson` from `server.mjs` and import it in the route, OR
- Keep the inline reader (acceptable — it's functionally identical).

---

## Implementation Order

1. **ThaiMart workflow** — lowest effort (just import + delegate). Do this first.
2. **A2A sync** — requires creating `./src/a2a-sync-status.mjs` with dry-run stubs.
3. **Agent task queue** — requires creating `./src/agent-task-queue.mjs` with dry-run stubs.

## Cleanup After Wiring

Once all three route files are wired into `server.mjs`:

- **DELETE** `routes/agents.ts` and `routes/a2a-sync.ts` — their logic lives in
  `server.mjs` + new `./src/*.mjs` modules. The Express `Router` import is an
  unnecessary dependency.
- **KEEP** `routes/thaimart-workflow.mjs` — its function-export pattern is
  compatible and can stay as-is. Optionally rename to
  `src/thaimart-workflow-routes.mjs` for consistency with other `./src/` modules.

## Dependency Notes

- **No Express needed.** The server is a plain `http.createServer`. Do not add
  `express` to `package.json`.
- **uuid dependency:** `routes/agents.ts` imports `uuid`. If the new
  `./src/agent-task-queue.mjs` needs ID generation, use `crypto.randomUUID()`
  (built into Node.js 18+) instead of adding the `uuid` package.
- All handlers must follow the existing safety pattern: `dryRunOnly: true`,
  `externalWrites: false`, `productionWrites: false` in error responses.

---

## Route Placement in server.mjs

Add all new route blocks **after** the existing GhostClaw/hermes routes and
**before** the final 404 handler. The 404 handler is the last block in
`handleRequest()` that matches all remaining paths.

```
  // ... existing routes ...

  // ===== Agent Task Queue Routes =====
  // ... (code above) ...

  // ===== A2A Sync Routes =====
  // ... (code above) ...

  // ===== ThaiMart Workflow Routes =====
  // ... (code above) ...

  // 404 fallthrough (existing)
  sendJson(request, response, 404, { error: "not_found", path: url.pathname });
```
