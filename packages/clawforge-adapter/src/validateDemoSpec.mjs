import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function validateClawForgeDemoSpec({
  yamlPath = "examples/clawforge/sirinx-mission-control-demo.yaml"
} = {}) {
  const resolvedYamlPath = resolve(yamlPath);
  const findings = [];
  if (!existsSync(resolvedYamlPath)) {
    findings.push("clawforge_yaml_missing");
    return buildResult(resolvedYamlPath, findings);
  }

  const source = readFileSync(resolvedYamlPath, "utf8");
  for (const required of [
    "mode: validate-only",
    "localOnly: true",
    "localhost",
    "127.0.0.1",
    "external-upload",
    "public-publish",
    "secrets",
    "private-message",
    "customer-data"
  ]) {
    if (!source.includes(required)) {
      findings.push(`missing_required_yaml_token:${required}`);
    }
  }
  if (/https?:\/\/(?!127\.0\.0\.1|localhost)/.test(source)) {
    findings.push("non_local_url_detected");
  }
  if (!/^mode:\s*validate-only\s*$/m.test(source)) {
    findings.push("mode_must_remain_validate_only");
  }

  return buildResult(resolvedYamlPath, findings);
}

function buildResult(yamlPath, findings) {
  return {
    ok: findings.length === 0,
    status: findings.length === 0 ? "validated" : "blocked",
    yamlPath,
    generatedVideo: false,
    externalCalls: false,
    findings,
    guardrail: "validate-only; no ClawForge execution, no MP4 generation, no upload, no external network"
  };
}
