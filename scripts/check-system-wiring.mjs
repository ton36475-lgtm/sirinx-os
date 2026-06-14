import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const mapPath = resolve("docs/knowledge/system-wiring/sirinx-vibecoding-system-map.json");
const findings = [];

if (!existsSync(mapPath)) {
  findings.push("system_wiring_map_missing");
}

const wiring = existsSync(mapPath) ? JSON.parse(readFileSync(mapPath, "utf8")) : {};
const packageJson = JSON.parse(readFileSync(resolve("package.json"), "utf8"));
const scripts = packageJson.scripts || {};

if (wiring.mode !== "local-only") {
  findings.push("mode_must_be_local_only");
}

for (const blockedAction of [
  "deploy",
  "push",
  "publish",
  "external_connector_activation",
  "real_mcp_execution",
  "paid_api_call",
  "secret_read_or_print"
]) {
  if (!wiring.blockedActions?.includes(blockedAction)) {
    findings.push(`missing_blocked_action:${blockedAction}`);
  }
}

for (const scriptName of wiring.requiredPackageScripts || []) {
  if (!scripts[scriptName]) {
    findings.push(`missing_package_script:${scriptName}`);
  }
}

for (const lane of wiring.lanes || []) {
  if (!lane.id || !lane.label || !lane.status || !lane.approvalGate) {
    findings.push(`lane_missing_required_metadata:${lane.id || "unknown"}`);
  }
  if (!Array.isArray(lane.verification) || lane.verification.length === 0) {
    findings.push(`lane_missing_verification:${lane.id || "unknown"}`);
  }
  for (const lanePath of lane.paths || []) {
    const resolved = lane.pathType === "absolute" ? lanePath : resolve(lanePath);
    if (!existsSync(resolved)) {
      findings.push(`lane_path_missing:${lane.id}:${lanePath}`);
    }
  }
}

const result = {
  ok: findings.length === 0,
  version: wiring.version || null,
  laneCount: Array.isArray(wiring.lanes) ? wiring.lanes.length : 0,
  blockedActionsCount: Array.isArray(wiring.blockedActions) ? wiring.blockedActions.length : 0,
  findings,
  stopPoint: wiring.stopPoint || null,
  guardrail: "local-only system wiring check; no deploy, push, publish, external connector, real MCP, paid API, or secret access"
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.ok) {
  process.exitCode = 1;
}
