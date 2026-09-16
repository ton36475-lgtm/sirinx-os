#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { delimiter, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { getCloudflareDeployStatus } from "../services/dev-control-api/src/cloudflare-deploy-approval.mjs";
import {
  R3_REQUIRED_OFFLINE_CHECK_SPECS,
  R3_REQUIRED_SOURCE_HASH_PATHS
} from "../services/dev-control-api/src/cloudflare-deployment-readiness.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TARGET_ROOT = resolve(REPO_ROOT, "services/orchestrator");
const DEFAULT_OUTPUT = ".ghostclaw_runtime/a2a2a/evidence/cloudflare-r3-readiness.json";
export const HASH_PATHS = [
  ...R3_REQUIRED_SOURCE_HASH_PATHS
];

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function findExecutable(name) {
  for (const entry of (process.env.PATH || "").split(delimiter)) {
    if (entry && existsSync(resolve(entry, name))) return true;
  }
  return false;
}

function runCommand(spec) {
  const command = spec.executable === "node-runtime" ? process.execPath : spec.executable;
  const args = [...spec.args];
  const result = spawnSync(command, args, {
    cwd: resolve(REPO_ROOT, spec.cwd),
    encoding: "utf8",
    env: { ...process.env, CARGO_NET_OFFLINE: "true" },
    timeout: 120_000
  });
  const combined = `${result.stdout || ""}${result.stderr || ""}`;
  return {
    id: spec.id,
    executable: spec.executable,
    args,
    cwd: spec.cwd,
    command: [command, ...args].join(" "),
    exitCode: result.status ?? 1,
    passed: result.status === 0,
    outputDigestSha256: digest(combined),
    spawnError: result.error ? result.error.code || result.error.message : null
  };
}

function readJsonResult(check) {
  const result = spawnSync(process.execPath, [
    "scripts/verify-deploy-contract.mjs",
    "--stage",
    check,
    "--config",
    "wrangler.preview.jsonc"
  ], {
    cwd: TARGET_ROOT,
    encoding: "utf8",
    timeout: 30_000
  });
  const raw = `${result.stdout || ""}${result.stderr || ""}`.trim();
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = { status: "INVALID_OUTPUT", errors: ["deploy contract verifier did not emit JSON"] };
  }
  return {
    stage: check,
    exitCode: result.status ?? 1,
    status: payload.status,
    errors: Array.isArray(payload.errors) ? payload.errors : [],
    outputDigestSha256: digest(raw)
  };
}

async function sourceHashes() {
  const entries = [];
  for (const filePath of HASH_PATHS) {
    const contents = await readFile(resolve(REPO_ROOT, filePath));
    entries.push({ path: filePath, sha256: digest(contents) });
  }
  return entries;
}

async function writeJsonAtomic(filePath, value) {
  const absolutePath = resolve(REPO_ROOT, filePath);
  const temporaryPath = `${absolutePath}.${process.pid}.tmp`;
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temporaryPath, absolutePath);
  return relative(REPO_ROOT, absolutePath);
}

export async function createCloudflareR3Receipt(options = {}) {
  const now = options.now || (() => new Date());
  const status = await getCloudflareDeployStatus({ repoRoot: REPO_ROOT, now });
  const checks = R3_REQUIRED_OFFLINE_CHECK_SPECS.map((spec) => runCommand(spec));
  const preflight = readJsonResult("preflight");
  const artifact = readJsonResult("artifact");
  const tools = {
    localWrangler: existsSync(resolve(TARGET_ROOT, "node_modules/.bin/wrangler")),
    workerBuild: findExecutable("worker-build")
  };
  const offlineChecksPassed = checks.every((check) => check.passed);
  const r3Verified = status.inventoryValidation.ok === true && offlineChecksPassed;
  const r4PreviewReady =
    status.previewDeployReady === true &&
    preflight.exitCode === 0 &&
    artifact.exitCode === 0 &&
    tools.localWrangler &&
    tools.workerBuild;
  const r4Blockers = [
    ...status.blockers,
    ...preflight.errors,
    ...artifact.errors,
    ...(!tools.localWrangler ? ["Local Wrangler dependency is not installed."] : []),
    ...(!tools.workerBuild ? ["worker-build executable is not installed."] : [])
  ].filter((value, index, values) => values.indexOf(value) === index);
  const generatedAt = (typeof now === "function" ? now() : now).toISOString();
  const receipt = {
    schema: "ghostclaw.cloudflare.r3_readiness_receipt.v1",
    receiptId: `cloudflare-r3-${digest(`${generatedAt}:${status.targetId}`).slice(0, 16)}`,
    generatedAt,
    targetId: status.targetId,
    status: r3Verified
      ? r4PreviewReady
        ? "R3_VERIFIED_R4_GATE_REQUIRED"
        : "R3_VERIFIED_R4_BLOCKED"
      : "R3_VALIDATION_FAILED",
    r3Verified,
    r4PreviewReady,
    inventory: status,
    offlineChecks: checks,
    deployContract: { preflight, artifact },
    tooling: tools,
    sourceHashes: await sourceHashes(),
    r4Blockers,
    exactPreviewGatePattern: status.exactPreviewGatePattern,
    networkIsolationEnforced: false,
    evidenceScope: "Selected local commands ran with offline flags; no OS-level network sandbox was enforced.",
    externalActions: {
      network: false,
      cloudflareApiCalled: false,
      wranglerInvoked: false,
      credentialRead: false,
      install: false,
      deploy: false,
      push: false
    },
    noExternalSideEffects: true
  };
  receipt.receiptDigestSha256 = digest(JSON.stringify(receipt));
  return receipt;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const receipt = await createCloudflareR3Receipt();
  let outputPath = null;
  if (process.argv.includes("--store")) {
    outputPath = await writeJsonAtomic(option("--output", DEFAULT_OUTPUT), receipt);
  }
  process.stdout.write(`${JSON.stringify({ ...receipt, outputPath }, null, 2)}\n`);
  if (!receipt.r3Verified) process.exitCode = 1;
}
