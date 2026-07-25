import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { createActiveFocusHandoffBundle } from "./ghostclaw_active_focus_handoff_bundle.mjs";

async function writeJson(root, relativePath, payload) {
  const path = join(root, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function statusFixture(overrides = {}) {
  return {
    status: "PASS_OPERATOR_STATUS_READY",
    active_focus: ["sirinx.co", "AGM AutoFlow"],
    paused_out_of_focus: ["Kusala", "Phitsanulok News"],
    checks: [{ passed: true }],
    telegram_safe_draft: "Hermes Operator Status\nlive_send=false",
    usable_commands: ["pnpm active-focus:status"],
    gate_summary: [
      { id: "local_commit", status: "ready", approval_token: "APPROVE_LOCAL_COMMIT_A2A2A_ACTIVE_FOCUS_20260703" },
      { id: "telegram_live_send", status: "closed", approval_token: "APPROVE_TELEGRAM_LIVE_SEND_AFTER_REVIEW_READY_20260703" },
      { id: "provider_call", status: "closed", approval_token: "APPROVE_PROVIDER_CALL_AFTER_REVIEW_READY_20260703" },
      { id: "cloudflare_r2_write", status: "closed", approval_token: "APPROVE_CLOUDFLARE_R2_WRITE_AFTER_REVIEW_READY_20260703" },
      { id: "push_deploy", status: "closed", approval_token: "APPROVE_PUSH_OR_DEPLOY_AFTER_LOCAL_COMMIT_20260703" }
    ],
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
      ...(overrides.guardrails || {})
    },
    next_safe_action: "choose one exact approval token",
    ...overrides
  };
}

async function createFixture(overrides = {}) {
  const root = await mkdtemp(join(tmpdir(), "active-focus-handoff-"));
  await writeJson(
    root,
    ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P071-ACTIVE-FOCUS-OPERATOR-STATUS-20260703.json",
    statusFixture(overrides.status || {})
  );
  await writeJson(root, "reports/mission/A2A2A_LOCAL_COMMIT_GATE_20260703.json", {
    candidate_pathspecs: [
      "scripts/ghostclaw_active_focus_handoff_bundle.mjs",
      "scripts/ghostclaw_active_focus_handoff_bundle.test.mjs",
      "reports/mission/A2A2A_ACTIVE_FOCUS_HANDOFF_BUNDLE_20260703.md"
    ],
    required_evidence: [
      ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P072-ACTIVE-FOCUS-HANDOFF-BUNDLE-20260703.json",
      ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P072-ACTIVE-FOCUS-HANDOFF-BUNDLE-20260703.json"
    ]
  });
  return root;
}

describe("Active focus handoff bundle", () => {
  it("passes and prepares three local lane handoffs without execution", async () => {
    const root = await createFixture();
    const packet = await createActiveFocusHandoffBundle({
      root,
      createdAt: "2026-07-03T01:10:00.000Z"
    });

    expect(packet.status).toBe("PASS_HANDOFF_BUNDLE_READY");
    expect(packet.handoffs.map((handoff) => handoff.lane)).toEqual(["codex", "hermes", "opencode"]);
    expect(packet.handoffs.every((handoff) => handoff.guardrails.payload_executed === false)).toBe(true);
    expect(packet.guardrails.provider_call).toBe(false);
  });

  it("fails closed if P071 opens live-send", async () => {
    const root = await createFixture({ status: { guardrails: { live_send: true } } });
    const packet = await createActiveFocusHandoffBundle({ root });

    expect(packet.status).toBe("FAIL_HANDOFF_BUNDLE_NOT_READY");
    expect(packet.failures).toContain("p071_operator_status_pass");
  });
});
