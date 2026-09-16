# GhostClaw YOLO v3.3 Staging Merge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the GhostClaw YOLO Safe Autonomous v3.3 integration pack into `sirinx-os` through a feature branch and staging-only policy gate without opening production, provider, cloud, wallet, messaging, or secret gates.

**Architecture:** Treat the v3.3 pack as an external artifact until it exists locally and passes policy tests. Import only scoped backend/dashboard/policy files into an isolated branch or clean worktree, then patch the five known backend gaps with TDD before staging review. Production deploy remains blocked.

**Tech Stack:** TypeScript/tRPC, Drizzle, Vitest or Node test runner, local shell checks, GhostClaw policy bundle tests.

---

## File Structure

Expected source artifact:

```text
/Users/sirinx/Downloads/ghostclaw_repo_merge_kit_v3_3.zip
```

Expected target paths after artifact inspection, subject to exact bundle layout:

```text
server/routers.ts
server/routers/agentic.ts
server/services/llmAnalysis.ts
server/services/notifications.ts
server/db.ts
drizzle/schema.ts
drizzle/migrations/<generated-v3-3-migration>.sql
tests/*.test.mjs
```

If the actual artifact uses different paths, stop and update this plan before
writing code. Do not guess path mappings.

## Task 0: Artifact Gate

**Files:**
- Read: `/Users/sirinx/Downloads/ghostclaw_repo_merge_kit_v3_3.zip`
- Create: `docs/knowledge/SIRINX_GHOSTCLAW_V3_3_ARTIFACT_MANIFEST_2026-06-29.md`

- [ ] **Step 1: Confirm the artifact exists**

Run:

```bash
test -f /Users/sirinx/Downloads/ghostclaw_repo_merge_kit_v3_3.zip
```

Expected: exit code `0`.

- [ ] **Step 2: Inventory zip metadata without extraction**

Run:

```bash
unzip -l /Users/sirinx/Downloads/ghostclaw_repo_merge_kit_v3_3.zip
```

Expected: output lists `routers.ts`, `agentic.ts`, `llmAnalysis.ts`, `schema.ts`, `db.ts`, tests, CI, staging manifest, and receipt files.

- [ ] **Step 3: Run bundled policy tests inside a temporary extraction directory**

Run:

```bash
rm -rf /tmp/ghostclaw_repo_merge_kit_v3_3
mkdir -p /tmp/ghostclaw_repo_merge_kit_v3_3
unzip -q /Users/sirinx/Downloads/ghostclaw_repo_merge_kit_v3_3.zip -d /tmp/ghostclaw_repo_merge_kit_v3_3
cd /tmp/ghostclaw_repo_merge_kit_v3_3/ghostclaw_repo_merge_kit_v3_3
node --test tests/*.test.mjs
```

Expected: `11` pass, `0` fail, matching the supplied review.

## Task 1: Worktree Or Branch Isolation

**Files:**
- Read: `git status --short --branch`
- No source files modified in this task

- [ ] **Step 1: Verify current checkout is not clean**

Run:

```bash
git status --short --branch
```

Expected in the current lane: active dirty work exists. Do not create a commit from this checkout.

- [ ] **Step 2: Create isolated feature worktree only after artifact gate passes**

Run:

```bash
git worktree add ../sirinx-os-ghostclaw-v3-3 feature/ghostclaw-agentic-os-dashboard-v3
```

Expected: a separate worktree exists at `/Users/sirinx/sirinx-os-ghostclaw-v3-3`.

## Task 2: `agentic.ts` Import Order

**Files:**
- Modify: `server/routers/agentic.ts`
- Test: `tests/agentic-import-order.test.mjs`

- [ ] **Step 1: Write the failing import-order test**

Create `tests/agentic-import-order.test.mjs`:

