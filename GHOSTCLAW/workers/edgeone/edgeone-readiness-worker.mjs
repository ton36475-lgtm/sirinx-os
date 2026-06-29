import fs from "fs";
import path from "path";

const RUNTIME_DIR = "/Users/sirinx/sirinx-os/.ghostclaw_runtime/a2a2a";
const RECEIPT_DIR = path.join(RUNTIME_DIR, "receipt");

/**
 * EdgeOne Readiness Worker
 * Level: R3 (Readiness Only)
 *
 * R3 = readiness check only
 * R4 = preview deploy requires deploy packet
 * R5 = production deploy explicit gate only
 *
 * Do NOT deploy now.
 */
export function checkEdgeOneReadiness(projectConfig = {}) {
  if (!fs.existsSync(RECEIPT_DIR)) {
    fs.mkdirSync(RECEIPT_DIR, { recursive: true });
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
    timestamp: new Date().toISOString(),
    rules: {
      R3: "readiness_only",
      R4: "preview_deploy_requires_deploy_packet",
      R5: "production_deploy_explicit_gate_only"
    },
    do_not_deploy: true
  };

  const receiptPath = path.join(RECEIPT_DIR, `edgeone_readiness_${Date.now()}.json`);
  fs.writeFileSync(receiptPath, JSON.stringify(readiness, null, 2));

  return { status: readiness.status, level: "R3", receipt_path: receiptPath, checks };
}

export default checkEdgeOneReadiness;
