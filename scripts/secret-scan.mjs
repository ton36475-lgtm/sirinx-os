import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const skippedDirectories = new Set([
  ".git",
  ".next",
  ".turbo",
  ".vite",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results"
]);

const roots = [
  ".hermes",
  "docs/00-project-brief.md",
  "docs/01-requirements.md",
  "docs/02-design-direction.md",
  "docs/03-technical-spec.md",
  "docs/04-implementation-plan.md",
  "docs/05-qa-checklist.md",
  "docs/06-release-report.md",
  "docs/research",
  "docs/approvals",
  "docs/integrations",
  "docs/grid",
  "docs/knowledge/SIRINX_AGENT_REPO_INTAKE_CANDIDATES_2026-05-27.md",
  "docs/knowledge/SIRINX_FULL_LOCAL_OS_IMPLEMENTATION_2026-05-26.md",
  "docs/knowledge/SIRINX_MCP_HERMES_VIDEO_AI_GRID_MERMAID_2026-05-26.md",
  "docs/knowledge/SIRINX_OPENROUTER_QWEN_ADAPTER_V1.md",
  "docs/knowledge/SIRINX_OPENROUTER_FUSION_ROUTER_V1.md",
  "docs/knowledge/SIRINX_HERMES_SPEC_FIRST_SWARM_V1.md",
  "docs/knowledge/SIRINX_HERMES_ADAPTIVE_COMMAND_GATEWAY_V0_2.md",
  "docs/knowledge/SIRINX_HERMES_DESKTOP_SAFE_CONFIG_2026-05-27.md",
  "docs/knowledge/gateway-agent",
  "docs/knowledge/system-wiring",
  "vault/a2a/soc",
  "vault/projects/sirinx-agent-native-os/SIRINXDEV_GRID_MERMAID_MASTER_ARCHITECTURE.md",
  "docs/superpowers/plans",
  "vault/research/x-ai-radar",
  "packages/content-factory",
  "packages/clawforge-adapter",
  "skills/sirinx-x-ai-radar",
  "skills/sirinx-creator-signal-extractor",
  "skills/sirinx-trend-to-content-pipeline",
  "skills/sirinx-clawforge-demo-video",
  "services/dev-control-api/src/agent-launch-gate.mjs",
  "services/dev-control-api/src/agent-launch-gate.test.mjs",
  "services/dev-control-api/src/agent-driver.mjs",
  "services/dev-control-api/src/agent-driver.test.mjs",
  "services/dev-control-api/src/centerbrain-hub.mjs",
  "services/dev-control-api/src/centerbrain-hub.test.mjs",
  "services/dev-control-api/src/hermes-agent-audit.mjs",
  "services/dev-control-api/src/hermes-agent-audit.test.mjs",
  "services/dev-control-api/src/repo-intake-gate.mjs",
  "services/dev-control-api/src/repo-intake-gate.test.mjs",
  "services/dev-control-api/src/openrouter-qwen-adapter.mjs",
  "services/dev-control-api/src/openrouter-qwen-adapter.test.mjs",
  "services/dev-control-api/src/openrouter-fusion-router.mjs",
  "services/dev-control-api/src/openrouter-fusion-router.test.mjs",
  "services/dev-control-api/src/model-routing-approval.mjs",
  "services/dev-control-api/src/model-routing-approval.test.mjs",
  "services/dev-control-api/src/hermes-spec-first-swarm.mjs",
  "services/dev-control-api/src/hermes-spec-first-swarm.test.mjs",
  "services/dev-control-api/src/team-runtime-bridge.mjs",
  "services/dev-control-api/src/team-runtime-bridge.test.mjs",
  "services/hermes-api/src/adaptive-command-gateway.mjs",
  "services/hermes-api/src/adaptive-command-gateway.test.mjs",
  "apps/centerbrain-shell",
  "scripts",
  "examples/clawforge"
];

const secretPatterns = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /sk-[A-Za-z0-9_-]{20,}/,
  /xox[baprs]-[A-Za-z0-9-]{20,}/,
  /postgres(?:ql)?:\/\/[^ \n]+:[^ \n]+@/i,
  /(?<![A-Z0-9_])(api|secret|token|password|service_role)_?(key)?\s*=\s*["']?[^"'\s]{12,}/i
];

const findings = [];
for (const root of roots) {
  const abs = resolve(root);
  for (const file of listFiles(abs)) {
    const source = readFileSync(file, "utf8");
    for (const pattern of secretPatterns) {
      if (pattern.test(source)) {
        findings.push(`secret_like_pattern:${relative(process.cwd(), file)}`);
        break;
      }
    }
  }
}

const result = {
  ok: findings.length === 0,
  scannedRoots: roots,
  findings,
  guardrail: "bounded local secret scan; no secret values printed"
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.ok) {
  process.exitCode = 1;
}

function listFiles(root) {
  const result = [];
  try {
    const stat = statSync(root);
    if (stat.isFile()) {
      return /\.(md|mjs|js|ts|json|yaml|yml)$/.test(root) ? [root] : result;
    }
    if (!stat.isDirectory()) return result;
  } catch {
    return result;
  }
  for (const entry of readdirSync(root)) {
    if (skippedDirectories.has(entry)) {
      continue;
    }

    const file = join(root, entry);
    const stat = statSync(file);
    if (stat.isDirectory()) {
      result.push(...listFiles(file));
    } else if (stat.isFile() && /\.(md|mjs|js|ts|json|yaml|yml)$/.test(file)) {
      result.push(file);
    }
  }
  return result;
}
