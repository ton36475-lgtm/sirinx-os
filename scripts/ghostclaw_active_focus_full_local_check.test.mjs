import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createActiveFocusFullLocalCheck,
  fullLocalCheckCommands
} from "./ghostclaw_active_focus_full_local_check.mjs";

async function writeJson(root, relativePath, payload) {
  const path = join(root, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function createFixture(overrides = {}) {
  const root = await mkdtemp(join(tmpdir(), "active-focus-full-check-"));
  await writeJson(root, ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P067-ACTIVE-FOCUS-OPERATOR-PACKET-20260703.json", {
    status: "PASS_OPERATOR_PACKET_READY",
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
      ...(overrides.operatorGuardrails || {})
    }
  });
  await writeJson(root, ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P057-LOCAL-COMMIT-GATE-CHECK-20260703.json", {
    status: "PASS",
    candidate_pathspec_count: 42,
    git_status_line_count: 93,
    failures: []
  });
  await writeJson(root, ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P058-LOCAL-COMMIT-HELPER-DRY-RUN-20260703.json", {
    status: "PASS",
    executed: false,
    failures: []
  });
  await writeJson(root, "reports/mission/A2A2A_LOCAL_COMMIT_GATE_20260703.json", {
    candidate_pathspecs: [
      "scripts/ghostclaw_active_focus_full_local_check.mjs",
      "scripts/ghostclaw_active_focus_full_local_check.test.mjs",
      "reports/mission/A2A2A_ACTIVE_FOCUS_FULL_LOCAL_CHECK_20260703.md"
    ],
    required_evidence: [
      ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P068-ACTIVE-FOCUS-FULL-LOCAL-CHECK-20260703.json",
      ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P068-ACTIVE-FOCUS-FULL-LOCAL-CHECK-20260703.json"
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

describe("Active focus full local check", () => {
  it("passes when every local command and prerequisite packet passes", async () => {
    const root = await createFixture();
    const packet = await createActiveFocusFullLocalCheck({
      root,
      runCommand: passingRunner(),
      createdAt: "2026-07-03T00:00:00.000Z"
    });

    expect(packet.status).toBe("PASS_FULL_LOCAL_CHECK_READY");
    expect(packet.commands).toHaveLength(fullLocalCheckCommands.length);
    expect(packet.failures).toEqual([]);
    expect(packet.telegram_safe_draft).toContain("live_send=false");
    expect(packet.telegram_safe_draft).toContain("provider_call=false");
  });

  it("fails closed when a local command fails", async () => {
    const root = await createFixture();
    const packet = await createActiveFocusFullLocalCheck({
      root,
      runCommand: async (command) => ({
        id: command.id,
        command: command.display,
        status: command.id === "active_focus_readiness" ? "FAIL" : "PASS",
        exit_code: command.id === "active_focus_readiness" ? 1 : 0,
        duration_ms: 1,
        stdout_excerpt: "",
        stderr_excerpt: ""
      }),
      stopOnFailure: false
    });

    expect(packet.status).toBe("FAIL_FULL_LOCAL_CHECK");
    expect(packet.failures).toContain("command_failed_active_focus_readiness");
  });

  it("fails closed if the operator packet opens a provider-call guardrail", async () => {
    const root = await createFixture({ operatorGuardrails: { provider_call: true } });
    const packet = await createActiveFocusFullLocalCheck({
      root,
      runCommand: passingRunner()
    });

    expect(packet.status).toBe("FAIL_FULL_LOCAL_CHECK");
    expect(packet.failures).toContain("p067_operator_packet_pass");
  });
});
