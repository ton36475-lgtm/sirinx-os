import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createActiveFocusOperatorPacket } from "./ghostclaw_active_focus_operator_packet.mjs";

async function writeJson(root, relativePath, payload) {
  const path = join(root, relativePath);
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function createFixture(overrides = {}) {
  const root = await mkdtemp(join(tmpdir(), "active-focus-operator-"));
  await writeJson(root, ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P066-ACTIVE-FOCUS-READINESS-20260703.json", {
    status: "PASS_ACTIVE_FOCUS_READINESS",
    checks: [{ passed: true }],
    guardrails: {
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
      cloudflare_r2_mutation: false,
      ...(overrides.readinessGuardrails || {})
    }
  });
  await writeJson(root, ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P057-LOCAL-COMMIT-GATE-CHECK-20260703.json", {
    status: "PASS",
    candidate_pathspec_count: 39,
    git_status_line_count: 90,
    failures: []
  });
  await writeJson(root, ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P058-LOCAL-COMMIT-HELPER-DRY-RUN-20260703.json", {
    status: "PASS",
    executed: false,
    failures: []
  });
  await writeJson(root, "reports/mission/A2A2A_LOCAL_COMMIT_GATE_20260703.json", {
    candidate_pathspecs: [
      "scripts/ghostclaw_active_focus_operator_packet.mjs",
      "scripts/ghostclaw_active_focus_operator_packet.test.mjs",
      "reports/mission/A2A2A_ACTIVE_FOCUS_OPERATOR_PACKET_20260703.md",
      ...(overrides.candidate_pathspecs || [])
    ]
  });
  return root;
}

describe("Active focus operator packet", () => {
  it("creates a Telegram-safe local handoff packet when readiness and gates pass", async () => {
    const root = await createFixture();
    const packet = await createActiveFocusOperatorPacket({
      root,
      createdAt: "2026-07-03T00:00:00.000Z"
    });

    expect(packet.status).toBe("PASS_OPERATOR_PACKET_READY");
    expect(packet.failures).toEqual([]);
    expect(packet.telegram_safe_draft).toContain("live_send=false");
    expect(packet.telegram_safe_draft).toContain("provider_call=false");
    expect(packet.guardrails.external_message_send).toBe(false);
  });

  it("fails closed if readiness opens a provider-call guardrail", async () => {
    const root = await createFixture({ readinessGuardrails: { provider_call: true } });
    const packet = await createActiveFocusOperatorPacket({ root });

    expect(packet.status).toBe("FAIL_OPERATOR_PACKET_NOT_READY");
    expect(packet.failures).toContain("p066_readiness_not_ready");
  });
});
