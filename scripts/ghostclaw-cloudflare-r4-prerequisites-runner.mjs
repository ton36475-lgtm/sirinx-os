#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { link, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CLOUDFLARE_R4_PREREQUISITE_STEPS,
  buildCloudflareR4PrerequisitePlan,
  executeCloudflareR4PrerequisiteStep
} from "../services/dev-control-api/src/cloudflare-r4-prerequisites-runner.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_PACKET =
  ".ghostclaw_runtime/a2a2a/templates/cloudflare-r4-prerequisites-packet.json";
const DEFAULT_RECEIPT_ROOT =
  ".ghostclaw_runtime/a2a2a/evidence/cloudflare-r4-prerequisites";
const DEFAULT_GRANT_CLAIM_ROOT =
  ".ghostclaw_runtime/a2a2a/evidence/cloudflare-r4-prerequisite-grant-claims";
const SAFE_TASK_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function flag(name) {
  return process.argv.includes(name);
}

function resolveInsideRepo(relativePath) {
  const absolutePath = path.resolve(REPO_ROOT, relativePath);
  if (!absolutePath.startsWith(`${REPO_ROOT}${path.sep}`)) {
    throw new Error(`Path escapes repository root: ${relativePath}`);
  }
  return absolutePath;
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(resolveInsideRepo(relativePath), "utf8"));
}

async function writeJsonAtomic(absolutePath, value) {
  const temporaryPath = `${absolutePath}.${process.pid}.tmp`;
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temporaryPath, absolutePath);
}

