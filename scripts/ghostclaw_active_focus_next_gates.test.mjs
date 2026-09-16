import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { createActiveFocusNextGates } from "./ghostclaw_active_focus_next_gates.mjs";

async function writeJson(root, relativePath, payload) {
  const path = join(root, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function createFixture(overrides = {}) {
  const root = await mkdtemp(join(tmpdir(), "active-focus-next-gates-"));
  await writeJson(root, ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P069-ACTIVE-FOCUS-REVIEW-READY-20260703.json", {
    status: "PASS_REVIEW_READY",
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
      ...(overrides.reviewGuardrails || {})
    }
  });
  await writeJson(root, ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P057-LOCAL-COMMIT-GATE-CHECK-20260703.json", {
    status: "PASS",
    candidate_pathspec_count: 48,
    git_status_line_count: 99,
    failures: []
  });
  await writeJson(root, ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P058-LOCAL-COMMIT-HELPER-DRY-RUN-20260703.json", {
    status: "PASS",
    executed: false,
    failures: [],
    commands: {
      stage: "git add -- package.json",
      cached_diff_check: "git diff --cached --check",
      commit: "git commit -m 'feat(ghostclaw): harden telegram and active focus local uat'"
    }
  });
  await writeJson(root, "reports/mission/A2A2A_LOCAL_COMMIT_GATE_20260703.json", {
    candidate_pathspecs: [
      "scripts/ghostclaw_active_focus_next_gates.mjs",
      "scripts/ghostclaw_active_focus_next_gates.test.mjs",
      "reports/mission/A2A2A_ACTIVE_FOCUS_NEXT_GATES_20260703.md"
    ],
    required_evidence: [
      ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P070-ACTIVE-FOCUS-NEXT-GATES-20260703.json",
      ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P070-ACTIVE-FOCUS-NEXT-GATES-20260703.json"
    ]
  });
  return root;
}

describe("Active focus next gates", () => {
  it("passes and exposes exact gate tokens without executing actions", async () => {
    const root = await createFixture();
    const packet = await createActiveFocusNextGates({
      root,
      createdAt: "2026-07-03T00:00:00.000Z"
    });

    expect(packet.status).toBe("PASS_NEXT_GATES_READY");
    expect(packet.failures).toEqual([]);
    expect(packet.gate_options.map((gate) => gate.id)).toContain("local_commit");
    expect(packet.gate_options.find((gate) => gate.id === "local_commit").approval_token).toBe(
      "APPROVE_LOCAL_COMMIT_A2A2A_ACTIVE_FOCUS_20260703"
    );
    expect(packet.guardrails.commit).toBe(false);
    expect(packet.guardrails.push).toBe(false);
  });

  it("fails closed if review-ready opens a provider-call guardrail", async () => {
    const root = await createFixture({ reviewGuardrails: { provider_call: true } });
    const packet = await createActiveFocusNextGates({ root });

    expect(packet.status).toBe("FAIL_NEXT_GATES_NOT_READY");
    expect(packet.failures).toContain("p069_review_ready_pass");
  });
});
