import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkEdgeOneReadiness } from "./edgeone-readiness-worker.mjs";

function tempReceiptDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ghostclaw-edgeone-"));
}

describe("Phase 12 EdgeOne readiness worker", () => {
  it("defaults to R3 not_ready and never deploys", () => {
    const receiptDir = tempReceiptDir();
    const result = checkEdgeOneReadiness({
      receipt_dir: receiptDir,
      receipt_id: "default",
      timestamp: "2026-06-30T03:10:00.000Z"
    });

    expect(result.status).toBe("not_ready");
    expect(result.level).toBe("R3");
    expect(result.gate).toMatchObject({
      R3_readiness_passed: false,
      R4_preview_gate_approved: false,
      R5_production_gate_approved: false
    });
    expect(result.safety_flags).toMatchObject({
      do_not_deploy: true,
      do_not_push: true,
      do_not_mutate_cloud: true,
      do_not_call_live_api: true,
      do_not_read_secrets: true
    });
  });

  it("can mark R3 ready without opening R4 or R5 gates", () => {
    const receiptDir = tempReceiptDir();
    const result = checkEdgeOneReadiness({
      receipt_dir: receiptDir,
      receipt_id: "ready",
      timestamp: "2026-06-30T03:11:00.000Z",
      build_passes: true,
      tests_pass: true,
      no_secrets: true,
      no_env_files: true,
      edgeone_config_exists: true,
      deploy_packet_ready: true,
      smoke_test_ready: true,
      rollback_plan_documented: true
    });

    expect(result.status).toBe("ready");
    expect(result.gate).toEqual({
      R3_readiness_passed: true,
      R4_preview_gate_approved: false,
      R5_production_gate_approved: false
    });

    const receipt = JSON.parse(readFileSync(result.receipt_path, "utf8"));
    expect(receipt.do_not_deploy).toBe(true);
    expect(receipt.rules).toMatchObject({
      R3: "readiness_only",
      R4: "preview_deploy_requires_deploy_packet_and_separate_gate",
      R5: "production_deploy_explicit_gate_only"
    });
  });

  it("keeps deploy and smoke templates readiness-only", () => {
    const deployPacket = JSON.parse(readFileSync(
      new URL("../../../.ghostclaw_runtime/a2a2a/templates/edgeone-deploy-packet.json", import.meta.url),
      "utf8"
    ));
    const smokeReceipt = JSON.parse(readFileSync(
      new URL("../../../.ghostclaw_runtime/a2a2a/templates/edgeone-smoke-test-receipt.json", import.meta.url),
      "utf8"
    ));

    expect(deployPacket.schema).toBe("ghostclaw.edgeone.deploy_packet.v1");
    expect(deployPacket.environment).toBe("preview");
    expect(deployPacket.approval_tier).toBe("C");
    expect(deployPacket.gate).toMatchObject({
      R3_readiness_passed: false,
      R4_preview_gate_approved: false,
      R5_production_gate_approved: false
    });
    expect(deployPacket.safety_flags.do_not_deploy).toBe(true);
    expect(deployPacket.safety_flags.do_not_call_live_api).toBe(true);
    expect(smokeReceipt.schema).toBe("ghostclaw.edgeone.smoke_test_receipt.v1");
    expect(smokeReceipt.passed).toBe(false);
    expect(smokeReceipt.safety_flags.do_not_deploy).toBe(true);
  });

  it("documents Phase 12 R3/R4/R5 gates and hard stops", () => {
    const strategyText = readFileSync(
      new URL("../../../docs/knowledge/EDGEONE_MAKERS_DEPLOYMENT_STRATEGY.md", import.meta.url),
      "utf8"
    );
    const checklistText = readFileSync(
      new URL("../../../docs/knowledge/EDGEONE_AGENT_RUNTIME_CHECKLIST.md", import.meta.url),
      "utf8"
    );
    const skillText = readFileSync(
      new URL("../../../skills/ghostclaw-agent-ghostclaws-thai-jarvis/SKILL.md", import.meta.url),
      "utf8"
    );

    for (const marker of [
      "R3",
      "R4",
      "R5",
      "Do NOT call EdgeOne live API",
      "Do NOT mutate cloud resources",
      "Do NOT deploy now",
      "separate gate",
      "Explicit production gate"
    ]) {
      expect(`${strategyText}\n${checklistText}\n${skillText}`).toContain(marker);
    }
    expect(skillText).toContain('phase_coverage: "1-12"');
  });
});
