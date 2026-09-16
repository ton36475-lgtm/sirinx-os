import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const orgChartSource = readFileSync(new URL("../src/company/org-chart.ts", import.meta.url), "utf8");
const indexSource = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
const governanceSource = readFileSync(new URL("../src/tools/governance-policy.ts", import.meta.url), "utf8");
const workflowSource = readFileSync(new URL("../src/workflows/board-approval.ts", import.meta.url), "utf8");
const runtimeGateSource = readFileSync(new URL("./runtime-gate.mjs", import.meta.url), "utf8");
const envExample = readFileSync(new URL("../.env.example", import.meta.url), "utf8");

const requiredDeps = [
  "@voltagent/core",
  "@voltagent/libsql",
  "@voltagent/logger",
  "@voltagent/server-hono",
  "zod",
];

const missingDeps = requiredDeps.filter((dep) => !packageJson.dependencies?.[dep]);
if (missingDeps.length > 0) {
  throw new Error(`Missing dependencies: ${missingDeps.join(", ")}`);
}

const roleCount = (orgChartSource.match(/id: "/g) ?? []).length;
if (roleCount < 45) {
  throw new Error(`Expected at least 45 enterprise roles, found ${roleCount}`);
}

for (const tier of ["L0_READ", "L1_INTERNAL_WRITE", "L2_PUBLIC", "L3_SENSITIVE"]) {
  if (!orgChartSource.includes(tier)) {
    throw new Error(`Missing approval tier: ${tier}`);
  }
}

for (const required of ["VoltAgent", "honoServer", "createEnterpriseCompanyAgents"]) {
  if (!indexSource.includes(required)) {
    throw new Error(`Missing runtime marker: ${required}`);
  }
}

if (indexSource.includes("file:./.voltagent")) {
  throw new Error("Runtime DB paths must be app-relative, not cwd-relative");
}

for (const blockedVariant of ["deploy", "install", "provider", "secret"]) {
  if (!governanceSource.includes(blockedVariant)) {
    throw new Error(`Missing governance blocked keyword: ${blockedVariant}`);
  }
}

if (!workflowSource.includes("pending_owner_approval") || !workflowSource.includes("ownerApproved: false")) {
  throw new Error("L2/L3 approval workflow must not self-approve after suspend");
}

if (!runtimeGateSource.includes("SIRINX_ENTERPRISE_AI_COMPANY_RUNTIME_APPROVED")) {
  throw new Error("Runtime gate script must require explicit runtime approval");
}

if (envExample.includes("sk-") || envExample.includes("your-api-key-here")) {
  throw new Error("Do not commit API-key-like placeholders in .env.example");
}

console.log(
  JSON.stringify(
    {
      status: "pass",
      packageName: packageJson.name,
      roleCount,
      runtime: "VoltAgent + Hono",
      envExampleSecrets: "blank_or_local_only",
    },
    null,
    2,
  ),
);
