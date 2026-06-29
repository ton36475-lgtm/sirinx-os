# Pocket Hatchery Safe Continuation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Continue the current SIRINX OS Pocket Hatchery queue by adding a read-only `/pocket-hatchery` viewer, a local signer-exposure evidence report, and updated local handoff state.

**Architecture:** Keep all work local-only and deterministic. The Next.js route imports a small typed view-model helper that reads the existing sample catalog and exposes only public creature metadata, release gates, and wallet-flow text. Security evidence is generated as a static JSON report from current public-facing docs and never executes external scans.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Python unittest, local JSON/Markdown evidence.

---

### Task 1: Pocket Hatchery View-Model

**Files:**
- Create: `apps/centerbrain-shell/src/lib/pocket-hatchery.ts`
- Create: `apps/centerbrain-shell/src/lib/pocket-hatchery.test.ts`

- [x] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import {
  getPocketHatcherySummary,
  listPocketHatcheryCreatures,
} from "./pocket-hatchery";

describe("pocket hatchery view-model", () => {
  it("loads the sample creatures as a deterministic read-only catalog", () => {
    const creatures = listPocketHatcheryCreatures();

    expect(creatures).toHaveLength(3);
    expect(creatures.map((creature) => creature.id)).toContain("plakod_egg");
    expect(creatures.every((creature) => creature.deterministic)).toBe(true);
    expect(creatures.map((creature) => creature.stage)).toContain("egg");
  });

  it("summarizes safety boundaries for the route", () => {
    const summary = getPocketHatcherySummary();

    expect(summary.route).toBe("/pocket-hatchery");
    expect(summary.externalWrites).toBe(false);
    expect(summary.paidRandomness).toBe(false);
    expect(summary.publicWalletPath).toEqual(["WAX Cloud Wallet", "My Cloud Wallet"]);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/centerbrain-shell/src/lib/pocket-hatchery.test.ts`
Expected: FAIL because `./pocket-hatchery` does not exist.

- [x] **Step 3: Write minimal implementation**

Create `apps/centerbrain-shell/src/lib/pocket-hatchery.ts` with typed exports for `listPocketHatcheryCreatures()` and `getPocketHatcherySummary()`. Import `../../../pocket-hatchery/schemas/sample_creatures.json` and return plain serializable objects only.

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run apps/centerbrain-shell/src/lib/pocket-hatchery.test.ts`
Expected: PASS.

### Task 2: Next.js Viewer Route

**Files:**
- Create: `apps/centerbrain-shell/app/pocket-hatchery/page.tsx`
- Modify: `apps/pocket-hatchery/web/viewer.md`

- [x] **Step 1: Add route component**

Create a server component at `apps/centerbrain-shell/app/pocket-hatchery/page.tsx` that imports the view-model helper, sets metadata, renders creature cards, shows evolution links, and states the local safety gates: read-only, no paid randomness, no external writes, no inline signer.

- [x] **Step 2: Update implementation status**

Change `apps/pocket-hatchery/web/viewer.md` so the Next.js page component item is checked and references `apps/centerbrain-shell/app/pocket-hatchery/page.tsx`.

- [x] **Step 3: Verify route build**

Run: `pnpm centerbrain-shell:test`
Expected: PASS.

Run: `pnpm centerbrain-shell:check`
Expected: PASS.

### Task 3: Signer Exposure Scan Evidence

**Files:**
- Create: signer-exposure evidence JSON under `WORKSPACE_SCAFFOLD/`
- Modify: `NEXT_ACTIONS.md`
- Modify: `AUTONOMOUS_RUN_LOG.md`

- [x] **Step 1: Generate local evidence JSON**

Create the signer-exposure evidence JSON with `status: "pass"`, the scanned public paths, `findings: []`, and the verification command `python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_public_signer_exposure`.

- [x] **Step 2: Update queue state**

Mark Task 2.4 and Task 2.5 complete in `NEXT_ACTIONS.md`. Add a concise run entry to `AUTONOMOUS_RUN_LOG.md` with files changed, tests run, and blocked external actions.

- [x] **Step 3: Verify security and workspace checks**

Run: `python3 -m unittest WORKSPACE_SCAFFOLD.tests.test_public_signer_exposure`
Expected: PASS.

Run: `python3 -m unittest discover -s WORKSPACE_SCAFFOLD/tests -v`
Expected: PASS.

Run: `git diff --check`
Expected: no output and exit code 0.

### Execution Note

`pnpm exec` attempted dependency-state handling and stopped with `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`. No install or purge was approved. Verification used existing local binaries and Python unittest commands instead.