async function writeJsonExclusive(absolutePath, value) {
  const temporaryPath = `${absolutePath}.${process.pid}.tmp`;
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  try {
    await link(temporaryPath, absolutePath);
  } finally {
    await unlink(temporaryPath).catch(() => {});
  }
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function claimApprovalGrant(claim) {
  if (!/^[0-9a-f]{64}$/.test(claim.grantDigestSha256 || "")) {
    throw new Error("Approval grant claim digest key is invalid");
  }
  const claimRoot = resolveInsideRepo(DEFAULT_GRANT_CLAIM_ROOT);
  await mkdir(claimRoot, { recursive: true });
  const claimedAt = new Date().toISOString();
  const record = {
    $schema: "ghostclaw.cloudflare.r4_prerequisite_grant_claim.v1",
    ...claim,
    status: "claimed-before-execution",
    claimedAt,
    pid: process.pid
  };
  record.claimDigestSha256 = sha256(JSON.stringify(record));
  const claimPath = path.join(claimRoot, `${claim.grantDigestSha256}.json`);
  try {
    await writeFile(claimPath, `${JSON.stringify(record, null, 2)}\n`, {
      flag: "wx",
      mode: 0o600
    });
  } catch (error) {
    if (error?.code === "EEXIST") {
      throw new Error("Approval grant is already claimed or consumed");
    }
    throw error;
  }
  return {
    claimed: true,
    claimDigestSha256: record.claimDigestSha256
  };
}

function safeEnvironment() {
  const allowed = [
    "PATH",
    "HOME",
    "TMPDIR",
    "SHELL",
    "USER",
    "LOGNAME",
    "LANG",
    "LC_ALL",
    "TERM",
    "NO_COLOR",
    "CI"
  ];
  return Object.fromEntries(
    allowed
      .filter((name) => typeof process.env[name] === "string")
      .map((name) => [name, process.env[name]])
  );
}

async function runCommand(command) {
  if (command.command !== "node-runtime") {
    throw new Error(`Executable is not allowlisted: ${command.command}`);
  }
  const cwd = resolveInsideRepo(command.cwd);
  const wranglerEntrypoint = path.resolve(cwd, command.args[0]);
  if (!wranglerEntrypoint.startsWith(`${cwd}${path.sep}`)) {
    throw new Error("Wrangler entrypoint escapes the command working directory");
  }
  const [nodeContents, wranglerContents] = await Promise.all([
    readFile(process.execPath),
    readFile(wranglerEntrypoint)
  ]);
  const result = spawnSync(process.execPath, command.args, {
    cwd,
    env: safeEnvironment(),
    encoding: command.interactive ? undefined : "utf8",
    stdio: command.interactive ? "inherit" : ["ignore", "pipe", "pipe"],
    timeout: 300_000,
    shell: false
  });
  return {
    exitCode: result.status ?? 1,
    stdout: command.interactive ? "" : result.stdout || "",
    stderr: command.interactive ? "" : result.stderr || "",
    spawnErrorCode: result.error ? result.error.code || "SPAWN_ERROR" : null,
    executableDigestSha256: sha256(nodeContents),
    wranglerEntrypointDigestSha256: sha256(wranglerContents)
  };
}

async function loadPriorReceipts(packet, stepId) {
  const currentIndex = CLOUDFLARE_R4_PREREQUISITE_STEPS.indexOf(stepId);
  const receiptRoot = resolveInsideRepo(path.join(DEFAULT_RECEIPT_ROOT, packet.taskId));
  const receipts = [];
  for (const priorStep of CLOUDFLARE_R4_PREREQUISITE_STEPS.slice(0, currentIndex)) {
    try {
      receipts.push(
        JSON.parse(await readFile(path.join(receiptRoot, `${priorStep}.json`), "utf8"))
      );
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  return receipts;
}

async function main() {
  const packetPath = option("--packet", DEFAULT_PACKET);
  const stepId = option("--step");
  const execute = flag("--execute");
  const store = flag("--store");
  const approvalGrantPath = option("--grant");
  if (!stepId) throw new Error("--step is required");
  if (execute && !store) throw new Error("--execute requires --store for an audit receipt");
  if (execute && !approvalGrantPath) {
    throw new Error("--execute requires --grant with a packet-bound approval record");
  }

  const packet = await readJson(packetPath);
  if (!SAFE_TASK_ID.test(packet.taskId || "")) {
    throw new Error("Cloudflare R4 prerequisite packet taskId is invalid");
  }
  if (!CLOUDFLARE_R4_PREREQUISITE_STEPS.includes(stepId)) {
    throw new Error(`Unknown Cloudflare R4 prerequisite step: ${stepId}`);
  }
  const priorReceipts = await loadPriorReceipts(packet, stepId);
  const approvalGrant = approvalGrantPath ? await readJson(approvalGrantPath) : null;
  const executionOptions = {
    packet,
    stepId,
    execute,
    approvalGrant,
    claimApprovalGrant: execute ? claimApprovalGrant : undefined,
    priorReceipts,
    runCommand: execute ? runCommand : undefined
  };

  let lockPath = null;
  let receiptPath = null;
  if (execute) {
    const executionPlan = buildCloudflareR4PrerequisitePlan(executionOptions);
    if (executionPlan.blockers.length) {
      throw new Error(executionPlan.blockers.join("; "));
    }
    const receiptRoot = resolveInsideRepo(path.join(DEFAULT_RECEIPT_ROOT, packet.taskId));
    await mkdir(receiptRoot, { recursive: true });
    receiptPath = path.join(receiptRoot, `${stepId}.json`);
    lockPath = `${receiptPath}.lock`;
    await writeFile(
      lockPath,
      `${JSON.stringify({ taskId: packet.taskId, stepId, pid: process.pid })}\n`,
      { flag: "wx", mode: 0o600 }
    );
  }

  let result;
  try {
    if (execute) {
      try {
        await readFile(receiptPath);
        throw new Error(`Step receipt already exists; approval grant is consumed: ${stepId}`);
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
    }
    result = await executeCloudflareR4PrerequisiteStep(executionOptions);
    if (execute) await writeJsonExclusive(receiptPath, result);
  } finally {
    if (lockPath) await unlink(lockPath).catch(() => {});
  }

  if (store && !execute) {
    const receiptRoot = resolveInsideRepo(path.join(DEFAULT_RECEIPT_ROOT, packet.taskId));
    receiptPath = path.join(receiptRoot, `${stepId}.plan.json`);
    await writeJsonAtomic(receiptPath, result);
  }

  process.stdout.write(`${JSON.stringify({
    ...result,
    receiptPath: receiptPath ? path.relative(REPO_ROOT, receiptPath) : null
  }, null, 2)}\n`);
  if (execute && result.status !== "succeeded") process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({
    status: "blocked",
    error: error.message,
    execute: flag("--execute"),
    deploy: false,
    push: false,
    secretValuePrintedByWrapper: false,
    childOutputRedactionGuaranteed: false
  }, null, 2)}\n`);
  process.exitCode = 1;
});