```js
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

test("agentic router keeps zod import in the top import block", () => {
  const source = readFileSync(new URL("../server/routers/agentic.ts", import.meta.url), "utf8");
  const zodIndex = source.indexOf('import { z } from "zod";');
  const firstNonImportAfterImports = source.search(/\n(?!import\s)[^\n]/);

  assert.notEqual(zodIndex, -1);
  assert.ok(zodIndex < firstNonImportAfterImports);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
node --test tests/agentic-import-order.test.mjs
```

Expected before fix: failure because the zod import is late in the file.

- [ ] **Step 3: Move `import { z } from "zod";` into the top import block**

Edit `server/routers/agentic.ts` so every import is at the top. Do not change router behavior in this task.

- [ ] **Step 4: Run the test and verify GREEN**

Run:

```bash
node --test tests/agentic-import-order.test.mjs
```

Expected: pass.

## Task 3: Wire LLM Analysis Procedures

**Files:**
- Modify: `server/routers/agentic.ts`
- Read: `server/services/llmAnalysis.ts`
- Test: `tests/agentic-llm-analysis-router.test.mjs`

- [ ] **Step 1: Write router export tests**

Create `tests/agentic-llm-analysis-router.test.mjs`:

```js
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const routerSource = readFileSync(new URL("../server/routers/agentic.ts", import.meta.url), "utf8");

test("agentic router imports llm analysis helpers", () => {
  assert.match(routerSource, /analyzeR0GateRisk/);
  assert.match(routerSource, /analyzeTaskExecution/);
  assert.match(routerSource, /analyzeAgentHealth/);
});

test("agentic router exposes analysis procedures", () => {
  assert.match(routerSource, /analyzeR0GateRisk\s*:/);
  assert.match(routerSource, /analyzeTaskExecution\s*:/);
  assert.match(routerSource, /analyzeAgentHealth\s*:/);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
node --test tests/agentic-llm-analysis-router.test.mjs
```

Expected before fix: failure because the router does not expose these procedures.

- [ ] **Step 3: Add three protected procedures**

Expose:

```text
analyzeR0GateRisk
analyzeTaskExecution
analyzeAgentHealth
```

Each procedure must call the matching `llmAnalysis.ts` function and return a dry-run analysis object. Do not call external providers unless the bundle already uses a local/mock implementation and the test proves it.

- [ ] **Step 4: Run the router tests**

Run:

```bash
node --test tests/agentic-llm-analysis-router.test.mjs
```

Expected: pass.

## Task 4: Notification Ownership Guard

**Files:**
- Modify: `server/services/notifications.ts`
- Modify: `server/routers/agentic.ts`
- Test: `tests/notification-ownership.test.mjs`

- [ ] **Step 1: Write ownership guard tests**

Create `tests/notification-ownership.test.mjs`:

```js
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const serviceSource = readFileSync(new URL("../server/services/notifications.ts", import.meta.url), "utf8");
const routerSource = readFileSync(new URL("../server/routers/agentic.ts", import.meta.url), "utf8");

test("notification service exposes guarded mark and delete operations", () => {
  assert.match(serviceSource, /markNotificationAsRead/);
  assert.match(serviceSource, /deleteNotification/);
  assert.match(serviceSource, /userId|ownerId/);
});

test("agentic router does not expose unguarded notification mutation names", () => {
  assert.match(routerSource, /markNotificationAsRead/);
  assert.match(routerSource, /deleteNotification/);
  assert.doesNotMatch(routerSource, /deleteMany\s*\(/);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
node --test tests/notification-ownership.test.mjs
```

Expected before fix: failure if service-layer guarded operations are absent.

- [ ] **Step 3: Implement guarded operations**

Implement mark-as-read and delete mutations so every mutation filters by both
notification ID and authenticated owner ID. Do not add WebSocket behavior in
this task.

- [ ] **Step 4: Run notification tests**

Run:

```bash
node --test tests/notification-ownership.test.mjs
```

Expected: pass.

## Task 5: Lazy DB Initialization Guard

**Files:**
- Modify: `server/db.ts`
- Test: `tests/db-lazy-init.test.mjs`

- [ ] **Step 1: Write static regression test**

Create `tests/db-lazy-init.test.mjs`:

