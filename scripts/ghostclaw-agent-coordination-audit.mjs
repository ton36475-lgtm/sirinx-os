#!/usr/bin/env node

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getAgentCoordinationStatus } from "../services/dev-control-api/src/agent-coordination-contract.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultProviderHealth = {
  claude_code_oauth: { status: "unknown" },
  codex_local: { status: "ready" },
  opencode_glm52: { status: "unverified" },
  opencode_fallback: { status: "unverified", model: "opencode/deepseek-v4-flash-free" }
};
const providerHealthPath = path.join(repoRoot, ".ghostclaw_runtime/a2a2a/provider-health.json");
let providerHealth = defaultProviderHealth;
try {
  providerHealth = { ...defaultProviderHealth, ...JSON.parse(await readFile(providerHealthPath, "utf8")) };
} catch {
  // The audit remains fail-closed when no current provider-health receipt exists.
}
const status = await getAgentCoordinationStatus({ repoRoot, providerHealth });

if (process.argv.includes("--store")) {
  const outputPath = path.join(repoRoot, ".ghostclaw_runtime/a2a2a/evidence/agent-coordination-audit-latest.json");
  const tempPath = `${outputPath}.${process.pid}.tmp`;
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(tempPath, `${JSON.stringify(status, null, 2)}\n`, { mode: 0o600 });
  await rename(tempPath, outputPath);
  status.receiptPath = path.relative(repoRoot, outputPath);
}

process.stdout.write(`${JSON.stringify(status, null, 2)}\n`);
if (status.status === "blocked") process.exitCode = 1;
