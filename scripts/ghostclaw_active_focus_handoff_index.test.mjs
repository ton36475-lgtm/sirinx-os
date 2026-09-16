import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { createActiveFocusHandoffIndex } from "./ghostclaw_active_focus_handoff_index.mjs";

async function writeJson(root, relativePath, payload) {
  const path = join(root, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function writeText(root, relativePath, value) {
  const path = join(root, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, value, "utf8");
}

const guardrails = {
  live_send: false,
  provider_call: false,
  external_message_send: false,
  payload_executed: false,
  commit: false,
  push: false,
  deploy: false,
  cloudflare_r2_mutation: false,
  secret_read: false,
  install: false
};

function handoffPath(lane, ext) {
  return `.ghostclaw_runtime/a2a2a/outbox/${lane}/A2A2A-P072-ACTIVE-FOCUS-HANDOFF-BUNDLE-20260703.${ext}`;
}

async function createFixture(overrides = {}) {
  const root = await mkdtemp(join(tmpdir(), "active-focus-handoff-index-"));
  const lanes = ["codex", "hermes", "opencode"];
  const handoffs = lanes.map((lane) => ({
    lane,
    paths: {
      json: handoffPath(lane, "json"),
      markdown: handoffPath(lane, "md")
    }
  }));

  for (const lane of lanes) {
    await writeJson(root, handoffPath(lane, "json"), {
      status: "ready_local_handoff_no_execution",
      target_lane: lane,
      guardrails: { ...guardrails, ...(overrides.laneGuardrails || {}) }
    });
    await writeText(root, handoffPath(lane, "md"), `# ${lane}\nlocal handoff only\n`);
  }
  await writeJson(root, ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P072-ACTIVE-FOCUS-HANDOFF-BUNDLE-20260703.json", {
    status: "PASS_HANDOFF_BUNDLE_READY",
    checks: [{ passed: true }],
    handoffs,
    guardrails: { ...guardrails, ...(overrides.bundleGuardrails || {}) }
  });
  await writeJson(root, "reports/mission/A2A2A_LOCAL_COMMIT_GATE_20260703.json", {
    candidate_pathspecs: [
      "scripts/ghostclaw_active_focus_handoff_index.mjs",
      "scripts/ghostclaw_active_focus_handoff_index.test.mjs",
      "reports/mission/A2A2A_ACTIVE_FOCUS_HANDOFF_INDEX_20260703.md"
    ],
    required_evidence: [
      ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P073-ACTIVE-FOCUS-HANDOFF-INDEX-20260703.json",
      ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P073-ACTIVE-FOCUS-HANDOFF-INDEX-20260703.json"
    ]
  });
  return root;
}

describe("Active focus handoff index", () => {
  it("passes and hashes all lane handoff files", async () => {
    const root = await createFixture();
    const packet = await createActiveFocusHandoffIndex({
      root,
      createdAt: "2026-07-03T01:20:00.000Z"
    });

    expect(packet.status).toBe("PASS_HANDOFF_INDEX_READY");
    expect(packet.file_hashes).toHaveLength(6);
    expect(packet.file_hashes.every((file) => file.sha256.length === 64)).toBe(true);
    expect(packet.guardrails.payload_executed).toBe(false);
  });

  it("fails closed if a lane handoff payload opened provider calls", async () => {
    const root = await createFixture({ laneGuardrails: { provider_call: true } });
    const packet = await createActiveFocusHandoffIndex({ root });

    expect(packet.status).toBe("FAIL_HANDOFF_INDEX_NOT_READY");
    expect(packet.failures).toContain("lane_payloads_ready_no_execution");
  });
});
