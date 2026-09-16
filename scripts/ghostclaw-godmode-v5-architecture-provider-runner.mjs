#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildGodmodeV5ArchitectureProviderPlan,
  runGodmodeV5ArchitectureProvider
} from "../services/dev-control-api/src/godmode-v5-architecture-provider-runner.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PENDING_ROOT = path.resolve(
  REPO_ROOT,
  ".ghostclaw_runtime/a2a2a/provider-approvals/pending"
);
const CONSUMED_ROOT = path.resolve(
  REPO_ROOT,
  ".ghostclaw_runtime/a2a2a/provider-approvals/consumed"
);
const SAFE_STORE_HELPER = path.join(REPO_ROOT, "scripts/ghostclaw-cloudflare-r4-safe-store.py");
const executionState = {
  approvalSigningKeyBindingUsed: false,
  secretRead: false,
  providerCliInvocationAttempted: false,
  providerCliProcessStarted: false,
  runtimeEvidenceMutation: false
};

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`Missing value for ${name}`);
  return value;
}

function flag(name) {
  return process.argv.includes(name);
}

function signingKey() {
  return String(
    process.env.ProviderApprovalSigningKey
      || process.env.PROVIDER_APPROVAL_SIGNING_KEY
      || ""
  );
}

function safeEnvironment() {
  const names = [
    "PATH", "HOME", "TMPDIR", "SHELL", "USER", "LOGNAME", "LANG", "LC_ALL",
    "TERM", "NO_COLOR", "CI", "DISABLE_AUTOUPDATER"
  ];
  return Object.fromEntries(
    names
      .filter((name) => typeof process.env[name] === "string")
      .map((name) => [name, process.env[name]])
  );
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function runClaude(plan) {
  const currentDigest = sha256(await readFile(plan.executablePath));
  if (currentDigest !== plan.executableDigestSha256) {
    throw new Error("claude_executable_changed_after_plan");
  }
  executionState.providerCliInvocationAttempted = true;
  const child = spawnSync(plan.executablePath, plan.args, {
    cwd: REPO_ROOT,
    env: safeEnvironment(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 300_000,
    maxBuffer: 4 * 1024 * 1024,
    shell: false
  });
  executionState.providerCliProcessStarted = Number.isInteger(child.pid) && child.pid > 0;
  return {
    exitCode: child.status ?? 1,
    stdout: child.stdout || "",
    stderr: child.stderr || "",
    spawnErrorCode: child.error?.code || null,
    processStarted: executionState.providerCliProcessStarted
  };
}

function storeRuntimeJson(relativeRoot, filename, value) {
  const result = spawnSync(
    "/usr/bin/python3",
    [
      SAFE_STORE_HELPER,
      "--repo-root", REPO_ROOT,
      "--relative-root", relativeRoot,
      "--filename", filename
    ],
    {
      cwd: REPO_ROOT,
      encoding: "utf8",
      env: { PATH: "/usr/bin:/bin" },
      input: `${JSON.stringify(value, null, 2)}\n`,
      timeout: 10_000
    }
  );
  if (result.status !== 0) throw new Error("architecture_provider_safe_store_failed");
  executionState.runtimeEvidenceMutation = true;
  return path.join(relativeRoot, filename);
}

function publicPlan(plan, options = {}) {
  const runtimeEvidenceMutation = options.store === true;
  return {
    schema: plan.schema,
    status: "dry-run-ready",
    requestId: plan.target.RequestId,
    target: plan.target,
    targetDigestSha256: plan.targetDigestSha256,
    requiredExactGate: plan.requiredExactGate,
    executablePath: plan.executablePath,
    executableDigestSha256: plan.executableDigestSha256,
    promptDigestSha256: plan.promptDigestSha256,
    outputPath: plan.outputPath,
    commandPreview: [
      plan.executablePath,
      ...plan.args.slice(0, -1),
      `<prompt:${plan.promptDigestSha256}>`
    ],
    providerCalled: false,
    providerAttemptCount: 0,
    approvalSigningKeyBindingUsed: false,
    secretRead: false,
    secretValuePrinted: false,
    keyValuePrinted: false,
    runtimeEvidenceMutation,
    sourceMutation: false,
    repoMutation: false,
    deploy: false,
    push: false
  };
}

async function main() {
  const execute = flag("--execute");
  const store = flag("--store");
  const plan = await buildGodmodeV5ArchitectureProviderPlan({ repoRoot: REPO_ROOT });
  if (!execute) {
    const result = publicPlan(plan, { store });
    if (store) {
      const planRoot = path.dirname(plan.outputPath);
      const planEvidenceDigest = sha256(JSON.stringify(result));
      const planFilename = [
        plan.target.RequestId,
        plan.targetDigestSha256.slice(0, 12),
        planEvidenceDigest.slice(0, 12),
        "plan.json"
      ].join(".");
      result.planReceiptPath = storeRuntimeJson(planRoot, planFilename, result);
    }
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  if (!store) throw new Error("--execute requires --store");
  const receiptId = option("--receipt-id");
  if (!receiptId || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(receiptId)) {
    throw new Error("valid --receipt-id is required");
  }
  const key = signingKey();
  executionState.secretRead = key.length > 0;
  if (Buffer.byteLength(key, "utf8") < 32) {
    throw new Error("provider_approval_signing_key_missing");
  }
  executionState.approvalSigningKeyBindingUsed = true;
  const resultRoot = path.dirname(plan.outputPath);
  const resultFilename = path.basename(plan.outputPath);
  const lockFilename = `${plan.target.RequestId}.execution-lock.json`;
  storeRuntimeJson(resultRoot, lockFilename, {
    schema: "ghostclaw.godmode-v5.architecture-provider-execution-lock.v1",
    requestId: plan.target.RequestId,
    targetDigestSha256: plan.targetDigestSha256,
    createdAt: new Date().toISOString(),
    sourceMutation: false,
    runtimeEvidenceMutation: true
  });
  const result = await runGodmodeV5ArchitectureProvider({
    plan,
    repoRoot: REPO_ROOT,
    execute: true,
    runClaude: () => runClaude(plan),
    approvalReceiptPath: path.join(PENDING_ROOT, `${receiptId}.json`),
    approvalReceiptRoot: PENDING_ROOT,
    consumedReceiptRoot: CONSUMED_ROOT,
    expectedReceiptId: receiptId,
    receiptSigningKey: key,
    runtimeEvidenceMutation: true
  });
  const receiptPath = storeRuntimeJson(resultRoot, resultFilename, result);
  process.stdout.write(`${JSON.stringify({
      status: result.status,
      requestId: result.requestId,
      receiptPath,
      approvalReceiptId: result.approvalReceiptId || receiptId,
      approvalReceiptConsumed: result.approvalReceiptConsumed === true,
      providerCalled: result.providerCalled,
      providerAttemptCount: result.providerAttemptCount,
      providerCliInvocationAttempted: result.providerCliInvocationAttempted === true,
      providerCliProcessStarted: result.providerCliProcessStarted === true,
      providerCliSessionCount: result.providerCliSessionCount,
      approvalSigningKeyBindingUsed: true,
      providerCredentialValueObservedByWrapper: false,
      secretRead: true,
      secretValuePrinted: false,
      keyValuePrinted: false,
      childOutputIncludedInConsole: false,
      runtimeEvidenceMutation: true,
      sourceMutation: false,
      repoMutation: false,
      deploy: false,
      push: false
  }, null, 2)}\n`);
  if (result.status !== "provider-result-ready-for-review") process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({
    status: "blocked-architecture-provider-runner",
    error: error.message,
    providerCalled: executionState.providerCliProcessStarted ? null : false,
    providerCliInvocationAttempted: executionState.providerCliInvocationAttempted,
    providerCliProcessStarted: executionState.providerCliProcessStarted,
    approvalSigningKeyBindingUsed: executionState.approvalSigningKeyBindingUsed,
    providerCredentialValueObservedByWrapper: false,
    secretRead: executionState.secretRead,
    secretValuePrinted: false,
    keyValuePrinted: false,
    childOutputIncludedInConsole: false,
    runtimeEvidenceMutation: executionState.runtimeEvidenceMutation,
    sourceMutation: false,
    repoMutation: false,
    deploy: false,
    push: false
  }, null, 2)}\n`);
  process.exitCode = 1;
});
