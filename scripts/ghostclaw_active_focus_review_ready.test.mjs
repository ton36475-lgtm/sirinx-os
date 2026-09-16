import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createActiveFocusReviewReady,
  reviewReadyCommands
} from "./ghostclaw_active_focus_review_ready.mjs";

async function writeJson(root, relativePath, payload) {
  const path = join(root, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function createFixture(overrides = {}) {
  const root = await mkdtemp(join(tmpdir(), "active-focus-review-ready-"));
  await writeJson(root, ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P068-ACTIVE-FOCUS-FULL-LOCAL-CHECK-20260703.json", {
    status: "PASS_FULL_LOCAL_CHECK_READY",
    checks: [{ passed: true }],
    guardrails: {
      live_send: false,
      provider_call: false,
      external_message_send: false,
      commit: false,
      push: false,
      deploy: false,
      cloudflare_r2_mutation: false,
      secret_read: false,
      install: false,
      ...(overrides.fullLocalGuardrails || {})
    }
  });
  await writeJson(root, ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P057-LOCAL-COMMIT-GATE-CHECK-20260703.json", {
    status: "PASS",
    candidate_pathspec_count: 45,
    git_status_line_count: 96,
    failures: []
  });
  await writeJson(root, ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P058-LOCAL-COMMIT-HELPER-DRY-RUN-20260703.json", {
    status: "PASS",
    executed: false,
    failures: []
  });
  await writeJson(root, "reports/mission/A2A2A_LOCAL_COMMIT_GATE_20260703.json", {
    candidate_pathspecs: [
      "scripts/ghostclaw_active_focus_review_ready.mjs",
      "scripts/ghostclaw_active_focus_review_ready.test.mjs",
      "reports/mission/A2A2A_ACTIVE_FOCUS_REVIEW_READY_20260703.md"
    ],
    required_evidence: [
      ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P068-ACTIVE-FOCUS-FULL-LOCAL-CHECK-20260703.json",
      ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P069-ACTIVE-FOCUS-REVIEW-READY-20260703.json",
      ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P069-ACTIVE-FOCUS-REVIEW-READY-20260703.json",
      "reports/mission/A2A2A_ACTIVE_FOCUS_SCOPE_20260703.md"
    ]
  });
  return root;
}

function passingRunner() {
  return async (command) => ({
    id: command.id,
    command: command.display,
    status: "PASS",
    exit_code: 0,
    duration_ms: 1,
    stdout_excerpt: "ok",
    stderr_excerpt: ""
  });
}

describe("Active focus review-ready packet", () => {
  it("passes when review commands and prerequisite packets pass", async () => {
    const root = await createFixture();
    const packet = await createActiveFocusReviewReady({
      root,
      runCommand: passingRunner(),
      createdAt: "2026-07-03T00:00:00.000Z"
    });

    expect(packet.status).toBe("PASS_REVIEW_READY");
    expect(packet.commands).toHaveLength(reviewReadyCommands.length);
    expect(packet.failures).toEqual([]);
    expect(packet.telegram_safe_draft).toContain("live_send=false");
    expect(packet.telegram_safe_draft).toContain("provider_call=false");
  });

  it("fails closed when focused tests fail", async () => {
    const root = await createFixture();
    const packet = await createActiveFocusReviewReady({
      root,
      runCommand: async (command) => ({
        id: command.id,
        command: command.display,
        status: command.id === "focused_vitest" ? "FAIL" : "PASS",
        exit_code: command.id === "focused_vitest" ? 1 : 0,
        duration_ms: 1,
        stdout_excerpt: "",
        stderr_excerpt: ""
      }),
      stopOnFailure: false
    });

    expect(packet.status).toBe("FAIL_REVIEW_READY");
    expect(packet.failures).toContain("command_failed_focused_vitest");
  });

  it("fails closed if full-local-check opens a provider-call guardrail", async () => {
    const root = await createFixture({ fullLocalGuardrails: { provider_call: true } });
    const packet = await createActiveFocusReviewReady({
      root,
      runCommand: passingRunner()
    });

    expect(packet.status).toBe("FAIL_REVIEW_READY");
    expect(packet.failures).toContain("p068_full_local_check_pass");
  });
});
