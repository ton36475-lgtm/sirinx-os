export type ClawForgeDemoValidationResult = {
  ok: boolean;
  status: "validated" | "blocked";
  generatedVideo: false;
  externalCalls: false;
  findings: string[];
  guardrail: string;
};

export const CLAWFORGE_LOCAL_ONLY_GUARDRAIL = Object.freeze({
  requiredMode: "validate-only",
  allowedHosts: ["localhost", "127.0.0.1"],
  forbiddenSceneClasses: [
    "external-upload",
    "public-publish",
    "billing-screen",
    "secrets",
    "private-message",
    "customer-data"
  ],
  videoGenerationAllowed: false,
  uploadAllowed: false,
  externalNetworkAllowed: false
});

export function validateClawForgeDemoSource(source: string): ClawForgeDemoValidationResult {
  const findings: string[] = [];
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
  return {
    ok: findings.length === 0,
    status: findings.length === 0 ? "validated" : "blocked",
    generatedVideo: false,
    externalCalls: false,
    findings,
    guardrail: "validate-only; no ClawForge execution, no MP4 generation, no upload, no external network"
  };
}
