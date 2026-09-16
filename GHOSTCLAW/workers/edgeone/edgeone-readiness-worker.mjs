import fs from "node:fs";
import path from "node:path";

const RUNTIME_DIR = "/Users/sirinx/sirinx-os/.ghostclaw_runtime/a2a2a";
const RECEIPT_DIR = path.join(RUNTIME_DIR, "receipt");

/**
 * EdgeOne Readiness Worker (Phase 12)
 * Level: R3 (Readiness Only)
 *
 * R3 = readiness check only — produce readiness report and receipt
 * R4 = preview deploy requires deploy packet + separate gate
 * R5 = production deploy requires explicit production gate
 *
 * Blocked:
 *   - Do NOT deploy now
 *   - Do NOT push
 *   - Do NOT mutate cloud resources
 *   - Do NOT call EdgeOne live API
 *   - Do NOT read secrets or tokens
 */
export function checkEdgeOneReadiness(projectConfig = {}) {
  const receiptDir = projectConfig.receipt_dir ?? RECEIPT_DIR;
  if (!fs.existsSync(receiptDir)) {
    fs.mkdirSync(receiptDir, { recursive: true });
  }

  const checks = {
    build_passes: projectConfig.build_passes ?? false,
    tests_pass: projectConfig.tests_pass ?? false,
    no_secrets: projectConfig.no_secrets ?? false,
    no_env_files: projectConfig.no_env_files ?? false,
    edgeone_config_exists: projectConfig.edgeone_config_exists ?? false,
    deploy_packet_ready: projectConfig.deploy_packet_ready ?? false,
    smoke_test_ready: projectConfig.smoke_test_ready ?? false,
    rollback_plan_documented: projectConfig.rollback_plan_documented ?? false
  };

  const allPassed = Object.values(checks).every(v => v === true);

  const readiness = {
    schema: "ghostclaw.edgeone.readiness.v1",
    level: "R3",
    status: allPassed ? "ready" : "not_ready",
    checks,
    timestamp: projectConfig.timestamp ?? new Date().toISOString(),
    rules: {
      R3: "readiness_only",
      R4: "preview_deploy_requires_deploy_packet_and_separate_gate",
      R5: "production_deploy_explicit_gate_only"
    },
    gate: {
      R3_readiness_passed: allPassed,
      R4_preview_gate_approved: false,
      R5_production_gate_approved: false
    },
    safety_flags: {
      do_not_deploy: true,
      do_not_push: true,
      do_not_mutate_cloud: true,
      do_not_call_live_api: true,
      do_not_read_secrets: true
    },
    do_not_deploy: true
  };

  const receiptId = projectConfig.receipt_id ?? Date.now();
  const receiptPath = path.join(receiptDir, `edgeone_readiness_${receiptId}.json`);
  fs.writeFileSync(receiptPath, `${JSON.stringify(readiness, null, 2)}\n`);

  return {
    status: readiness.status,
    level: "R3",
    receipt_path: receiptPath,
    checks,
    gate: readiness.gate,
    safety_flags: readiness.safety_flags
  };
}

export default checkEdgeOneReadiness;
