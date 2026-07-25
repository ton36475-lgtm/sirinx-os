import { createHash } from "node:crypto";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { createActiveFocusHandoffVerification } from "./ghostclaw_active_focus_handoff_verify.mjs";

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

function hashContent(path, value) {
  const buffer = Buffer.from(value);
  return {
    path,
    bytes: buffer.length,
    sha256: createHash("sha256").update(buffer).digest("hex")
  };
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
  const root = await mkdtemp(join(tmpdir(), "active-focus-handoff-verify-"));
  const fileHashes = [];
  for (const lane of ["codex", "hermes", "opencode"]) {
    const jsonPath = handoffPath(lane, "json");
    const markdownPath = handoffPath(lane, "md");
    const jsonPayload = {
      status: "ready_local_handoff_no_execution",
      target_lane: lane,
      guardrails: { ...guardrails, ...(overrides.laneGuardrails || {}) }
    };
    const jsonContent = `${JSON.stringify(jsonPayload, null, 2)}\n`;
    const markdownContent = `# ${lane}\nlocal handoff only\n`;
    await writeText(root, jsonPath, jsonContent);
    await writeText(root, markdownPath, markdownContent);
    fileHashes.push(hashContent(jsonPath, jsonContent));
    fileHashes.push(hashContent(markdownPath, markdownContent));
  }
  const index = {
    status: "PASS_HANDOFF_INDEX_READY",
    checks: [{ passed: true }],
    file_hashes: fileHashes,
    guardrails
  };
  await writeJson(root, ".ghostclaw_runtime/a2a2a/outbox/A2A2A-P073-ACTIVE-FOCUS-HANDOFF-INDEX-20260703.json", index);
  await writeJson(root, ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P073-ACTIVE-FOCUS-HANDOFF-INDEX-20260703.json", index);
  await writeJson(root, "reports/mission/A2A2A_LOCAL_COMMIT_GATE_20260703.json", {
    candidate_pathspecs: [
      "scripts/ghostclaw_active_focus_handoff_verify.mjs",
      "scripts/ghostclaw_active_focus_handoff_verify.test.mjs",
      "reports/mission/A2A2A_ACTIVE_FOCUS_HANDOFF_VERIFY_20260703.md"
    ],
    required_evidence: [
      ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P074-ACTIVE-FOCUS-HANDOFF-VERIFY-20260703.json",
      ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P074-ACTIVE-FOCUS-HANDOFF-VERIFY-20260703.json"
    ]
  });
  if (overrides.driftPath) {
    await writeText(root, overrides.driftPath, "tampered local handoff\n");
  }
  return root;
}

describe("Active focus handoff verification", () => {
  it("passes when all indexed handoff hashes still match", async () => {
    const root = await createFixture();
    const packet = await createActiveFocusHandoffVerification({
      root,
      createdAt: "2026-07-03T01:30:00.000Z"
    });

    expect(packet.status).toBe("PASS_HANDOFF_VERIFY_READY");
    expect(packet.hash_results).toHaveLength(6);
    expect(packet.hash_results.every((result) => result.matched)).toBe(true);
    expect(packet.guardrails.payload_executed).toBe(false);
  });

  it("fails closed when a handoff file drifts after indexing", async () => {
    const driftPath = handoffPath("codex", "md");
    const root = await createFixture({ driftPath });
    const packet = await createActiveFocusHandoffVerification({ root });

    expect(packet.status).toBe("FAIL_HANDOFF_VERIFY_NOT_READY");
    expect(packet.failures).toContain("handoff_hashes_match_index");
    expect(packet.hash_results.find((result) => result.path === driftPath)?.matched).toBe(false);
  });

  it("fails closed if a lane payload opens provider calls", async () => {
    const root = await createFixture({ laneGuardrails: { provider_call: true } });
    const packet = await createActiveFocusHandoffVerification({ root });

    expect(packet.status).toBe("FAIL_HANDOFF_VERIFY_NOT_READY");
    expect(packet.failures).toContain("lane_payloads_still_local_no_execution");
  });
});
