import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { createActiveFocusOperatorStatus } from "./ghostclaw_active_focus_operator_status.mjs";

async function writeJson(root, relativePath, payload) {
  const path = join(root, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

const closedGuardrails = {
  live_send: false,
  provider_call: false,
  external_message_send: false,
  commit: false,
  push: false,
  deploy: false,
  cloudflare_r2_mutation: false,
  secret_read: false,
  install: false
};

const busGuardrails = {
  telegram_live_send: false,
  provider_call: false,
  paid_model_call: false,
  repo_content_external_routing: false,
  customer_data_external_routing: false,
  secret_read: false,
  secret_value_print: false,
  install: false,
  commit: false,
  push: false,
  deploy: false,
  cloudflare_r2_mutation: false
};

function ack(target, overrides = {}) {
  return {
    target,
    status: "acknowledged_local_bus_sync",
    execution: {
      cloud_mutation: false,
      deploy: false,
      external_message_send: false,
      git_push: false,
      package_install: false,
      paid_model_calls: false,
      payload_executed: false,
      secret_access: false,
      ...overrides
    }
  };
}

async function createFixture(overrides = {}) {
  const root = await mkdtemp(join(tmpdir(), "active-focus-status-"));
  await writeJson(root, ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P065-TELEGRAM-ERROR-LOOP-READINESS-20260703.json", {
    status: "PASS_TELEGRAM_ERROR_LOOP_READINESS",
    checks: [{ passed: true }],
    guardrails: { ...busGuardrails, ...(overrides.readinessGuardrails || {}) }
  });
  await writeJson(root, ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P064-TELEGRAM-ERROR-LOOP-BUS-ACK-20260703.json", {
    status: "PASS_LOCAL_BUS_ACK_COMPLETE",
    acknowledgements: overrides.acks || [ack("codex"), ack("hermes"), ack("opencode")],
    guardrails: { ...busGuardrails, ...(overrides.busGuardrails || {}) }
  });
  await writeJson(root, ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P069-ACTIVE-FOCUS-REVIEW-READY-20260703.json", {
    status: "PASS_REVIEW_READY",
    checks: [{ passed: true }],
    guardrails: { ...closedGuardrails, ...(overrides.reviewGuardrails || {}) }
  });
  await writeJson(root, ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P070-ACTIVE-FOCUS-NEXT-GATES-20260703.json", {
    status: "PASS_NEXT_GATES_READY",
    checks: [{ passed: true }],
    failures: [],
    guardrails: { ...closedGuardrails, ...(overrides.nextGateGuardrails || {}) },
    gate_options: [
      ["local_commit", "APPROVE_LOCAL_COMMIT_A2A2A_ACTIVE_FOCUS_20260703"],
      ["telegram_live_send", "APPROVE_TELEGRAM_LIVE_SEND_AFTER_REVIEW_READY_20260703"],
      ["provider_call", "APPROVE_PROVIDER_CALL_AFTER_REVIEW_READY_20260703"],
      ["cloudflare_r2_write", "APPROVE_CLOUDFLARE_R2_WRITE_AFTER_REVIEW_READY_20260703"],
      ["push_deploy", "APPROVE_PUSH_OR_DEPLOY_AFTER_LOCAL_COMMIT_20260703"],
      ["install_or_dependency_change", "APPROVE_INSTALL_OR_DEP_CHANGE_AFTER_REVIEW_READY_20260703"]
    ].map(([id, approval_token]) => ({ id, status: "closed_or_ready", approval_token, allowed_commands: [] }))
  });
  await writeJson(root, ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P057-LOCAL-COMMIT-GATE-CHECK-20260703.json", {
    status: "PASS",
    candidate_pathspec_count: 51,
    git_status_line_count: 102,
    failures: []
  });
  await writeJson(root, ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P058-LOCAL-COMMIT-HELPER-DRY-RUN-20260703.json", {
    status: "PASS",
    executed: false,
    failures: []
  });
  await writeJson(root, "reports/mission/A2A2A_LOCAL_COMMIT_GATE_20260703.json", {
    candidate_pathspecs: [
      "scripts/ghostclaw_active_focus_operator_status.mjs",
      "scripts/ghostclaw_active_focus_operator_status.test.mjs",
      "reports/mission/A2A2A_ACTIVE_FOCUS_OPERATOR_STATUS_20260703.md"
    ],
    required_evidence: [
      ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P071-ACTIVE-FOCUS-OPERATOR-STATUS-20260703.json",
      ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P071-ACTIVE-FOCUS-OPERATOR-STATUS-20260703.json"
    ]
  });
  return root;
}

describe("Active focus operator status", () => {
  it("passes with closed guardrails and exact next-gate tokens", async () => {
    const root = await createFixture();
    const packet = await createActiveFocusOperatorStatus({
      root,
      createdAt: "2026-07-03T01:00:00.000Z"
    });

    expect(packet.status).toBe("PASS_OPERATOR_STATUS_READY");
    expect(packet.failures).toEqual([]);
    expect(packet.gate_summary.map((gate) => gate.id)).toContain("provider_call");
    expect(packet.telegram_safe_draft).toContain("no external execution claimed");
    expect(packet.guardrails.live_send).toBe(false);
  });

  it("fails closed when a local bus ack executed a payload", async () => {
    const root = await createFixture({ acks: [ack("codex", { payload_executed: true }), ack("hermes"), ack("opencode")] });
    const packet = await createActiveFocusOperatorStatus({ root });

    expect(packet.status).toBe("FAIL_OPERATOR_STATUS_NOT_READY");
    expect(packet.failures).toContain("p064_local_bus_ack_targets_safe");
  });
});