```js
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

test("upsertUser obtains active database through getDb", () => {
  const source = readFileSync(new URL("../server/db.ts", import.meta.url), "utf8");
  const functionStart = source.indexOf("export async function upsertUser");
  const functionBody = source.slice(functionStart, source.indexOf("export async function", functionStart + 1));

  assert.match(functionBody, /const\s+activeDb\s*=\s*await\s+getDb\(\)/);
  assert.doesNotMatch(functionBody, /\b_db\./);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
node --test tests/db-lazy-init.test.mjs
```

Expected before fix: failure if `upsertUser()` does not use `activeDb`.

- [ ] **Step 3: Update `upsertUser()`**

Change `upsertUser()` to call:

```ts
const activeDb = await getDb();
```

Then use `activeDb` for insert/update operations. Keep the existing no-DB warning behavior.

- [ ] **Step 4: Run the DB test**

Run:

```bash
node --test tests/db-lazy-init.test.mjs
```

Expected: pass.

## Task 6: Drizzle Migration And Baseline Seed

**Files:**
- Create: `drizzle/migrations/0001_ghostclaw_agentic_os_v3_3.sql`
- Create or modify: `drizzle/seed/ghostclaw-agentic-baseline.ts`
- Test: `tests/migration-presence.test.mjs`

- [ ] **Step 1: Write migration presence test**

Create `tests/migration-presence.test.mjs`:

```js
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

test("v3.3 drizzle migration exists and creates agentic core tables", () => {
  const path = new URL("../drizzle/migrations/0001_ghostclaw_agentic_os_v3_3.sql", import.meta.url);
  assert.equal(existsSync(path), true);
  const sql = readFileSync(path, "utf8");
  assert.match(sql, /CREATE TABLE.*architecture/i);
  assert.match(sql, /CREATE TABLE.*r0/i);
  assert.match(sql, /CREATE TABLE.*agent/i);
  assert.match(sql, /CREATE TABLE.*notification/i);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
node --test tests/migration-presence.test.mjs
```

Expected before fix: failure because migration file is absent.

- [ ] **Step 3: Add migration generated from `drizzle/schema.ts`**

Create the SQL migration from the actual schema. Do not invent columns not present in `schema.ts`. The migration must stay local/staging and must not run against a live database in this lane.

- [ ] **Step 4: Run the migration test**

Run:

```bash
node --test tests/migration-presence.test.mjs
```

Expected: pass.

## Task 7: Final Local Verification

**Files:**
- Read: changed files
- Modify: `docs/knowledge/SIRINX_GHOSTCLAW_V3_3_MERGE_INTAKE_2026-06-29.md`

- [ ] **Step 1: Run policy bundle tests**

Run from extracted kit:

```bash
node --test tests/*.test.mjs
```

Expected: `11` pass, `0` fail.

- [ ] **Step 2: Run repo-targeted tests**

Run from feature worktree:

```bash
node --test tests/*.test.mjs
git diff --check
```

Expected: all tests pass and no whitespace errors.

- [ ] **Step 3: Keep deployment blocked**

Record in the intake doc:

```text
staging_deploy_only=false until human approval
production_deploy=false
push=false
cloud_mutation=false
provider_call=false
secret_read=false
```

## Self-Review

- Spec coverage: the five supplied pre-merge fixes are represented by Tasks 2-6; policy bundle and staging-only merge gates are represented by Tasks 0, 1, and 7.
- Placeholder scan: this plan uses explicit artifact, file, and command paths. If the actual v3.3 zip has different paths, the plan requires a stop-and-update rather than guessing.
- Type consistency: procedure names stay exactly `analyzeR0GateRisk`, `analyzeTaskExecution`, and `analyzeAgentHealth`; notification mutation names stay `markNotificationAsRead` and `deleteNotification`.

## Execution Choice

Plan saved. Execute only after the v3.3 artifact is present locally and the current dirty work is isolated. Recommended execution is Subagent-Driven for artifact inspection and test writing, then Inline Execution for the narrow code patches after review.
